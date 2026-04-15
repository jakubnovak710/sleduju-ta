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

const BADGE_CLASS = 'sleduju-ta-badge';

/**
 * Pridá vizuálny badge do inbox riadku — priame DOM vkladanie.
 */
function addBadgeToRow(row: Element, trackerName: string): void {
  const el = row as HTMLElement;
  // Červený ľavý border — vždy viditeľný, nič nemôže skryť
  el.style.borderLeft = '4px solid #d93025';
  el.title = `Sleduje: ${trackerName}`;
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
      addBadgeToRow(row, trackerName);
      marked++;
    }
  }

  if (marked > 0) {
    console.log(`[Sledujú Ťa!] Inbox: ${marked} mailov označených s trackermi`);
  }
}
