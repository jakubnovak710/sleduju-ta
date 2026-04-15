/**
 * Databáza známych tracking domén a URL patternov.
 * Mapuje doménu/subdoménu na názov trackera.
 */
export const KNOWN_TRACKERS: Record<string, string> = {
  // Mailchimp / Intuit
  'list-manage.com': 'Mailchimp',
  'mailchimp.com': 'Mailchimp',
  'campaign-archive.com': 'Mailchimp',
  'eep.io': 'Mailchimp',
  'mcusercontent.com': 'Mailchimp',

  // HubSpot
  'hubspotemail.net': 'HubSpot',
  'track.hubspot.com': 'HubSpot',
  'hubspot.com/email-open': 'HubSpot',
  't.sidekickopen.com': 'HubSpot',

  // SendGrid / Twilio
  'sendgrid.net': 'SendGrid',
  'u.sendgrid.net': 'SendGrid',

  // Salesforce
  'salesforce.com': 'Salesforce',
  'exacttarget.com': 'Salesforce',

  // Marketo / Adobe
  'marketo.com': 'Marketo',
  'mktdns.com': 'Marketo',
  'mktomail.com': 'Marketo',

  // Pardot (Salesforce)
  'pardot.com': 'Pardot',
  'pi.pardot.com': 'Pardot',

  // Constant Contact
  'constantcontact.com': 'Constant Contact',
  'ctctcdn.com': 'Constant Contact',

  // ConvertKit
  'convertkit.com': 'ConvertKit',
  'open.convertkit.com': 'ConvertKit',
  'convertkit-mail.com': 'ConvertKit',
  'ck.page': 'ConvertKit',

  // ActiveCampaign
  'activecampaign.com': 'ActiveCampaign',
  'img.acmail.com': 'ActiveCampaign',

  // Brevo (ex Sendinblue)
  'sendinblue.com': 'Brevo',
  'brevo.com': 'Brevo',
  'sibautomation.com': 'Brevo',

  // Klaviyo
  'klaviyo.com': 'Klaviyo',
  'trk.klclick.com': 'Klaviyo',

  // Drip
  'drip.com': 'Drip',
  'getdrip.com': 'Drip',

  // Intercom
  'intercom-mail.com': 'Intercom',
  'intercom.io': 'Intercom',

  // Mixpanel
  'mixpanel.com': 'Mixpanel',
  'mxpnl.com': 'Mixpanel',

  // Customer.io
  'customer.io': 'Customer.io',
  'customeriomail.com': 'Customer.io',

  // Mailgun
  'mailgun.net': 'Mailgun',
  'mailgun.org': 'Mailgun',

  // Postmark
  'postmarkapp.com': 'Postmark',
  'pstmrk.it': 'Postmark',

  // Amazon SES
  'amazonses.com': 'Amazon SES',

  // Mandrill (Mailchimp transactional)
  'mandrillapp.com': 'Mandrill',

  // SparkPost / MessageBird
  'sparkpost.com': 'SparkPost',
  'sparkpostmail.com': 'SparkPost',

  // Mailtrack
  'mailtrack.io': 'Mailtrack',

  // Streak
  'streak.com': 'Streak',
  'mailfoogae.appspot.com': 'Streak',

  // Yesware
  'yesware.com': 'Yesware',
  't.yesware.com': 'Yesware',

  // Mixmax
  'mixmax.com': 'Mixmax',
  'links.mixmax.com': 'Mixmax',

  // Bananatag / Staffbase
  'bananatag.com': 'Bananatag',
  'bl-1.com': 'Bananatag',

  // GetNotify
  'getnotify.com': 'GetNotify',

  // Superhuman
  'superhuman.com': 'Superhuman',

  // Cirrus Insight
  'cirrusinsight.com': 'Cirrus Insight',

  // Outreach
  'outreach.io': 'Outreach',
  'app.outreach.io': 'Outreach',

  // SalesLoft / Salesloft
  'salesloft.com': 'SalesLoft',

  // Reply.io
  'reply.io': 'Reply.io',

  // Lemlist
  'lemlist.com': 'Lemlist',

  // Woodpecker
  'woodpecker.co': 'Woodpecker',

  // Mailshake
  'mailshake.com': 'Mailshake',

  // Gmass
  'gmass.co': 'GMass',

  // Moosend
  'moosend.com': 'Moosend',

  // Omnisend
  'omnisend.com': 'Omnisend',

  // GetResponse
  'getresponse.com': 'GetResponse',

  // AWeber
  'aweber.com': 'AWeber',

  // Campaign Monitor
  'createsend.com': 'Campaign Monitor',
  'cmail19.com': 'Campaign Monitor',
  'cmail20.com': 'Campaign Monitor',

  // MailerLite
  'mailerlite.com': 'MailerLite',
  'mlsend.com': 'MailerLite',

  // Benchmark Email
  'benchmarkemail.com': 'Benchmark',

  // Sendy
  'sendy.co': 'Sendy',

  // Return Path / Validity
  'returnpath.net': 'Return Path',
  'pixel.monitor.return-path.net': 'Return Path',

  // Litmus
  'litmus.com': 'Litmus',
  'emailanalysis.com': 'Litmus',

  // Google Analytics (v mailoch)
  'google-analytics.com': 'Google Analytics',
  'ssl.google-analytics.com': 'Google Analytics',

  // Facebook / Meta (tracking pixel je na facebook.com/tr ale hostname check nestačí)
  // Detekcia prebieha cez URL pattern

  // LinkedIn (tracking pixel je na linkedin.com/emimp ale hostname check nestačí)
  // Detekcia prebieha cez URL pattern + heuristiku

  // Twitter/X
  't.co': 'Twitter/X',

  // Iterable
  'iterable.com': 'Iterable',

  // Braze
  'braze.com': 'Braze',
  'appboy-images.com': 'Braze',

  // OneSignal
  'onesignal.com': 'OneSignal',

  // Autopilot / Ortto
  'autopilotmail.com': 'Ortto',
  'ortto.com': 'Ortto',

  // Freshworks / Freshmarketer
  'freshmarketer.com': 'Freshworks',

  // Zoho
  'zoho.com': 'Zoho',
  'zcsend.net': 'Zoho',

  // Keap / Infusionsoft
  'infusionsoft.com': 'Keap',
  'keap.com': 'Keap',

  // Copper
  'copper.com': 'Copper',

  // Close.com
  'close.com': 'Close',

  // Apollo.io
  'apollo.io': 'Apollo',

  // ZoomInfo
  'zoominfo.com': 'ZoomInfo',

  // Snov.io
  'snov.io': 'Snov.io',

  // Hunter.io
  'hunter.io': 'Hunter',

  // Mailjet
  'mailjet.com': 'Mailjet',

  // Elastic Email
  'elasticemail.com': 'Elastic Email',

  // Mailtrap
  'mailtrap.io': 'Mailtrap',

  // SendPulse
  'sendpulse.com': 'SendPulse',

  // Privy
  'privy.com': 'Privy',

  // Mailjet
  'mjt.lu': 'Mailjet',

  // Beehiiv
  'beehiiv.com': 'Beehiiv',
  'mail.beehiiv.com': 'Beehiiv',

  // Mailsuite / Snowplow
  'mailsuite.com': 'Mailsuite',
  'e.mailsuite.com': 'Mailsuite',

  // Temu
  'api-euo.temu.com': 'Temu',

  // Lidl (Salesforce MC)
  'mail.lidlplus.sk': 'Lidl',
  'emails.scrm.lidl': 'Lidl',

  // Supabase (Customer.io)
  'email.supabase.com': 'Supabase',
};

/**
 * URL patterns indikujúce tracking v ceste alebo query parametroch.
 */
export const TRACKING_URL_PATTERNS: RegExp[] = [
  /\/track(ing)?\/open/i,
  /\/pixel\b/i,
  /\/beacon\b/i,
  /\/wf\/open/i,                  // SendGrid
  /\/e\/o\//i,                    // Customer.io
  /\/email\/open/i,
  /\/emimp\//i,
  /\/o\/[a-f0-9]{16,}/i,
  /\/open\/[a-f0-9]{8,}/i,
  /[?&]d=\d+&c=[a-f0-9]+/i,
  /\/track\/v\d+/i,
  /\/trk\//i,
  /\/t\.gif/i,
  /\/open\.gif/i,
  /\/pixel\.gif/i,
  /\/blank\.gif/i,
  /\/spacer\.gif/i,
  // Nové patterns z reálnych mailov
  /\/oo\/[A-Za-z0-9+/=]+/i,      // Mailjet open tracking (/oo/<encoded>)
  /\/v1\/o\//i,                   // Beehiiv open tracking (/v1/o/)
  /\/e3t\/Cto\//i,               // HubSpot/Vero tracking (/e3t/Cto/)
  /\/trace\/mail\//i,            // Mailtrack.io (/trace/mail/)
  /\/open\.aspx/i,               // Salesforce Marketing Cloud (open.aspx)
  /\/callback\/.*\/open\/track/i, // Temu (/callback/doha/open/track)
  /[?&]e=ue&ue_px=/i,            // Snowplow Analytics (Mailsuite)
  /\/i\?e=ue/i,                  // Snowplow Analytics short form
];

/**
 * Domény, ktoré sa nikdy nemajú označiť ako trackery.
 *
 * DÔLEŽITÉ: googleusercontent.com tu NESMIE byť!
 * Gmail proxuje VŠETKY obrázky (aj tracking pixely) cez googleusercontent.com.
 * Detekcia na proxied obrázkoch funguje cez rozmery a CSS, nie cez doménu.
 */
const SAFE_DOMAINS = [
  'gstatic.com',              // Google static content (fonty, UI)
  'googleapis.com',           // Google APIs (fonts, maps)
  'google.com',               // Google search/services
  'gmail.com',                // Gmail UI
  'ggpht.com',                // Google photos/profiles
  'ytimg.com',                // YouTube thumbnaily
  'gravatar.com',             // Gravatar profilové obrázky
  'githubusercontent.com',    // GitHub
  'slack-imgs.com',           // Slack
  'emoji.slack-edge.com',     // Slack emoji
];

/**
 * Skontroluje, či URL patrí známemu trackeru.
 * Vracia názov trackera alebo null.
 */
export function matchKnownTracker(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Najprv skontrolujeme safe domény — nikdy neblokujeme
    if (isSafeDomain(hostname)) return null;

    for (const [domain, tracker] of Object.entries(KNOWN_TRACKERS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return tracker;
      }
    }
  } catch {
    // Nevalidná URL
  }
  return null;
}

/**
 * Skontroluje, či doména patrí do zoznamu bezpečných domén.
 */
export function isSafeDomain(hostname: string): boolean {
  return SAFE_DOMAINS.some(
    (safe) => hostname === safe || hostname.endsWith('.' + safe),
  );
}

/**
 * Skontroluje, či URL matchuje tracking URL pattern.
 */
export function matchTrackingPattern(url: string): boolean {
  return TRACKING_URL_PATTERNS.some((pattern) => pattern.test(url));
}
