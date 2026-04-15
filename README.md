# Sledujú Ťa!

**Keď otvoríte email, odosielateľ sa to dozvie. My to zastavíme.**

Chrome rozšírenie, ktoré odhalí a zablokuje skryté tracking pixely vo vašich Gmail mailoch. Uvidíte kto vás sleduje — ešte pred otvorením správy.

## Ako to funguje?

Väčšina marketingových emailov obsahuje neviditeľný obrázok (1x1 pixel). Keď mail otvoríte, obrázok sa načíta a odosielateľ vie:

- Kedy ste mail otvorili (presný čas, koľkokrát)
- Kde sa nachádzate (IP adresa = mesto, krajina)
- Aké zariadenie používate (prehliadač, OS, veľkosť obrazovky)

**Sledujú Ťa!** tieto pixely nájde a zablokuje pred ich načítaním.

## Čo nás odlišuje od konkurencie?

| | Sledujú Ťa! | PixelBlock | Ugly Email | Trocker |
|---|:---:|:---:|:---:|:---:|
| Čítanie skutočného obsahu emailu | **Áno** | Nie | Áno | Nie |
| Detekcia pred otvorením mailu | **Áno** | Nie | Áno | Nie |
| Blokovanie tracking pixelov | **Áno** | Áno | Nie | Áno |
| Čistenie tracking odkazov (UTM, fbclid) | **Áno** | Nie | Nie | Čiastočne |
| CNAME uncloaking | **Áno** | Nie | Nie | Nie |
| Vizuálne označenie v inbox zozname | **Áno** | Nie | Áno | Nie |
| Banner s detailami v otvorenom maili | **Áno** | Čiastočne | Nie | Áno |
| Štatistický dashboard | **Áno** | Nie | Nie | Nie |
| Open source | **Áno** | Nie | Áno | Áno |
| Slovenčina | **Áno** | Nie | Nie | Nie |

### Konkrétne výhody:

**1. Čítame skutočný obsah emailu**
Namiesto hádania podľa mena odosielateľa, rozšírenie prečíta HTML každého mailu a hľadá v ňom tracking pixely. Presne tak, ako by ste si pozreli zdrojový kód — ale automaticky.

**2. Fungujeme aj keď trackery maskujú svoju identitu**
Niektoré firmy skrývajú tracking za vlastnú doménu (napr. `track.mojafirma.sk` ukazuje na HubSpot). Pomocou DNS lookupu odhalíme aj tieto skryté trackery.

**3. Čistíme aj sledovacie parametre v odkazoch**
Každý odkaz v newslettri obsahuje parametre ako `?utm_source=...&fbclid=...`. Tieto parametre identifikujú práve vás. Automaticky ich odstraňujeme.

**4. Učíme sa s každým mailom**
Keď rozšírenie nájde tracker v maile, zapamätá si odosielateľa. Pri ďalšom načítaní inboxu sú všetky maily od tohto odosielateľa okamžite označené.

**5. Všetko beží vo vašom prehliadači**
Žiadne dáta neopúšťajú váš počítač. Žiadny server, žiadne konto, žiadne predplatné. Kód je verejný — môžete si overiť čo rozšírenie robí.

## Funkcie

- **Detekcia trackerov** — 200+ známych služieb + heuristická analýza neznámych
- **Inbox indikátor** — červené označenie pri mailoch s trackermi ešte pred otvorením
- **Banner v maili** — "3 trackery zablokované (Mailchimp, HubSpot)" s detailami a možnosťou povolenia
- **Link cleaning** — automatické čistenie UTM, fbclid, gclid a 16+ tracking parametrov
- **Dashboard** — štatistiky: koľko trackerov, od koho, za aké obdobie
- **SK + EN** lokalizácia

## Inštalácia

### Z Chrome Web Store
*(čoskoro)*

### Development build

```bash
git clone https://github.com/jakubnovak710/sleduju-ta.git
cd sleduju-ta
npm install
npm run build
```

1. Otvorte `chrome://extensions/`
2. Zapnite **Developer mode**
3. Kliknite **Load unpacked**
4. Vyberte priečinok `dist/`

## Ako funguje detekcia?

```
Email príde do Gmail
  │
  ├─ PRED OTVORENÍM (inbox)
  │   ├─ gmail.js číta raw HTML emailu
  │   ├─ Hľadá tracking pixely v skutočnom obsahu
  │   └─ Označí mail červeným prúžkom
  │
  └─ PO OTVORENÍ (v maili)
      ├─ 1. Known list ──── "list-manage.com" → Mailchimp
      ├─ 2. Heuristika ──── 1x1px, hidden, opacity:0
      ├─ 3. URL patterns ── /track/open, /pixel.gif
      ├─ 4. CSS tracking ── background-image:url(tracker)
      ├─ 5. CNAME check ─── track.firma.sk → hubspot.com
      └─ 6. Link cleaning ─ ?utm_source=...&fbclid=... → vyčistené
```

## Tech stack

- TypeScript, Vite + CRXJS, Preact, Vitest
- gmail.js pre prístup k email obsahu
- Chrome Manifest V3
- DNS-over-HTTPS (Cloudflare) pre CNAME resolution

## Licencia

[Business Source License 1.1](LICENSE)

- **Free:** pre jednotlivcov a firmy s obratom do 500 000 EUR/rok
- **Platená licencia:** pre firmy s obratom nad 500 000 EUR/rok
- Po 3 rokoch sa každá verzia stáva plne open-source (Apache 2.0)

## Autor

**Jakub Novák**
- [jakubnovak.dev](https://jakubnovak.dev)
- [LinkedIn](https://www.linkedin.com/in/jakubnovak3/)

---

Vyrobené na Slovensku.
