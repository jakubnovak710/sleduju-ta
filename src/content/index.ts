import { detectTrackers, detectCssTrackers, detectFontTrackers, cleanTrackingLinks } from './detector';
import { blockTrackers } from './blocker';
import { showBanner, removeBanner } from './ui';
import { markInboxRows, rememberTrackerSender } from './inbox-scanner';
import { resolveCname } from '../shared/cname-resolver';
import type { BlockedMessage, TrackerMatch } from '../shared/types';

const SCAN_DEBOUNCE_MS = 300;
const INBOX_SCAN_DEBOUNCE_MS = 1000;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inboxDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentEmailElement: Element | null = null;

/**
 * Extrahuje predmet a odosielateľa z aktuálne otvoreného mailu v Gmail.
 */
function getEmailMeta(): { subject: string; sender: string } {
  const subjectEl = document.querySelector('h2[data-thread-perm-id]');
  const subject = subjectEl?.textContent?.trim() || '';

  const senderEl = document.querySelector('span.gD');
  const sender = senderEl?.getAttribute('email') || senderEl?.textContent?.trim() || '';

  return { subject, sender };
}

/**
 * Nájde kontajner otvoreného emailu v Gmail DOM.
 */
function findEmailBody(): Element | null {
  const bodies = document.querySelectorAll('div.adn div.a3s');
  if (bodies.length > 0) {
    return bodies[bodies.length - 1];
  }
  return null;
}

/**
 * Skenuje aktuálne otvorený mail na tracking pixely.
 */
function scanCurrentEmail(): void {
  const emailBody = findEmailBody();
  if (!emailBody || emailBody === currentEmailElement) return;

  currentEmailElement = emailBody;

  const images = Array.from(emailBody.querySelectorAll('img')) as HTMLImageElement[];

  const imgMatches = images.length > 0 ? detectTrackers(images) : [];
  const cssMatches = detectCssTrackers(emailBody);
  const fontMatches = detectFontTrackers(emailBody);
  const matches = [...imgMatches, ...cssMatches, ...fontMatches];

  cleanTrackingLinks(emailBody);

  if (matches.length === 0) {
    removeBanner();
    runCnameCheck(images, emailBody);
    return;
  }

  const blocked = blockTrackers(matches);
  if (blocked === 0) return;

  notifyAndShow(matches, emailBody);

  const unmatchedImages = images.filter(
    (img) => !matches.some((m) => m.element === img),
  );
  runCnameCheck(unmatchedImages, emailBody);
}

/**
 * Zobrazí banner, notifikuje service worker a zapamätá odosielateľa.
 */
function notifyAndShow(matches: TrackerMatch[], emailBody: Element): void {
  showBanner(matches, emailBody);

  const meta = getEmailMeta();

  // Zapamätáme odosielateľa pre inbox badge
  const primaryTracker = matches[0]?.tracker || 'Tracker';
  rememberTrackerSender(meta.sender, primaryTracker);

  chrome.runtime.sendMessage({
    type: 'tracker-blocked',
    trackers: matches.map((m) => ({
      tracker: m.tracker,
      domain: m.domain,
      method: m.method,
    })),
    ...meta,
  } satisfies BlockedMessage);
}

/**
 * Async CNAME check.
 */
async function runCnameCheck(images: HTMLImageElement[], emailBody: Element): Promise<void> {
  const newMatches: TrackerMatch[] = [];

  for (const img of images) {
    const src = img.src || '';
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;

    let hostname: string;
    try { hostname = new URL(src).hostname; } catch { continue; }

    const tracker = await resolveCname(hostname);
    if (tracker) {
      newMatches.push({
        tracker: `${tracker} (CNAME)`,
        domain: hostname,
        method: 'known',
        element: img,
      });
    }
  }

  if (newMatches.length > 0) {
    blockTrackers(newMatches);
    notifyAndShow(newMatches, emailBody);
  }
}

function debouncedScan(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scanCurrentEmail, SCAN_DEBOUNCE_MS);
}

function debouncedInboxScan(): void {
  if (inboxDebounceTimer) clearTimeout(inboxDebounceTimer);
  inboxDebounceTimer = setTimeout(() => markInboxRows(), INBOX_SCAN_DEBOUNCE_MS);
}

async function init(): Promise<void> {
  const result = await chrome.storage.local.get('enabled');
  if (result.enabled === false) return;

  scanCurrentEmail();
  markInboxRows();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        debouncedScan();
        debouncedInboxScan();
        break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

init();
