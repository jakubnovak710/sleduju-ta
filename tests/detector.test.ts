import { describe, it, expect, beforeEach } from 'vitest';
import { detectTrackers } from '../src/content/detector';

function createImg(attrs: Record<string, string> = {}): HTMLImageElement {
  const img = document.createElement('img');
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'src') {
      // Nastavíme src cez setAttribute aby fungoval aj v jsdom
      img.setAttribute('src', value);
      // jsdom nenastaví img.src automaticky s plnou URL
      Object.defineProperty(img, 'src', { value, writable: true });
    } else {
      img.setAttribute(key, value);
    }
  }
  return img;
}

describe('detectTrackers', () => {
  describe('known tracker detekcia', () => {
    it('detekuje Mailchimp tracking pixel', () => {
      const img = createImg({ src: 'https://list-manage.com/track/open.php?u=abc123' });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].tracker).toBe('Mailchimp');
      expect(matches[0].method).toBe('known');
    });

    it('detekuje HubSpot tracking pixel', () => {
      const img = createImg({ src: 'https://t.sidekickopen.com/e/o/123' });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].tracker).toBe('HubSpot');
    });

    it('detekuje viacero trackerov v jednom maili', () => {
      const imgs = [
        createImg({ src: 'https://list-manage.com/track/open.php?u=abc' }),
        createImg({ src: 'https://track.hubspot.com/e/o/456' }),
        createImg({ src: 'https://u.sendgrid.net/wf/open?upn=xyz' }),
      ];
      const matches = detectTrackers(imgs);
      expect(matches).toHaveLength(3);
      expect(matches.map((m) => m.tracker)).toEqual(['Mailchimp', 'HubSpot', 'SendGrid']);
    });
  });

  describe('heuristická detekcia', () => {
    it('detekuje 1x1 obrázok podľa atribútov', () => {
      const img = createImg({
        src: 'https://unknown-tracker.com/img.gif',
        width: '1',
        height: '1',
      });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].method).toBe('heuristic');
    });

    it('detekuje 0x0 obrázok', () => {
      const img = createImg({
        src: 'https://unknown-tracker.com/img.gif',
        width: '0',
        height: '0',
      });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].method).toBe('heuristic');
    });

    it('detekuje variabilné malé rozmery (3x1)', () => {
      const img = createImg({
        src: 'https://sneaky-tracker.com/img.gif',
        width: '3',
        height: '1',
      });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].method).toBe('heuristic');
    });
  });

  describe('URL pattern detekcia', () => {
    it('detekuje /track/open URL', () => {
      const img = createImg({ src: 'https://custom-email.com/track/open?id=abc123' });
      // Musíme nastaviť normálne rozmery aby heuristika nepreskočila
      Object.defineProperty(img, 'width', { value: 100 });
      Object.defineProperty(img, 'height', { value: 100 });
      Object.defineProperty(img, 'complete', { value: false });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].method).toBe('pattern');
    });

    it('detekuje /pixel.gif URL', () => {
      const img = createImg({ src: 'https://analytics.company.com/pixel.gif' });
      Object.defineProperty(img, 'width', { value: 100 });
      Object.defineProperty(img, 'height', { value: 100 });
      Object.defineProperty(img, 'complete', { value: false });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(1);
      expect(matches[0].method).toBe('pattern');
    });
  });

  describe('false positive ochrana', () => {
    it('neignoruje bežné obrázky', () => {
      const img = createImg({ src: 'https://example.com/logo.png' });
      Object.defineProperty(img, 'width', { value: 200 });
      Object.defineProperty(img, 'height', { value: 100 });
      Object.defineProperty(img, 'complete', { value: false });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(0);
    });

    it('ignoruje data: URI obrázky', () => {
      const img = createImg({ src: 'data:image/gif;base64,R0lGODlhAQABAIAAA' });
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(0);
    });

    it('ignoruje obrázky bez src', () => {
      const img = document.createElement('img');
      const matches = detectTrackers([img]);
      expect(matches).toHaveLength(0);
    });
  });
});
