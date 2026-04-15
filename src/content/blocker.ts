import type { TrackerMatch } from '../shared/types';

const BLOCKED_ATTR = 'data-sledujata-blocked';

/**
 * Zablokuje tracking pixel — nahradí src transparentným 1x1 base64 obrázkom.
 * Pridá data atribút, aby sme rovnaký element neblokovali dvakrát.
 */
export function blockTracker(match: TrackerMatch): void {
  const img = match.element;

  if (img.hasAttribute(BLOCKED_ATTR)) return;

  // Uložíme pôvodnú URL pre debug účely
  img.setAttribute('data-sledujata-original-src', img.src);
  img.setAttribute(BLOCKED_ATTR, match.tracker);

  // Nahradíme transparentným 1x1px GIF
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  // Zablokujeme ďalšie načítanie
  img.removeAttribute('srcset');
  img.loading = 'lazy';
}

/**
 * Zablokuje všetky detegované trackery a vráti počet novo zablokovaných.
 */
export function blockTrackers(matches: TrackerMatch[]): number {
  let blocked = 0;
  for (const match of matches) {
    if (!match.element.hasAttribute(BLOCKED_ATTR)) {
      blockTracker(match);
      blocked++;
    }
  }
  return blocked;
}

/**
 * Skontroluje, či bol element už zablokovaný.
 */
export function isBlocked(img: HTMLImageElement): boolean {
  return img.hasAttribute(BLOCKED_ATTR);
}
