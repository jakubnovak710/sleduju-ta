/**
 * Page-level script — beží v kontexte Gmail stránky.
 * Používa gmail.js na prístup k raw HTML emailov BEZ ich otvorenia.
 *
 * METODIKA DETEKCIE:
 * 1. Fetchujeme raw HTML emailu cez gmail.get.email_data_async (XHR)
 * 2. Skenujeme HTML na: known domény, URL patterny, 1x1 img, hidden img
 * 3. Rate limiting: max 1 request/sekunda, max 30 emailov na stránku
 * 4. Výsledky posielame do content scriptu cez postMessage
 */
import jQuery from 'jquery';
(window as any).$ = jQuery;
(window as any).jQuery = jQuery;

// @ts-ignore
const gmailExports: any = {};
try {
  const mod = require('gmail-js');
  gmailExports.Gmail = mod.Gmail || mod.default?.Gmail || mod;
} catch {
  gmailExports.Gmail = (window as any).Gmail;
}

if (!gmailExports.Gmail || typeof gmailExports.Gmail !== 'function') {
  console.error('[Sledujú Ťa! page] Gmail constructor not found');
} else {
  const gmail = new gmailExports.Gmail(jQuery);
  startScanner(gmail);
}

function startScanner(gmail: any): void {
  const scannedIds = new Set<string>();
  const MAX_SCANS = 30;
  const RATE_LIMIT_MS = 1000;
  let scanQueue: string[] = [];
  let scanning = false;
  let totalScanned = 0;

  // === TRACKER DETECTION ===

  const KNOWN_DOMAINS: Record<string, string> = {
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

  const URL_PATTERNS: RegExp[] = [
    /\/track(ing)?\/open/i, /\/pixel\b/i, /\/beacon\b/i,
    /\/wf\/open/i, /\/e\/o\//i, /\/email\/open/i, /\/emimp\//i,
    /\/o\/[a-f0-9]{16,}/i, /\/open\/[a-f0-9]{8,}/i,
    /\/t\.gif/i, /\/open\.gif/i, /\/pixel\.gif/i, /\/blank\.gif/i,
    /\/oo\/[A-Za-z0-9+/=]+/i, /\/v1\/o\//i, /\/e3t\/Cto\//i,
    /\/trace\/mail\//i, /\/open\.aspx/i, /\/callback\/.*\/open\/track/i,
    /[?&]e=ue&ue_px=/i,
  ];

  // Safe domény — vždy ignorovať
  const SAFE = ['gstatic.com', 'googleapis.com', 'google.com', 'gmail.com',
    'ggpht.com', 'ytimg.com', 'gravatar.com', 'githubusercontent.com'];

  function isSafe(url: string): boolean {
    try {
      const h = new URL(url).hostname;
      return SAFE.some(s => h === s || h.endsWith('.' + s));
    } catch { return false; }
  }

  function findTrackerInHtml(html: string): string | null {
    if (!html) return null;

    // 1. Known domains v img src
    const imgSrcRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      const src = match[1];
      if (isSafe(src)) continue;

      // Known domain check
      try {
        const hostname = new URL(src).hostname;
        for (const [domain, name] of Object.entries(KNOWN_DOMAINS)) {
          if (hostname === domain || hostname.endsWith('.' + domain)) return name;
        }
      } catch { /* */ }

      // URL pattern check
      for (const pattern of URL_PATTERNS) {
        if (pattern.test(src)) return 'Tracker';
      }
    }

    // 2. 1x1 alebo 0x0 obrázky (najspoľahlivejšia heuristika)
    if (/<img[^>]*\bwidth\s*=\s*["']?[0-3]["'\s][^>]*\bheight\s*=\s*["']?[0-3]["'\s]/i.test(html)) {
      return 'Tracking pixel';
    }
    if (/<img[^>]*\bheight\s*=\s*["']?[0-3]["'\s][^>]*\bwidth\s*=\s*["']?[0-3]["'\s]/i.test(html)) {
      return 'Tracking pixel';
    }

    // 3. display:none img
    if (/<img[^>]*style\s*=\s*["'][^"']*display\s*:\s*none/i.test(html)) {
      return 'Hidden tracker';
    }

    // 4. max-width: 1px img
    if (/<img[^>]*style\s*=\s*["'][^"']*max-width\s*:\s*1px/i.test(html)) {
      return 'Hidden tracker';
    }

    return null;
  }

  // === RATE-LIMITED SCANNING ===

  /**
   * Priamy fetch emailu cez Gmail API — obchádza gmail.js jQuery parsing.
   * Toto eliminuje TrustedHTML CSP chybu.
   */
  function fetchEmailDirect(emailId: string): void {
    // Konštruujeme URL rovnako ako gmail.js
    const ik = gmail.tracker?.ik || '';
    const url = window.location.origin + window.location.pathname
      + `?ui=2&ik=${ik}&view=cv&th=${emailId}&msgs=&mb=0&rt=1&search=inbox`;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      try {
        const raw = xhr.responseText || '';
        // Extrahujeme content_html z JSON response BEZ jQuery parsing
        // Gmail response obsahuje sériu JSON arrays
        // content_html je typicky v pozícii [13][6] alebo priamo v texte
        const tracker = findTrackerInRawResponse(raw);

        if (tracker) {
          // Nájdeme from_email v response
          const fromMatch = raw.match(/"([^"]+@[^"]+)"/);
          const fromEmail = fromMatch ? fromMatch[1] : '';
          console.log(`[Sledujú Ťa!] FOUND: ${tracker} from ${fromEmail} (${emailId})`);
          window.postMessage({
            type: 'sleduju-ta-scan-result',
            emailId,
            tracker,
            from: fromEmail,
          }, '*');
        }
      } catch { /* parse error — skip */ }

      // Ďalší v queue
      setTimeout(() => {
        scanning = false;
        processQueue();
      }, RATE_LIMIT_MS);
    };
    xhr.send();
  }

  /**
   * Skenuje surový Gmail response na trackery.
   * Nepoužíva jQuery — pracuje priamo s textom.
   */
  function findTrackerInRawResponse(raw: string): string | null {
    if (!raw || raw.length < 100) return null;

    // Hľadáme tracking domény priamo v raw texte
    for (const [domain, name] of Object.entries(KNOWN_DOMAINS)) {
      if (raw.includes(domain)) {
        // Overíme že je v img kontexte (nie v texte emailu)
        const imgCheck = new RegExp(`<img[^>]*[^>]*${domain.replace('.', '\\.')}`, 'i');
        if (imgCheck.test(raw)) return name;
        // Alebo v URL kontexte
        const urlCheck = new RegExp(`(?:src|href|url)\\s*=\\s*["'][^"']*${domain.replace('.', '\\.')}`, 'i');
        if (urlCheck.test(raw)) return name;
      }
    }

    // URL patterny v img src
    for (const pattern of URL_PATTERNS) {
      // Overíme že pattern je v img kontexte
      const imgSrcs = raw.match(/src\s*=\s*["']([^"']{10,})["']/gi) || [];
      for (const srcAttr of imgSrcs) {
        if (pattern.test(srcAttr)) return 'Tracker';
      }
    }

    // Heuristika: malé obrázky
    if (/width\s*=\s*["']?[0-3]["'\s].*?height\s*=\s*["']?[0-3]["'\s]/i.test(raw) ||
        /height\s*=\s*["']?[0-3]["'\s].*?width\s*=\s*["']?[0-3]["'\s]/i.test(raw)) {
      // Overíme že je to img tag, nie niečo iné
      if (/<img[^>]*(?:width|height)\s*=\s*["']?[0-3]/i.test(raw)) {
        return 'Tracking pixel';
      }
    }

    // display:none img
    if (/<img[^>]*style\s*=\s*["'][^"']*display\s*:\s*none/i.test(raw)) {
      return 'Hidden tracker';
    }

    return null;
  }

  function processQueue(): void {
    if (scanning || scanQueue.length === 0 || totalScanned >= MAX_SCANS) return;
    scanning = true;

    const emailId = scanQueue.shift()!;
    totalScanned++;

    // Priamy fetch — obchádza gmail.js jQuery TrustedHTML problém
    fetchEmailDirect(emailId);
  }

  // === INBOX SCANNING ===

  function scanInboxEmails(): void {
    const rows = document.querySelectorAll('tr.zA');
    let added = 0;

    for (const row of rows) {
      const span = row.querySelector('[data-legacy-thread-id]') as HTMLElement;
      const threadId = span?.getAttribute('data-legacy-thread-id') || '';
      if (threadId && !scannedIds.has(threadId)) {
        scannedIds.add(threadId);
        scanQueue.push(threadId);
        added++;
      }
    }

    if (added > 0) {
      console.log(`[Sledujú Ťa! page] Queued ${added} emails for scanning (${totalScanned}/${MAX_SCANS} done)`);
      processQueue();
    }
  }

  // === INIT ===

  gmail.observe.on('load', () => {
    console.log('[Sledujú Ťa! page] gmail.js loaded, scanning inbox...');
    window.postMessage({ type: 'sleduju-ta-ready' }, '*');

    // Počkáme kým sa Gmail DOM načíta
    setTimeout(() => {
      scanInboxEmails();
      // Re-scan pri DOM zmenách (nové emaily, scroll)
      const observer = new MutationObserver(() => scanInboxEmails());
      const main = document.querySelector('div[role="main"]');
      if (main) {
        observer.observe(main, { childList: true, subtree: true });
      }
    }, 3000);
  });
}
