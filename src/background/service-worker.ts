import type { BlockedMessage, DailyStats, Message, StatsResponse, StorageSchema } from '../shared/types';
import { DEFAULT_STORAGE } from '../shared/types';

/**
 * Vráti dnešný dátum vo formáte YYYY-MM-DD.
 */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Vráti dátum pred N dňami vo formáte YYYY-MM-DD.
 */
function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Agreguje štatistiky za dané obdobie.
 */
function aggregateStats(dailyStats: Record<string, DailyStats>, fromKey: string, toKey: string): DailyStats {
  const result: DailyStats = { blocked: 0, emails: 0, trackers: {} };

  for (const [key, stats] of Object.entries(dailyStats)) {
    if (key >= fromKey && key <= toKey) {
      result.blocked += stats.blocked;
      result.emails += stats.emails;
      for (const [tracker, count] of Object.entries(stats.trackers)) {
        result.trackers[tracker] = (result.trackers[tracker] || 0) + count;
      }
    }
  }

  return result;
}

/**
 * Spracuje správu o zablokovaných trackeroch z content scriptu.
 */
async function handleBlockedMessage(msg: BlockedMessage): Promise<void> {
  let storage: StorageSchema;
  try {
    storage = await chrome.storage.local.get(null) as StorageSchema;
  } catch {
    // Quota exceeded pri čítaní — vyčistíme všetko
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ enabled: true });
    storage = { enabled: true, whitelist: [], showBanner: true, language: 'sk', events: [], dailyStats: {} };
  }
  const today = todayKey();

  // Inicializujeme denné štatistiky ak neexistujú
  if (!storage.dailyStats) storage.dailyStats = {};
  if (!storage.dailyStats[today]) {
    storage.dailyStats[today] = { blocked: 0, emails: 0, trackers: {} };
  }

  const dayStats = storage.dailyStats[today];
  dayStats.blocked += msg.trackers.length;
  dayStats.emails += 1;

  for (const t of msg.trackers) {
    dayStats.trackers[t.tracker] = (dayStats.trackers[t.tracker] || 0) + 1;
  }

  // Uložíme event (max 200 aby sme neprekročili storage quota)
  if (!storage.events) storage.events = [];
  const events = storage.events;
  for (const t of msg.trackers) {
    events.push({
      timestamp: Date.now(),
      tracker: t.tracker,
      domain: t.domain,
      emailSubject: msg.emailSubject,
      sender: msg.sender,
    });
  }
  if (events.length > 200) {
    events.splice(0, events.length - 200);
  }

  // Vyčistíme staré štatistiky (staršie ako 30 dní)
  const cutoff = daysAgoKey(30);
  for (const key of Object.keys(storage.dailyStats)) {
    if (key < cutoff) delete storage.dailyStats[key];
  }

  // Ukladáme oddelene aby sme neprekročili per-item quota
  try {
    await chrome.storage.local.set({ dailyStats: storage.dailyStats });
    await chrome.storage.local.set({ events });
  } catch (e) {
    // Ak stále prekračujeme quota, vyčistíme events
    console.warn('[Sledujú Ťa!] Storage quota exceeded, clearing events', e);
    await chrome.storage.local.set({ events: [] });
    await chrome.storage.local.set({ dailyStats: storage.dailyStats });
  }

  // Aktualizujeme badge
  await chrome.action.setBadgeText({ text: String(msg.trackers.length) });
  await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });

  // Badge zmizne po 5 sekundách
  setTimeout(async () => {
    await chrome.action.setBadgeText({ text: '' });
  }, 5000);
}

/**
 * Vráti agregované štatistiky pre popup.
 */
async function handleStatsRequest(): Promise<StatsResponse> {
  const storage = await chrome.storage.local.get(null) as StorageSchema;
  const today = todayKey();
  const weekAgo = daysAgoKey(7);
  const monthAgo = daysAgoKey(30);
  const dailyStats = storage.dailyStats || {};

  return {
    today: dailyStats[today] || { blocked: 0, emails: 0, trackers: {} },
    week: aggregateStats(dailyStats, weekAgo, today),
    month: aggregateStats(dailyStats, monthAgo, today),
    enabled: storage.enabled !== false, // default true
  };
}

// Listener pre správy z content scriptu a popupu
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'tracker-blocked') {
      handleBlockedMessage(message).then(() => sendResponse({ ok: true }));
      return true; // async response
    }

    if (message.type === 'get-stats') {
      handleStatsRequest().then(sendResponse);
      return true;
    }

    if (message.type === 'toggle-enabled') {
      chrome.storage.local.set({ enabled: message.enabled }).then(() => {
        sendResponse({ ok: true });
      });
      return true;
    }

    return false;
  },
);

// Inicializácia pri inštalácii — ukladáme po jednom kľúči aby sme neprekročili quota
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get('enabled');
  if (existing.enabled === undefined) {
    await chrome.storage.local.set({ enabled: DEFAULT_STORAGE.enabled });
    await chrome.storage.local.set({ whitelist: DEFAULT_STORAGE.whitelist });
    await chrome.storage.local.set({ showBanner: DEFAULT_STORAGE.showBanner });
    await chrome.storage.local.set({ language: DEFAULT_STORAGE.language });
    await chrome.storage.local.set({ events: DEFAULT_STORAGE.events });
    await chrome.storage.local.set({ dailyStats: DEFAULT_STORAGE.dailyStats });
  }
});
