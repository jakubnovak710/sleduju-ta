const TRACKED_ATTR = 'data-sleduju-ta-tracked';
const STYLE_ID = 'sleduju-ta-inbox-style';
const STORAGE_KEY = 'knownTrackerSenders';

/**
 * Domény odosielateľov, ktoré VŽDY používajú tracking pixely.
 * Tieto sa označia hneď v inbox BEZ nutnosti otvoriť mail.
 */
const ALWAYS_TRACKING_DOMAINS: Record<string, string> = {
  // Newslettre a marketing platformy
  '@mail.beehiiv.com': 'Beehiiv',
  '@email.mailchimp.com': 'Mailchimp',
  '@mail.mailchimp.com': 'Mailchimp',
  '@news.mailchimp.com': 'Mailchimp',
  '@send.mailchimp.com': 'Mailchimp',
  '@email.convertkit.com': 'ConvertKit',
  '@mail.convertkit.com': 'ConvertKit',
  '@email.hubspot.com': 'HubSpot',
  '@mail.hubspot.com': 'HubSpot',
  '@email.sendinblue.com': 'Brevo',
  '@mail.brevo.com': 'Brevo',
  '@email.klaviyo.com': 'Klaviyo',
  '@email.getresponse.com': 'GetResponse',
  '@email.activecampaign.com': 'ActiveCampaign',
  '@mail.intercom.io': 'Intercom',

  // Veľké služby s trackingom
  '@linkedin.com': 'LinkedIn',
  '@e.linkedin.com': 'LinkedIn',
  '@mail.linkedin.com': 'LinkedIn',
  '@orders.temu.com': 'Temu',
  '@mail.temu.com': 'Temu',

  // E-commerce
  '@email.lidl.sk': 'Lidl',
  '@mail.lidlplus.sk': 'Lidl',
  '@email.amazon.com': 'Amazon',
  '@mail.amazon.com': 'Amazon',
  '@email.aliexpress.com': 'AliExpress',

  // SaaS
  '@email.supabase.com': 'Supabase',
  '@mail.supabase.io': 'Supabase',
  '@email.vercel.com': 'Vercel',
  '@updates.basecamp.com': 'Basecamp',
  '@mail.notion.so': 'Notion',
  '@email.monday.com': 'Monday',

  // Marketing obecne — tieto subdomény takmer vždy trackujú
  '@newsletter.': 'Newsletter',
  '@marketing.': 'Marketing',
  '@news.': 'Newsletter',
  '@promo.': 'Promo',
  '@offers.': 'Marketing',
  '@campaign.': 'Marketing',
  '@updates.': 'Updates',
  '@email.': 'Marketing',
  '@e.': 'Marketing',
  '@noreply.': 'Automated',
  '@notify.': 'Notification',
  '@info.': 'Info',
};

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
/**
 * Skontroluje či email odosielateľa matchuje known tracking doménu.
 * Kontroluje presný match (@orders.temu.com) aj subdoménu prefix (@email.).
 */
function matchTrackingSender(email: string, learnedSenders: Record<string, string>): string | null {
  const atIdx = email.indexOf('@');
  if (atIdx < 0) return null;

  const domain = email.substring(atIdx); // "@orders.temu.com"
  const fullDomain = email.split('@')[1]; // "orders.temu.com"

  // 1. Presný match z learned senders (z otvárania mailov)
  if (learnedSenders[email]) return learnedSenders[email];
  if (learnedSenders[domain]) return learnedSenders[domain];

  // 2. Presný match z hardcoded always-tracking domén
  if (ALWAYS_TRACKING_DOMAINS[domain]) return ALWAYS_TRACKING_DOMAINS[domain];

  // 3. Subdoména prefix match (@email., @newsletter., @marketing., atd.)
  const subdomain = '@' + fullDomain.split('.')[0] + '.'; // "@orders."
  if (ALWAYS_TRACKING_DOMAINS[subdomain]) return ALWAYS_TRACKING_DOMAINS[subdomain];

  // 4. Match na parent doménu (napr. @nieco.linkedin.com → @linkedin.com)
  const parts = fullDomain.split('.');
  if (parts.length > 2) {
    const parentDomain = '@' + parts.slice(-2).join('.'); // "@linkedin.com"
    if (ALWAYS_TRACKING_DOMAINS[parentDomain]) return ALWAYS_TRACKING_DOMAINS[parentDomain];
    if (learnedSenders[parentDomain]) return learnedSenders[parentDomain];
  }

  return null;
}

export async function markInboxRows(): Promise<void> {
  let learnedSenders: Record<string, string> = {};
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    learnedSenders = result[STORAGE_KEY] || {};
  } catch { /* storage error — pokračujeme s hardcoded */ }

  ensureStyles();

  const rows = document.querySelectorAll('tr.zA');
  if (rows.length === 0) return;

  let marked = 0;
  for (const row of rows) {
    if (row.hasAttribute(TRACKED_ATTR)) continue;

    const senderEl = row.querySelector('span.yP, span.zF, span[email]');
    const senderEmail = senderEl?.getAttribute('email') || '';
    if (!senderEmail) continue;

    const trackerName = matchTrackingSender(senderEmail, learnedSenders);

    if (trackerName) {
      row.setAttribute(TRACKED_ATTR, trackerName);
      marked++;
    }
  }

  if (marked > 0) {
    console.log(`[Sledujú Ťa!] Inbox: ${marked} mailov označených s trackermi`);
  }
}
