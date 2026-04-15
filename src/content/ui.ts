import type { TrackerMatch } from '../shared/types';

const BANNER_ID = 'sledujata-banner';
const DETAIL_ID = 'sledujata-detail';

/**
 * Vytvorí štýlované tlačidlo.
 */
function createButton(label: string, style: 'primary' | 'secondary'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    background: style === 'primary' ? '#1a73e8' : 'transparent',
    color: style === 'primary' ? 'white' : '#1a73e8',
    border: style === 'primary' ? 'none' : '1px solid #d2e3fc',
    borderRadius: '16px',
    padding: '4px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  });
  return btn;
}

/**
 * Vytvorí a zobrazí banner v Gmail s informáciou o zablokovaných trackeroch.
 */
export function showBanner(matches: TrackerMatch[], emailBody: Element): void {
  removeBanner();

  const uniqueTrackers = [...new Set(matches.map((m) => m.tracker))];
  const count = matches.length;

  // Hlavný kontajner
  const wrapper = document.createElement('div');
  wrapper.id = BANNER_ID;
  Object.assign(wrapper.style, {
    marginBottom: '8px',
    fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
  });

  // Banner riadok
  const banner = document.createElement('div');
  Object.assign(banner.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#e8f0fe',
    border: '1px solid #d2e3fc',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1a73e8',
    lineHeight: '20px',
  });

  // ShieldCheck ikona
  const icon = document.createElement('span');
  icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .6-.92l7-3.11a1 1 0 0 1 .8 0l7 3.11a1 1 0 0 1 .6.92z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>`;
  icon.style.display = 'flex';
  icon.style.flexShrink = '0';

  // Text
  const text = document.createElement('span');
  text.style.flex = '1';
  const trackerNames = uniqueTrackers.slice(0, 3).join(', ');
  const suffix = uniqueTrackers.length > 3 ? ` +${uniqueTrackers.length - 3}` : '';
  text.textContent = `${count} ${count === 1 ? 'tracker zablokovaný' : count < 5 ? 'trackery zablokované' : 'trackerov zablokovaných'} (${trackerNames}${suffix})`;

  // Tlačidlá
  const btnRow = document.createElement('span');
  Object.assign(btnRow.style, { display: 'flex', gap: '6px', flexShrink: '0' });

  // "Detaily" tlačidlo
  const detailBtn = createButton('Detaily', 'secondary');
  detailBtn.addEventListener('click', () => toggleDetail(wrapper, matches));

  // "Povoliť" tlačidlo — znovu načíta zablokované obrázky
  const allowBtn = createButton('Povoliť', 'secondary');
  allowBtn.addEventListener('click', () => {
    unblockTrackers(matches);
    removeBanner();
  });

  // X tlačidlo
  const dismiss = document.createElement('button');
  dismiss.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  Object.assign(dismiss.style, {
    background: 'none', border: 'none', color: '#1a73e8',
    cursor: 'pointer', padding: '0 2px', lineHeight: '1', flexShrink: '0', display: 'flex',
  });
  dismiss.addEventListener('click', removeBanner);

  btnRow.appendChild(detailBtn);
  btnRow.appendChild(allowBtn);

  banner.appendChild(icon);
  banner.appendChild(text);
  banner.appendChild(btnRow);
  banner.appendChild(dismiss);
  wrapper.appendChild(banner);

  emailBody.parentElement?.insertBefore(wrapper, emailBody);
}

/**
 * Zobrazí/skryje detail panel s informáciami o trackeroch.
 */
function toggleDetail(wrapper: HTMLElement, matches: TrackerMatch[]): void {
  const existing = document.getElementById(DETAIL_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const detail = document.createElement('div');
  detail.id = DETAIL_ID;
  Object.assign(detail.style, {
    padding: '10px 12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e8eaed',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    fontSize: '12px',
    color: '#5f6368',
    lineHeight: '18px',
  });

  // Deduplikujeme trackery a zobrazíme detaily
  const grouped = new Map<string, { count: number; method: string; domains: Set<string> }>();
  for (const m of matches) {
    const key = m.tracker;
    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, method: m.method, domains: new Set() });
    }
    const g = grouped.get(key)!;
    g.count++;
    if (m.domain) g.domains.add(m.domain);
  }

  const methodLabels: Record<string, string> = {
    known: 'Známy tracker',
    heuristic: 'Heuristika',
    pattern: 'URL pattern',
  };

  for (const [tracker, info] of grouped) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0', borderBottom: '1px solid #e8eaed',
    });

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.style.fontWeight = '500';
    name.style.color = '#202124';
    name.textContent = tracker;
    left.appendChild(name);

    if (info.domains.size > 0) {
      const domainText = document.createElement('div');
      domainText.style.fontSize = '11px';
      domainText.textContent = [...info.domains].join(', ');
      left.appendChild(domainText);
    }

    const right = document.createElement('div');
    right.style.textAlign = 'right';
    right.style.fontSize = '11px';

    const badge = document.createElement('span');
    Object.assign(badge.style, {
      background: info.method === 'known' ? '#e8f0fe' : info.method === 'heuristic' ? '#fef7e0' : '#e6f4ea',
      color: info.method === 'known' ? '#1a73e8' : info.method === 'heuristic' ? '#e37400' : '#137333',
      padding: '1px 6px', borderRadius: '8px', fontSize: '10px',
    });
    badge.textContent = methodLabels[info.method] || info.method;
    right.appendChild(badge);

    if (info.count > 1) {
      const countEl = document.createElement('div');
      countEl.textContent = `${info.count}x`;
      countEl.style.color = '#5f6368';
      right.appendChild(countEl);
    }

    row.appendChild(left);
    row.appendChild(right);
    detail.appendChild(row);
  }

  // Vysvetlenie
  const footer = document.createElement('div');
  Object.assign(footer.style, { marginTop: '8px', fontSize: '11px', color: '#80868b' });
  footer.textContent = 'Ak sa email nezobrazuje správne, kliknite "Povoliť" pre načítanie zablokovaných obrázkov.';
  detail.appendChild(footer);

  wrapper.appendChild(detail);
}

/**
 * Odblokuje trackery — obnoví pôvodné src URL.
 */
function unblockTrackers(matches: TrackerMatch[]): void {
  for (const match of matches) {
    const el = match.element;
    const originalSrc = el.getAttribute('data-sledujata-original-src');
    if (originalSrc) {
      el.setAttribute('src', originalSrc);
      el.removeAttribute('data-sledujata-blocked');
      el.removeAttribute('data-sledujata-original-src');
    }
  }
}

/**
 * Odstráni existujúci banner.
 */
export function removeBanner(): void {
  const existing = document.getElementById(BANNER_ID);
  existing?.remove();
}
