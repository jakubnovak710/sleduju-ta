# Sledujata — Chrome Extension Design Spec

**Brand:** Sledujata
**Doména:** sledujata.online (~2€/rok)
**Tagline:** "Sledujú ťa. My ich zastavíme."

## Context

Emailové tracking pixely sú neviditeľné 1x1px obrázky vložené do mailov marketingovými nástrojmi (Mailchimp, HubSpot, SendGrid...). Keď otvoríte mail, obrázok sa načíta a odosielateľ vie kedy, kde a na akom zariadení ste mail otvorili — bez vášho súhlasu.

**Sledujata** je Chrome rozšírenie, ktoré tieto tracking pixely deteguje a blokuje. Cieľom je vytvoriť open-source slovenský privacy produkt s potenciálom na B2B monetizáciu.

## Ciele

- Blokovať tracking pixely v Gmail pred ich načítaním
- Ukázať používateľovi kto ho sleduje a koľko trackerov bolo zablokovaných
- Open-source s BSL licenciou (free do 500k€ obratu)
- Propagácia ako slovenská privacy aplikácia

## Cieľová skupina

- Primárne: Gmail používatelia na Slovensku a v Česku
- Sekundárne: globálni Gmail používatelia
- B2B: firmy do 500k€ obratu (free), nad 500k€ (platená licencia)

---

## Architektúra

### Manifest V3

Chrome Web Store vyžaduje Manifest V3. Rozšírenie používa:
- `content_scripts` — injektované do `mail.google.com`
- `service_worker` — background logika
- `action` — popup s dashboardom
- `storage` — lokálne ukladanie štatistík

### Štruktúra projektu

```
stop-tracking/
├── manifest.json
├── src/
│   ├── content/
│   │   ├── detector.ts      # Detekcia tracking pixelov
│   │   ├── blocker.ts       # Blokovanie/nahradenie obrázkov
│   │   └── ui.ts            # Banner v Gmail UI
│   ├── background/
│   │   └── service-worker.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── shared/
│   │   ├── tracker-db.ts    # Databáza známych tracking domén
│   │   └── types.ts
│   └── assets/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── _locales/
│   ├── sk/messages.json
│   └── en/messages.json
├── tests/
├── vite.config.ts
├── tsconfig.json
├── package.json
└── LICENSE                   # BSL 1.1
```

### Tok dát

1. Používateľ otvorí mail v Gmail
2. MutationObserver v content scripte deteguje otvorenie mailu
3. `detector.ts` skenuje `<img>` tagy v tele mailu
4. Detekcia prebieha na 3 vrstvách:
   - **Known list:** ~200 známych tracking domén
   - **Heuristika:** obrázky 1x1px, 0x0px, hidden, display:none
   - **URL patterns:** `/track`, `/open`, `/pixel`, `/beacon`, query params s identifikátormi
5. `blocker.ts` nahradí `src` atribút alebo odstráni element
6. `ui.ts` zobrazí banner: "2 trackery zablokované (Mailchimp, HubSpot)"
7. Message do service workera s detailami
8. Service worker uloží do `chrome.storage.local`
9. Popup zobrazí agregované štatistiky

---

## Detekcia tracking pixelov

### Known Tracking Domains (výber)

```typescript
const KNOWN_TRACKERS: Record<string, string> = {
  'list-manage.com': 'Mailchimp',
  'mailchimp.com': 'Mailchimp',
  't.hubspotemail.net': 'HubSpot',
  'track.hubspot.com': 'HubSpot',
  'sendgrid.net/wf/open': 'SendGrid',
  'links.mixmax.com': 'Mixmax',
  'mailtrack.io': 'Mailtrack',
  'streak.com': 'Streak',
  'yesware.com': 'Yesware',
  'bananatag.com': 'Bananatag',
  'getnotify.com': 'GetNotify',
  'supersend.com': 'Supersend',
  'salesforce.com': 'Salesforce',
  'marketo.com': 'Marketo',
  'pardot.com': 'Pardot',
  'constantcontact.com': 'Constant Contact',
  'campaign-archive.com': 'Mailchimp',
  'open.convertkit.com': 'ConvertKit',
  'pixel.monitor.return-path.net': 'Return Path',
  'sendinblue.com': 'Brevo',
  // ... ďalších ~180 domén
};
```

### Heuristické pravidlá

```typescript
function isTrackingPixel(img: HTMLImageElement): boolean {
  // Rozmer 1x1 alebo 0x0
  if ((img.width <= 1 && img.height <= 1) || 
      (img.naturalWidth <= 1 && img.naturalHeight <= 1)) return true;

  // Hidden cez CSS
  const style = getComputedStyle(img);
  if (style.display === 'none' || style.visibility === 'hidden' ||
      style.opacity === '0') return true;

  // Inline style width/height 1px
  if (img.style.width === '1px' || img.style.height === '1px') return true;

  return false;
}
```

### URL Pattern Matching

```typescript
const TRACKING_URL_PATTERNS = [
  /\/track(ing)?\/open/i,
  /\/pixel\//i,
  /\/beacon\//i,
  /\/wf\/open/i,
  /\/o\/[a-f0-9]{8,}/i,    // hash-based tracking IDs
  /[?&](utm_|mc_|_ke=)/i,  // tracking query params v obrázkoch
];
```

---

## UI/UX

### Gmail In-page Banner

Keď sa detegujú trackery v otvorenom maili:
- Tenký banner pod hlavičkou mailu (pred telom)
- Text: "🛡 2 trackery zablokované (Mailchimp, HubSpot)"
- Možnosť dismiss alebo "Zobraziť detaily"
- Farba: svetlo modrá/šedá, konzistentná s Gmail dizajnom

### Extension Badge

- Badge na ikone rozšírenia: číslo zablokovaných trackerov v aktuálnom maili
- Červená farba keď sú aktívne trackery, zelená keď čistý mail

### Popup Dashboard

```
┌─────────────────────────────────┐
│  🛡 Stop Tracking               │
│  ─────────────────────────────  │
│                                 │
│  Dnes zablokovaných:            │
│  ██████████████ 14 trackerov    │
│  v 8 mailoch                    │
│                                 │
│  Top trackery:                  │
│  ┌─────────────────────┬─────┐  │
│  │ Mailchimp           │  45 │  │
│  │ HubSpot             │  23 │  │
│  │ SendGrid            │  12 │  │
│  │ ConvertKit          │   8 │  │
│  └─────────────────────┴─────┘  │
│                                 │
│  Tento týždeň: 87 trackerov    │
│  Tento mesiac: 342 trackerov   │
│                                 │
│  [Zapnuté ✓]  [Nastavenia ⚙]  │
└─────────────────────────────────┘
```

### Nastavenia

- Zapnúť/vypnúť blokovanie
- Whitelist odosielateľov (napr. interné maily firmy)
- Zobraziť/skryť banner v Gmail
- Jazyk (SK/EN)

---

## Storage Model

```typescript
interface TrackerEvent {
  timestamp: number;
  tracker: string;       // napr. "Mailchimp"
  domain: string;        // napr. "list-manage.com"
  emailSubject: string;  // predmet mailu
  sender: string;        // odosielateľ
}

interface StorageSchema {
  enabled: boolean;
  whitelist: string[];           // whitelistované emaily/domény
  showBanner: boolean;
  language: 'sk' | 'en';
  events: TrackerEvent[];        // posledných 1000 eventov
  dailyStats: Record<string, {   // kľúč: "2026-04-15"
    blocked: number;
    emails: number;
    trackers: Record<string, number>;  // tracker -> count
  }>;
}
```

---

## Tech Stack

| Technológia | Účel |
|-------------|------|
| TypeScript | Jazyk |
| Vite + CRXJS | Build systém pre Chrome extensions |
| Preact | Popup UI (3KB gzip) |
| chrome.storage.local | Lokálne úložisko |
| Vitest | Unit testy |
| GitHub Actions | CI/CD |

### Prečo tieto voľby:
- **CRXJS** — Vite plugin špeciálne pre Chrome extensions, HMR pri vývoji
- **Preact** — React-kompatibilné API ale 3KB namiesto 40KB, ideálne pre popup
- **Žiadny backend** — všetko beží lokálne, žiadne dáta neopúšťajú prehliadač

---

## Licencia

### Business Source License 1.1 (BSL)

- **Free použitie:** jednotlivci a firmy s ročným obratom do 500 000€
- **Platená licencia:** firmy s obratom nad 500 000€
- **Change Date:** 3 roky od vydania verzie
- **Change License:** Apache 2.0 (po 3 rokoch sa stáva plne open-source)

---

## Monetizácia

### Fáza 1 (0-6 mesiacov) — Rast

- Plne zadarmo pre všetkých
- GitHub Sponsors / Buy Me a Coffee pre donácie
- Cieľ: 1000+ aktívnych používateľov

### Fáza 2 (6+ mesiacov) — Monetizácia

- B2B licencie pre firmy nad 500k€ obrat
- Premium funkcie: detailné reporty, CSV export, team dashboard
- Potenciálne: API/SaaS vrstva pre firemný manažment

### Go-to-Market

- Product Hunt launch
- Slovenské tech médiá (Živé.sk, StartitUp, Touchit)
- Reddit r/privacy, r/gmail
- Marketingový uhol: "Slovenská open-source appka na ochranu emailového súkromia"
- GDPR kontext — európska hodnota ochrany súkromia

---

## Fázy vývoja

### v1.0 — MVP (Content Script)

- Detekcia a blokovanie tracking pixelov cez Content Script
- Known tracker database (~200 domén)
- Heuristická detekcia (1x1px, hidden)
- Banner v Gmail
- Popup so štatistikami
- SK + EN lokalizácia

### v2.0 — Hybridné blokovanie

- Pridanie declarativeNetRequest pre sieťové blokovanie
- Rozšírenie tracker databázy
- Whitelist manažment
- Vylepšené štatistiky (grafy, trendy)

### v3.0 — B2B

- Team dashboard
- CSV/PDF export reportov
- Centrálna správa pre organizácie
- API pre integráciu

---

## Verifikácia

### Manuálne testovanie
1. Nainštalovať rozšírenie v Chrome (developer mode)
2. Otvoriť Gmail a mail od Mailchimp/HubSpot newsletteru
3. Overiť že sa zobrazí banner s informáciou o zablokovaných trackeroch
4. Overiť badge na ikone rozšírenia
5. Otvoriť popup a overiť štatistiky
6. Testovať whitelist — pridať odosielateľa, overiť že sa trackery neblokujú

### Automatické testy
- Unit testy pre `detector.ts` — správna detekcia known domén, heuristiky, URL patterns
- Unit testy pre `blocker.ts` — správne blokovanie/nahradenie obrázkov
- Unit testy pre storage logic
- Integration test: simulácia Gmail DOM s tracking pixelmi

### Chrome Web Store
- Prejsť review procesom (zvyčajne 1-3 dni)
- Overiť permissions sú minimálne a odôvodnené
