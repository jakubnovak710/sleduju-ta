import { KNOWN_TRACKERS } from './tracker-db';

const cnameCache = new Map<string, string | null>();
const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';

/**
 * Resolvuje CNAME záznamy pre doménu cez DNS-over-HTTPS (Cloudflare).
 * Používa sa na detekciu CNAME cloaking — keď firma nastaví
 * napr. track.firma.sk ako CNAME na hubspot.com.
 *
 * Vráti názov trackera ak CNAME ukazuje na známu tracking doménu, inak null.
 * Výsledky sú cachované.
 */
export async function resolveCname(hostname: string): Promise<string | null> {
  if (cnameCache.has(hostname)) {
    return cnameCache.get(hostname)!;
  }

  try {
    const response = await fetch(
      `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=CNAME`,
      {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!response.ok) {
      cnameCache.set(hostname, null);
      return null;
    }

    const data = await response.json() as {
      Answer?: Array<{ type: number; data: string }>;
    };

    if (!data.Answer || data.Answer.length === 0) {
      cnameCache.set(hostname, null);
      return null;
    }

    // Skontrolujeme CNAME záznamy (type 5) proti known tracker databáze
    for (const answer of data.Answer) {
      if (answer.type !== 5) continue; // 5 = CNAME
      const cnameTarget = answer.data.toLowerCase().replace(/\.$/, '');

      for (const [domain, tracker] of Object.entries(KNOWN_TRACKERS)) {
        if (cnameTarget === domain || cnameTarget.endsWith('.' + domain)) {
          cnameCache.set(hostname, tracker);
          return tracker;
        }
      }

      // Rekurzívne resolvujeme (CNAME chain max 3 úrovne)
      if (!cnameCache.has(cnameTarget)) {
        const nested = await resolveCname(cnameTarget);
        if (nested) {
          cnameCache.set(hostname, nested);
          return nested;
        }
      }
    }

    cnameCache.set(hostname, null);
    return null;
  } catch {
    cnameCache.set(hostname, null);
    return null;
  }
}

/**
 * Vyčistí CNAME cache (pre testy).
 */
export function clearCnameCache(): void {
  cnameCache.clear();
}
