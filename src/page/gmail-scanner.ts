/**
 * Page-level script — beží v kontexte Gmail stránky (nie content script).
 * Používa gmail.js na prístup k raw HTML emailov BEZ ich otvorenia.
 * Komunikuje s content scriptom cez window.postMessage.
 */

// gmail-js vyžaduje jQuery — Gmail stránka ho nemá, ale my ho nabundlujeme
import jQuery from 'jquery';
(window as any).$ = jQuery;
(window as any).jQuery = jQuery;

// Manuálne načítame Gmail konštruktor cez CJS wrapper
// @ts-ignore
const gmailModule: any = {};
// @ts-ignore
const gmailExports: any = { Gmail: null };

// Dynamický require — funguje v IIFE bundli
try {
  const mod = require('gmail-js');
  gmailExports.Gmail = mod.Gmail || mod.default?.Gmail || mod;
} catch {
  // Fallback: pokúsime sa nájsť Gmail na window (ak bol načítaný inak)
  gmailExports.Gmail = (window as any).Gmail;
}

if (!gmailExports.Gmail || typeof gmailExports.Gmail !== 'function') {
  console.error('[Sledujú Ťa! page] Gmail constructor not found, aborting scanner');
} else {
  const gmail = new gmailExports.Gmail(jQuery);
  startScanner(gmail);
}

function startScanner(gmail: any): void {
  const SCAN_INTERVAL_MS = 3000;
  const scannedIds = new Set<string>();

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
    'linkedin.com': 'LinkedIn',
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

  function findTrackerInHtml(html: string): string | null {
    for (const [domain, name] of Object.entries(KNOWN_TRACKER_DOMAINS)) {
      if (html.includes(domain)) return name;
    }
    for (const pattern of TRACKING_URL_PATTERNS) {
      if (pattern.test(html)) return 'Tracker';
    }
    // 1x1 obrázky
    if (/<img[^>]*(?:width\s*=\s*["']?[01]["'\s>])[^>]*(?:height\s*=\s*["']?[01]["'\s>])/gi.test(html)) return 'Tracking pixel';
    // display:none obrázky
    if (/<img[^>]*style\s*=\s*["'][^"']*display\s*:\s*none/i.test(html)) return 'Hidden tracker';
    return null;
  }

  function scanEmail(emailId: string): void {
    if (scannedIds.has(emailId)) return;
    scannedIds.add(emailId);

    try {
      gmail.get.email_data_async(emailId, (emailData: any) => {
        if (!emailData?.threads) return;

        const threadIds = Object.keys(emailData.threads);
        const lastThread = emailData.threads[threadIds[threadIds.length - 1]];
        if (!lastThread) return;

        const html = lastThread.content_html || '';
        const fromEmail = lastThread.from_email || lastThread.from?.address || '';

        const tracker = findTrackerInHtml(html);

        window.postMessage({
          type: 'sleduju-ta-scan-result',
          emailId,
          tracker,
          from: fromEmail,
        }, '*');
      });
    } catch (e) {
      console.warn('[Sledujú Ťa! page] Scan failed', emailId, e);
    }
  }

  function scanInboxEmails(): void {
    const rows = document.querySelectorAll('tr.zA');

    // Debug: prvý scan — ukážeme čo vidíme
    if (rows.length > 0 && scannedIds.size === 0) {
      const first = rows[0] as HTMLElement;
      const attrs = Array.from(first.attributes).map(a => a.name).join(', ');
      console.log(`[Sledujú Ťa! page] First row attrs: ${attrs}`);
      // Skúsime aj iné spôsoby zistenia thread ID
      const h2 = first.querySelector('h2, [data-thread-id], [data-legacy-thread-id]');
      console.log(`[Sledujú Ťa! page] Row thread element:`, h2);
    }

    for (const row of rows) {
      // Skúsime viacero spôsobov ako získať thread ID
      const threadId = row.getAttribute('data-legacy-thread-id')
        || row.getAttribute('data-thread-id')
        || (row.querySelector('[data-legacy-thread-id]') as HTMLElement)?.getAttribute('data-legacy-thread-id')
        || '';
      if (threadId && !scannedIds.has(threadId)) {
        scanEmail(threadId);
      }
    }
  }

  function scanOpenEmail(): void {
    try {
      const emailId = gmail.get.email_id();
      if (emailId && !scannedIds.has(emailId)) {
        scanEmail(emailId);
      }
    } catch { /* nie sme v email view */ }
  }

  function observe(): void {
    try {
      if (gmail.check.is_inside_email()) {
        scanOpenEmail();
      }
      scanInboxEmails();
    } catch { /* */ }
    setTimeout(observe, SCAN_INTERVAL_MS);
  }

  gmail.observe.on('load', () => {
    console.log('[Sledujú Ťa! page] gmail.js loaded, starting scanner');
    window.postMessage({ type: 'sleduju-ta-ready' }, '*');
    observe();
  });
}
