/**
 * Page-level script — beží v kontexte Gmail stránky (nie content script).
 * Používa gmail.js na prístup k raw HTML emailov BEZ ich otvorenia.
 * Komunikuje s content scriptom cez window.postMessage.
 */
import * as GmailModule from 'gmail-js';
import jQuery from 'jquery';

// gmail-js vyžaduje jQuery na window
(window as any).$ = jQuery;
(window as any).jQuery = jQuery;

// gmail-js exportuje rôzne formáty — zvládneme oba
const GmailClass = (GmailModule as any).default || GmailModule;
const gmail = new GmailClass();
const SCAN_INTERVAL_MS = 3000;
const scannedIds = new Set<string>();

// Import tracker patterns priamo (nemôžeme importovať z content scriptu)
const KNOWN_TRACKER_DOMAINS: Record<string, string> = {
  'list-manage.com': 'Mailchimp', 'mailchimp.com': 'Mailchimp',
  'hubspotemail.net': 'HubSpot', 'track.hubspot.com': 'HubSpot',
  't.sidekickopen.com': 'HubSpot',
  'sendgrid.net': 'SendGrid', 'u.sendgrid.net': 'SendGrid',
  'mailtrack.io': 'Mailtrack', 'e.mailsuite.com': 'Mailsuite',
  'convertkit.com': 'ConvertKit', 'open.convertkit.com': 'ConvertKit',
  'activecampaign.com': 'ActiveCampaign',
  'sendinblue.com': 'Brevo', 'brevo.com': 'Brevo',
  'klaviyo.com': 'Klaviyo', 'customer.io': 'Customer.io',
  'customeriomail.com': 'Customer.io',
  'mailgun.net': 'Mailgun', 'mandrillapp.com': 'Mandrill',
  'sparkpostmail.com': 'SparkPost', 'postmarkapp.com': 'Postmark',
  'createsend.com': 'Campaign Monitor', 'mailerlite.com': 'MailerLite',
  'mlsend.com': 'MailerLite', 'getresponse.com': 'GetResponse',
  'constantcontact.com': 'Constant Contact',
  'pardot.com': 'Pardot', 'marketo.com': 'Marketo',
  'salesforce.com': 'Salesforce', 'exacttarget.com': 'Salesforce',
  'intercom-mail.com': 'Intercom', 'drip.com': 'Drip',
  'omnisend.com': 'Omnisend', 'moosend.com': 'Moosend',
  'mjt.lu': 'Mailjet', 'beehiiv.com': 'Beehiiv',
  'mailsuite.com': 'Mailsuite', 'lemlist.com': 'Lemlist',
  'outreach.io': 'Outreach', 'salesloft.com': 'SalesLoft',
  'yesware.com': 'Yesware', 'mixmax.com': 'Mixmax',
  'streak.com': 'Streak', 'bananatag.com': 'Bananatag',
  'apollo.io': 'Apollo', 'snov.io': 'Snov.io',
};

const TRACKING_URL_PATTERNS: RegExp[] = [
  /\/track(ing)?\/open/i, /\/pixel\b/i, /\/beacon\b/i,
  /\/wf\/open/i, /\/e\/o\//i, /\/email\/open/i, /\/emimp\//i,
  /\/o\/[a-f0-9]{16,}/i, /\/open\/[a-f0-9]{8,}/i,
  /\/t\.gif/i, /\/open\.gif/i, /\/pixel\.gif/i, /\/blank\.gif/i,
  /\/oo\/[A-Za-z0-9+/=]+/i, /\/v1\/o\//i, /\/e3t\/Cto\//i,
  /\/trace\/mail\//i, /\/open\.aspx/i, /\/callback\/.*\/open\/track/i,
  /[?&]e=ue&ue_px=/i,
];

/**
 * Skontroluje raw HTML emailu na prítomnosť tracking pixelov.
 */
function findTrackerInHtml(html: string): string | null {
  // 1. Known domains
  for (const [domain, name] of Object.entries(KNOWN_TRACKER_DOMAINS)) {
    if (html.includes(domain)) return name;
  }

  // 2. URL patterns
  for (const pattern of TRACKING_URL_PATTERNS) {
    if (pattern.test(html)) return 'Tracker';
  }

  // 3. Heuristika — 1x1 obrázky v HTML
  const tinyImgRegex = /<img[^>]*(?:width\s*=\s*["']?[01]["'\s>]|height\s*=\s*["']?[01]["'\s>])[^>]*(?:width\s*=\s*["']?[01]["'\s>]|height\s*=\s*["']?[01]["'\s>])/gi;
  if (tinyImgRegex.test(html)) return 'Tracking pixel';

  // 4. display:none obrázky
  if (/<img[^>]*style\s*=\s*["'][^"']*display\s*:\s*none/i.test(html)) return 'Hidden tracker';

  return null;
}

/**
 * Skenuje email podľa ID a posiela výsledok do content scriptu.
 */
function scanEmail(emailId: string): void {
  if (scannedIds.has(emailId)) return;
  scannedIds.add(emailId);

  try {
    gmail.get.email_data_async(emailId, (emailData: any) => {
      if (!emailData || !emailData.threads) return;

      const threadIds = Object.keys(emailData.threads);
      const lastThread = emailData.threads[threadIds[threadIds.length - 1]];
      if (!lastThread) return;

      const html = lastThread.content_html || '';
      const from = lastThread.from?.address || lastThread.from || '';

      const tracker = findTrackerInHtml(html);

      // Pošleme výsledok do content scriptu
      window.postMessage({
        type: 'sleduju-ta-scan-result',
        emailId,
        tracker,
        from: typeof from === 'string' ? from : '',
      }, '*');
    });
  } catch (e) {
    console.warn('[Sledujú Ťa! page] Failed to scan email', emailId, e);
  }
}

/**
 * Nájde email IDs v inbox DOM a spustí skenovanie.
 */
function scanInboxEmails(): void {
  // Gmail inbox riadky s thread ID
  const rows = document.querySelectorAll('tr.zA');
  for (const row of rows) {
    // Skúsime nájsť thread ID
    const threadId = row.getAttribute('data-legacy-thread-id')
      || row.querySelector('[data-thread-id]')?.getAttribute('data-thread-id')
      || '';

    if (threadId && !scannedIds.has(threadId)) {
      scanEmail(threadId);
    }
  }
}

/**
 * Skenuje aktuálne otvorený email.
 */
function scanOpenEmail(): void {
  try {
    const emailId = gmail.get.email_id();
    if (emailId && !scannedIds.has(emailId)) {
      scanEmail(emailId);
    }
  } catch { /* nie sme v email view */ }
}

/**
 * Hlavný pozorovací loop.
 */
function observe(): void {
  try {
    if (gmail.check.is_inside_email()) {
      scanOpenEmail();
    }
    scanInboxEmails();
  } catch (e) {
    // gmail.js môže zlyhať ak DOM nie je ready
  }

  setTimeout(observe, SCAN_INTERVAL_MS);
}

// Štart
gmail.observe.on('load', () => {
  console.log('[Sledujú Ťa! page] gmail.js loaded, starting scanner');
  window.postMessage({ type: 'sleduju-ta-ready' }, '*');
  observe();
});
