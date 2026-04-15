import { matchKnownTracker, matchTrackingPattern, isSafeDomain } from '../shared/tracker-db';
import type { TrackerMatch } from '../shared/types';

/**
 * Skontroluje, či je obrázok tracking pixel na základe heuristiky.
 */
/**
 * Parsuje CSS rozmer na číslo v px (zvláda "1px", "0", "1px !important").
 */
function parseCssDim(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/\s*!important\s*/gi, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function isHeuristicTracker(img: HTMLImageElement): boolean {
  const MAX_TRACKER_DIM = 3;
  const src = img.src || '';
  if (!src || !src.startsWith('http')) return false;

  // 1. HTML atribúty width/height (vrátane 0x0)
  const attrW = img.getAttribute('width');
  const attrH = img.getAttribute('height');
  if (attrW !== null || attrH !== null) {
    const w = parseInt(attrW || '999', 10);
    const h = parseInt(attrH || '999', 10);
    if (w <= MAX_TRACKER_DIM && h <= MAX_TRACKER_DIM) return true;
  }

  // 2. Inline style rozmery — vrátane "1px !important", "max-width: 1px"
  const styleAttr = img.getAttribute('style') || '';
  if (styleAttr) {
    const widthMatch = styleAttr.match(/(?:max-)?width\s*:\s*([^;]+)/i);
    const heightMatch = styleAttr.match(/(?:max-)?height\s*:\s*([^;]+)/i);
    if (widthMatch && heightMatch) {
      const w = parseCssDim(widthMatch[1]);
      const h = parseCssDim(heightMatch[1]);
      if (w !== null && h !== null && w <= MAX_TRACKER_DIM && h <= MAX_TRACKER_DIM) return true;
    }
  }

  // 3. Computed style (aj keď rozmery sú v externom CSS)
  try {
    const style = getComputedStyle(img);

    // Skryté cez CSS (display:none, visibility:hidden, opacity:0)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return true;
    }

    // Computed rozmery
    const cw = parseCssDim(style.width);
    const ch = parseCssDim(style.height);
    if (cw !== null && ch !== null && cw <= MAX_TRACKER_DIM && ch <= MAX_TRACKER_DIM) return true;

    // max-width / max-height
    const mw = parseCssDim(style.maxWidth);
    const mh = parseCssDim(style.maxHeight);
    if (mw !== null && mh !== null && mw <= MAX_TRACKER_DIM && mh <= MAX_TRACKER_DIM) return true;
  } catch { /* getComputedStyle môže failnúť v testoch */ }

  // 4. naturalWidth/naturalHeight pre načítané obrázky
  if (img.complete && img.naturalWidth <= MAX_TRACKER_DIM && img.naturalHeight <= MAX_TRACKER_DIM) {
    return true;
  }

  // 5. DOM width/height properties
  if (img.width <= MAX_TRACKER_DIM && img.height <= MAX_TRACKER_DIM) {
    if (attrW !== null || attrH !== null || styleAttr) {
      return true;
    }
  }

  // 6. Špecifická CSS trieda (napr. mailtrack-img)
  if (img.classList.contains('mailtrack-img')) return true;

  return false;
}

/**
 * Extrahuje URL zo CSS hodnoty (background-image, src, atd.)
 */
function extractUrlFromCss(value: string): string | null {
  const match = value.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
  return match ? match[1] : null;
}

/**
 * Klasifikuje URL — vráti TrackerMatch info alebo null.
 */
function classifyTrackingUrl(url: string): Omit<TrackerMatch, 'element'> | null {
  const knownTracker = matchKnownTracker(url);
  if (knownTracker) {
    try {
      return { tracker: knownTracker, domain: new URL(url).hostname, method: 'known' };
    } catch { /* */ }
  }

  if (matchTrackingPattern(url)) {
    let domain = '';
    try { domain = new URL(url).hostname; } catch { /* */ }
    return { tracker: domain || 'Neznámy', domain, method: 'pattern' };
  }

  return null;
}

/**
 * Skenuje elementy s CSS background-image, ktoré môžu obsahovať tracking URL.
 * Trackery niekedy používajú <div> alebo <td> s background-image namiesto <img>.
 */
export function detectCssTrackers(container: Element): TrackerMatch[] {
  const matches: TrackerMatch[] = [];
  const elements = container.querySelectorAll('div, td, span, table, tr');

  for (const el of elements) {
    const style = getComputedStyle(el);
    const bgImage = style.backgroundImage;
    if (!bgImage || bgImage === 'none') continue;

    const url = extractUrlFromCss(bgImage);
    if (!url) continue;

    const result = classifyTrackingUrl(url);
    if (result) {
      matches.push({ ...result, element: el as unknown as HTMLImageElement });
    }
  }

  return matches;
}

/**
 * Skenuje <style> a <link> elementy pre @font-face tracking.
 * Niektoré trackery používajú vlastné @font-face s unikátnym URL na tracking.
 */
export function detectFontTrackers(container: Element): TrackerMatch[] {
  const matches: TrackerMatch[] = [];

  // Skenujeme inline <style> elementy
  const styles = container.querySelectorAll('style');
  for (const styleEl of styles) {
    const css = styleEl.textContent || '';

    // Hľadáme @font-face s tracking URL
    const fontFaceRegex = /@font-face\s*\{[^}]*src:\s*url\(["']?(https?:\/\/[^"')]+)["']?\)/gi;
    let fontMatch;
    while ((fontMatch = fontFaceRegex.exec(css)) !== null) {
      const url = fontMatch[1];
      const result = classifyTrackingUrl(url);
      if (result) {
        matches.push({ ...result, element: styleEl as unknown as HTMLImageElement });
      }
    }
  }

  return matches;
}

/**
 * Tracking parametre v URL odkazoch, ktoré identifikujú používateľa.
 */
const TRACKING_LINK_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid',
  'mc_cid', 'mc_eid',   // Mailchimp
  '_ke',                  // Klaviyo
  'sc_cid',              // Snapchat
  'ttclid',              // TikTok
  'li_fat_id',           // LinkedIn
  'twclid',              // Twitter
  'msclkid',             // Microsoft
  'igshid',              // Instagram
  'ref', 'ref_src',
];

/**
 * Vyčistí tracking parametre z odkazov v emaile.
 * Vráti počet vyčistených odkazov.
 */
export function cleanTrackingLinks(container: Element): number {
  const links = container.querySelectorAll('a[href]');
  let cleaned = 0;

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('http')) continue;

    try {
      const url = new URL(href);
      let hadTracking = false;

      for (const param of TRACKING_LINK_PARAMS) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          hadTracking = true;
        }
      }

      if (hadTracking) {
        link.setAttribute('href', url.toString());
        link.setAttribute('data-sledujata-cleaned', 'true');
        cleaned++;
      }
    } catch { /* nevalidná URL */ }
  }

  return cleaned;
}

/**
 * Extrahuje pôvodnú URL z Gmail proxy URL.
 * Gmail proxuje obrázky cez googleusercontent.com a pôvodnú URL
 * zachováva v hash fragmente: https://ci3.googleusercontent.com/proxy/...#https://original.com/pixel.gif
 */
function deproxyUrl(src: string): string {
  if (src.includes('googleusercontent.com/proxy') || src.includes('googleusercontent.com/meips')) {
    const hashIdx = src.indexOf('#');
    if (hashIdx > -1) {
      const original = src.substring(hashIdx + 1);
      if (original.startsWith('http')) return original;
    }
  }
  return src;
}

/**
 * Skenuje zoznam obrázkov a identifikuje tracking pixely.
 * Gmail proxuje obrázky — extrahujeme pôvodnú URL z hash fragmentu.
 */
export function detectTrackers(images: HTMLImageElement[]): TrackerMatch[] {
  const matches: TrackerMatch[] = [];

  for (const img of images) {
    const rawSrc = img.src || img.getAttribute('data-src') || '';
    if (!rawSrc || rawSrc.startsWith('data:') || rawSrc.startsWith('blob:')) continue;

    // Deproxujeme Gmail proxy URL — získame pôvodnú tracking URL
    const src = deproxyUrl(rawSrc);

    // Preskočíme safe domény
    try {
      if (isSafeDomain(new URL(src).hostname)) continue;
    } catch { /* */ }

    // Vrstva 1: Known tracker domény
    const knownTracker = matchKnownTracker(src);
    if (knownTracker) {
      let domain = '';
      try { domain = new URL(src).hostname; } catch { /* */ }
      matches.push({
        tracker: knownTracker,
        domain,
        method: 'known',
        element: img,
      });
      continue;
    }

    // Vrstva 2: Heuristická detekcia (1x1, hidden, etc.)
    if (isHeuristicTracker(img)) {
      let domain = '';
      try { domain = new URL(src).hostname; } catch { /* */ }
      matches.push({
        tracker: domain || 'Neznámy',
        domain,
        method: 'heuristic',
        element: img,
      });
      continue;
    }

    // Vrstva 3: URL pattern matching
    if (matchTrackingPattern(src)) {
      let domain = '';
      try { domain = new URL(src).hostname; } catch { /* */ }
      matches.push({
        tracker: domain || 'Neznámy',
        domain,
        method: 'pattern',
        element: img,
      });
    }
  }

  return matches;
}
