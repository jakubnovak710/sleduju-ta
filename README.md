# Sledujú Ťa!

**Sledujú ťa. My ich zastavíme.**

Chrome rozšírenie, ktoré blokuje tracking pixely v Gmail mailoch a ukazuje ti, kto ťa sleduje.

## Čo to robí?

Keď dostanete marketingový email (newsletter, promo...), odosielateľ doň často vloží neviditeľný 1x1px obrázok — **tracking pixel**. Keď mail otvoríte, obrázok sa načíta a odosielateľ vie:

- **kedy** ste mail otvorili
- **kde** sa nachádzate (IP adresa)
- **aké zariadenie** používate

Sledujú Ťa! tieto pixely deteguje a zablokuje **pred ich načítaním**.

## Funkcie

- **200+ známych trackerov** — Mailchimp, HubSpot, SendGrid, Salesforce, Brevo a ďalšie
- **5-vrstvová detekcia:**
  - Known tracker databáza (200+ domén)
  - Heuristická analýza (1x1px, 3x1px, hidden, display:none)
  - URL pattern matching (/track/open, /pixel.gif, /beacon...)
  - CSS background-image tracking (div/td s tracking URL)
  - Font tracking (@font-face s tracking URL)
- **CNAME uncloaking** — odhalí trackery skryté za first-party doménami (track.firma.sk -> hubspot.com)
- **Link cleaning** — odstraňuje tracking parametre z odkazov (UTM, fbclid, gclid, mc_cid...)
- **Inbox scanner** — označí maily s trackermi priamo v inbox zozname, ešte pred otvorením
- **Banner v Gmail** — "3 trackery zablokované (Mailchimp, HubSpot)"
- **Dashboard** — štatistiky dnes / týždeň / mesiac, top trackery
- **SK + EN** lokalizácia
- **Žiadne dáta neopúšťajú prehliadač** (okrem DNS lookupov pre CNAME detekciu)

## Inštalácia (development)

```bash
# Klonovanie
git clone https://github.com/jakubnovak3/sleduju-ta.git
cd sleduju-ta

# Inštalácia závislostí
npm install

# Development build s hot reload
npm run dev

# Production build
npm run build

# Testy
npm test
```

### Načítanie do Chrome

1. Otvorte `chrome://extensions/`
2. Zapnite **Developer mode**
3. Kliknite **Load unpacked**
4. Vyberte priečinok `dist/`

## Ako funguje detekcia?

```
Email otvorený v Gmail
  │
  ├─ 1. Known list ──── "list-manage.com" → Mailchimp ✓
  ├─ 2. Heuristika ──── 1x1px, hidden, opacity:0 → tracker ✓
  ├─ 3. URL patterns ── /track/open, /pixel.gif → tracker ✓
  ├─ 4. CSS tracking ── background-image:url(tracker) → tracker ✓
  ├─ 5. Font tracking ─ @font-face src:url(tracker) → tracker ✓
  ├─ 6. CNAME check ─── track.firma.sk → CNAME → hubspot.com ✓
  └─ 7. Link cleaning ─ ?utm_source=...&fbclid=... → odstránené ✓
```

## Tech stack

- TypeScript
- Vite + CRXJS (Chrome Extension tooling)
- Preact (popup UI, 3KB gzip)
- Vitest (testy)
- Chrome Manifest V3
- DNS-over-HTTPS (Cloudflare) pre CNAME resolution

## Licencia

[Business Source License 1.1](LICENSE)

- **Free:** pre jednotlivcov a firmy s obratom do 500 000 EUR/rok
- **Platená licencia:** pre firmy s obratom nad 500 000 EUR/rok
- Po 3 rokoch sa každá verzia stáva plne open-source (Apache 2.0)

## Prispievanie

Príspevky sú vítané! Otvorte issue alebo pull request.

## Autor

**Jakub Novák**

- Web: [jakubnovak.dev](https://jakubnovak.dev)
- LinkedIn: [jakubnovak3](https://www.linkedin.com/in/jakubnovak3/)

---

Vyrobené na Slovensku.
