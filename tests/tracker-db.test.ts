import { describe, it, expect } from 'vitest';
import { matchKnownTracker, matchTrackingPattern } from '../src/shared/tracker-db';

describe('matchKnownTracker', () => {
  it('rozpozná Mailchimp tracking doménu', () => {
    expect(matchKnownTracker('https://list-manage.com/track/open.php?u=abc')).toBe('Mailchimp');
  });

  it('rozpozná subdoménu známeho trackera', () => {
    expect(matchKnownTracker('https://email.list-manage.com/img/pixel.gif')).toBe('Mailchimp');
  });

  it('rozpozná HubSpot', () => {
    expect(matchKnownTracker('https://track.hubspot.com/e/o/123')).toBe('HubSpot');
  });

  it('rozpozná SendGrid', () => {
    expect(matchKnownTracker('https://u.sendgrid.net/wf/open?upn=abc')).toBe('SendGrid');
  });

  it('rozpozná ConvertKit', () => {
    expect(matchKnownTracker('https://open.convertkit.com/open/abc123')).toBe('ConvertKit');
  });

  it('vráti null pre neznámu doménu', () => {
    expect(matchKnownTracker('https://example.com/image.png')).toBeNull();
  });

  it('vráti null pre Google obrázky', () => {
    expect(matchKnownTracker('https://lh3.googleusercontent.com/abc')).toBeNull();
  });

  it('vráti null pre nevalidnú URL', () => {
    expect(matchKnownTracker('not-a-url')).toBeNull();
  });

  it('vráti null pre prázdny string', () => {
    expect(matchKnownTracker('')).toBeNull();
  });
});

describe('matchTrackingPattern', () => {
  it('detekuje /track/open pattern', () => {
    expect(matchTrackingPattern('https://example.com/track/open?id=abc')).toBe(true);
  });

  it('detekuje /tracking/open pattern', () => {
    expect(matchTrackingPattern('https://example.com/tracking/open?id=abc')).toBe(true);
  });

  it('detekuje /pixel/ pattern', () => {
    expect(matchTrackingPattern('https://example.com/pixel/abc123')).toBe(true);
  });

  it('detekuje /beacon/ pattern', () => {
    expect(matchTrackingPattern('https://example.com/beacon/open')).toBe(true);
  });

  it('detekuje /wf/open pattern (SendGrid)', () => {
    expect(matchTrackingPattern('https://example.com/wf/open?upn=abc')).toBe(true);
  });

  it('detekuje /t.gif pattern', () => {
    expect(matchTrackingPattern('https://example.com/t.gif')).toBe(true);
  });

  it('detekuje /open.gif pattern', () => {
    expect(matchTrackingPattern('https://example.com/open.gif')).toBe(true);
  });

  it('detekuje /pixel.gif pattern', () => {
    expect(matchTrackingPattern('https://example.com/pixel.gif')).toBe(true);
  });

  it('nedetekuje bežné obrázky', () => {
    expect(matchTrackingPattern('https://example.com/images/logo.png')).toBe(false);
  });

  it('nedetekuje bežné URL', () => {
    expect(matchTrackingPattern('https://example.com/about')).toBe(false);
  });
});
