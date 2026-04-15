import { describe, it, expect } from 'vitest';
import { blockTracker, blockTrackers, isBlocked } from '../src/content/blocker';
import type { TrackerMatch } from '../src/shared/types';

function createTrackerMatch(overrides: Partial<TrackerMatch> = {}): TrackerMatch {
  const img = document.createElement('img');
  img.src = 'https://list-manage.com/track/open.php?u=abc';
  return {
    tracker: 'Mailchimp',
    domain: 'list-manage.com',
    method: 'known',
    element: img,
    ...overrides,
  };
}

describe('blockTracker', () => {
  it('nahradí src transparentným obrázkom', () => {
    const match = createTrackerMatch();
    blockTracker(match);
    expect(match.element.src).toContain('data:image/gif;base64,');
  });

  it('uloží pôvodnú URL do data atribútu', () => {
    const match = createTrackerMatch();
    const originalSrc = match.element.src;
    blockTracker(match);
    expect(match.element.getAttribute('data-sledujata-original-src')).toBe(originalSrc);
  });

  it('označí element ako zablokovaný', () => {
    const match = createTrackerMatch();
    blockTracker(match);
    expect(match.element.hasAttribute('data-sledujata-blocked')).toBe(true);
    expect(match.element.getAttribute('data-sledujata-blocked')).toBe('Mailchimp');
  });

  it('neblokuje rovnaký element dvakrát', () => {
    const match = createTrackerMatch();
    blockTracker(match);
    const srcAfterFirst = match.element.src;
    blockTracker(match);
    expect(match.element.src).toBe(srcAfterFirst);
  });

  it('odstráni srcset atribút', () => {
    const match = createTrackerMatch();
    match.element.setAttribute('srcset', 'https://tracker.com/2x.gif 2x');
    blockTracker(match);
    expect(match.element.hasAttribute('srcset')).toBe(false);
  });
});

describe('blockTrackers', () => {
  it('zablokuje viacero trackerov a vráti počet', () => {
    const matches = [
      createTrackerMatch({ tracker: 'Mailchimp' }),
      createTrackerMatch({ tracker: 'HubSpot' }),
    ];
    const count = blockTrackers(matches);
    expect(count).toBe(2);
  });

  it('vráti 0 ak sú všetky už zablokované', () => {
    const match = createTrackerMatch();
    blockTracker(match);
    const count = blockTrackers([match]);
    expect(count).toBe(0);
  });
});

describe('isBlocked', () => {
  it('vráti false pre nezablokovaný element', () => {
    const img = document.createElement('img');
    expect(isBlocked(img)).toBe(false);
  });

  it('vráti true pre zablokovaný element', () => {
    const match = createTrackerMatch();
    blockTracker(match);
    expect(isBlocked(match.element)).toBe(true);
  });
});
