const SCANNED_ATTR = 'data-sledujata-inbox-scanned';
const BADGE_CLASS = 'sledujata-inbox-badge';
const STORAGE_KEY = 'knownTrackerSenders';

/**
 * Uloží odosielateľa A jeho doménu do zoznamu známych tracker odosielateľov.
 * Po otvorení jedného mailu od @lidl.sk sa označia VŠETKY maily od @lidl.sk.
 */
export async function rememberTrackerSender(sender: string, tracker: string): Promise<void> {
  if (!sender) return;

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const senders: Record<string, string> = result[STORAGE_KEY] || {};

  let changed = false;

  // Uložíme celý email
  if (!senders[sender]) {
    senders[sender] = tracker;
    changed = true;
  }

  // Uložíme aj doménu (napr. "@lidl.sk" -> "Lidl")
  const atIdx = sender.indexOf('@');
  if (atIdx > -1) {
    const domainKey = sender.substring(atIdx); // "@lidl.sk"
    if (!senders[domainKey]) {
      senders[domainKey] = tracker;
      changed = true;
    }
  }

  if (changed) {
    await chrome.storage.local.set({ [STORAGE_KEY]: senders });
    // Po uložení znovu skenujeme inbox aby sa nové badge hneď zobrazili
    clearScannedFlags();
    markInboxRows();
  }
}

/**
 * Vyčistí scanned flagy aby sa inbox znova preskenoval.
 */
function clearScannedFlags(): void {
  const scanned = document.querySelectorAll(`[${SCANNED_ATTR}]`);
  for (const el of scanned) {
    el.removeAttribute(SCANNED_ATTR);
    el.querySelector(`.${BADGE_CLASS}`)?.remove();
  }
}

/**
 * Skenuje riadky v Gmail inbox a pridá badge k mailom od známych tracker odosielateľov.
 */
export async function markInboxRows(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const knownSenders: Record<string, string> = result[STORAGE_KEY] || {};

  if (Object.keys(knownSenders).length === 0) return;

  const rows = document.querySelectorAll('tr.zA');
  if (rows.length === 0) return;

  for (const row of rows) {
    if (row.hasAttribute(SCANNED_ATTR)) continue;
    row.setAttribute(SCANNED_ATTR, 'true');

    // Nájdeme email odosielateľa
    const senderEl = row.querySelector('span.yP, span.zF, span[email]');
    const senderEmail = senderEl?.getAttribute('email') || '';

    if (!senderEmail) continue;

    // Kontrola: presný email ALEBO doména
    const domain = '@' + senderEmail.split('@')[1];
    const trackerName = knownSenders[senderEmail] || knownSenders[domain] || null;

    if (trackerName) {
      addInboxBadge(row as HTMLElement, trackerName);
    }
  }
}

/**
 * Pridá výrazný badge VĽAVO od odosielateľa.
 */
function addInboxBadge(row: HTMLElement, trackerName: string): void {
  if (row.querySelector(`.${BADGE_CLASS}`)) return;

  const badge = document.createElement('span');
  badge.className = BADGE_CLASS;
  badge.title = `Sleduje: ${trackerName}`;

  // Červený krúžok s EyeOff ikonou
  badge.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
    <path d="m2 2 20 20"/>
  </svg>`;

  Object.assign(badge.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    backgroundColor: '#d93025',
    borderRadius: '50%',
    marginRight: '6px',
    cursor: 'help',
    verticalAlign: 'middle',
    flexShrink: '0',
  });

  // Vložíme VĽAVO — pred meno odosielateľa
  // Gmail štruktúra: td.yX.xY > div.yW > span (meno odosielateľa)
  const senderCell = row.querySelector('td.yX') || row.querySelector('td:nth-child(3)');
  if (senderCell) {
    const firstChild = senderCell.firstElementChild || senderCell.firstChild;
    if (firstChild) {
      senderCell.insertBefore(badge, firstChild);
      return;
    }
  }

  // Fallback: pred prvú bunku s obsahom
  const cells = row.querySelectorAll('td');
  for (const cell of cells) {
    if (cell.textContent && cell.textContent.trim().length > 0) {
      cell.insertBefore(badge, cell.firstChild);
      return;
    }
  }
}
