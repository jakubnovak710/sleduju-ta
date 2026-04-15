const TRACKED_ATTR = 'data-sleduju-ta-tracked';
const STYLE_ID = 'sleduju-ta-inbox-style';
const STORAGE_KEY = 'knownTrackerSenders';

// Injektujeme CSS raz — používame data atribút + ::after pseudo-element
// Gmail nemôže odstrániť CSS pravidlá ani data atribúty
function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    tr.zA[${TRACKED_ATTR}] td.yX::before {
      content: '';
      display: inline-block;
      width: 18px;
      height: 18px;
      background: #d93025;
      border-radius: 50%;
      vertical-align: middle;
      margin-right: 6px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94'/%3E%3Cpath d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19'/%3E%3Cline x1='1' y1='1' x2='23' y2='23'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 12px;
      flex-shrink: 0;
    }
    tr.zA[${TRACKED_ATTR}] td.yX .yW {
      display: inline-flex !important;
      align-items: center !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Uloží odosielateľa A jeho doménu do zoznamu známych tracker odosielateľov.
 */
export async function rememberTrackerSender(sender: string, tracker: string): Promise<void> {
  if (!sender) return;

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const senders: Record<string, string> = result[STORAGE_KEY] || {};

    let changed = false;

    if (!senders[sender]) {
      senders[sender] = tracker;
      changed = true;
    }

    // Uložíme aj doménu
    const atIdx = sender.indexOf('@');
    if (atIdx > -1) {
      const domainKey = sender.substring(atIdx);
      if (!senders[domainKey]) {
        senders[domainKey] = tracker;
        changed = true;
      }
    }

    if (changed) {
      await chrome.storage.local.set({ [STORAGE_KEY]: senders });
      // Znovu skenujeme inbox
      markInboxRows();
    }
  } catch (e) {
    console.warn('[Sledujú Ťa!] Failed to save sender', e);
  }
}

/**
 * Skenuje riadky v Gmail inbox a pridá badge k mailom od známych tracker odosielateľov.
 * Používa data atribút + CSS ::before — prežije Gmail DOM rerendery.
 */
export async function markInboxRows(): Promise<void> {
  let knownSenders: Record<string, string>;
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    knownSenders = result[STORAGE_KEY] || {};
  } catch {
    return;
  }

  if (Object.keys(knownSenders).length === 0) return;

  ensureStyles();

  const rows = document.querySelectorAll('tr.zA');
  if (rows.length === 0) return;

  for (const row of rows) {
    // Preskočíme ak už má atribút
    if (row.hasAttribute(TRACKED_ATTR)) continue;

    const senderEl = row.querySelector('span.yP, span.zF, span[email]');
    const senderEmail = senderEl?.getAttribute('email') || '';
    if (!senderEmail) continue;

    const domain = '@' + senderEmail.split('@')[1];
    const trackerName = knownSenders[senderEmail] || knownSenders[domain] || null;

    if (trackerName) {
      row.setAttribute(TRACKED_ATTR, trackerName);
    }
  }
}
