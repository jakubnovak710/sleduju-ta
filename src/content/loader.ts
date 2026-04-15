/**
 * Loader content script — injektuje gmail-scanner.js do page contextu
 * a prijíma výsledky cez window.postMessage.
 */

// Injektujeme page script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('gmail-scanner.js');
script.type = 'module';
(document.head || document.documentElement).appendChild(script);

// Prijímame výsledky z page scriptu
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data?.type === 'sleduju-ta-ready') {
    console.log('[Sledujú Ťa!] gmail.js scanner ready');
  }

  if (event.data?.type === 'sleduju-ta-scan-result') {
    const { emailId, tracker, from } = event.data;

    if (tracker) {
      console.log(`[Sledujú Ťa!] Tracker found: ${tracker} in email from ${from}`);

      // Označíme riadok v inbox
      markRowByThreadId(emailId, tracker);

      // Uložíme odosielateľa pre budúce inbox scany
      if (from) {
        saveTrackerSender(from, tracker);
      }
    }
  }
});

/**
 * Nájde inbox riadok podľa thread ID a pridá tracker atribút.
 */
function markRowByThreadId(threadId: string, tracker: string): void {
  // Hľadáme riadok s matching thread ID
  const rows = document.querySelectorAll('tr.zA');
  for (const row of rows) {
    const rowThreadId = row.getAttribute('data-legacy-thread-id') || '';
    if (rowThreadId === threadId) {
      row.setAttribute('data-sleduju-ta-tracked', tracker);
      return;
    }
  }

  // Fallback: uložíme do mapy pre neskoršie matchovanie
  pendingMarks.set(threadId, tracker);
}

const pendingMarks = new Map<string, string>();

// Periodicky aplikujeme pending marks (pre riadky ktoré ešte neexistovali)
setInterval(() => {
  if (pendingMarks.size === 0) return;
  const rows = document.querySelectorAll('tr.zA');
  for (const row of rows) {
    const threadId = row.getAttribute('data-legacy-thread-id') || '';
    if (threadId && pendingMarks.has(threadId)) {
      row.setAttribute('data-sleduju-ta-tracked', pendingMarks.get(threadId)!);
      pendingMarks.delete(threadId);
    }
  }
}, 1000);

/**
 * Uloží odosielateľa do storage pre inbox scanner.
 */
async function saveTrackerSender(email: string, tracker: string): Promise<void> {
  try {
    const key = 'knownTrackerSenders';
    const result = await chrome.storage.local.get(key);
    const senders: Record<string, string> = result[key] || {};

    let changed = false;

    if (!senders[email]) {
      senders[email] = tracker;
      changed = true;
    }

    const atIdx = email.indexOf('@');
    if (atIdx > -1) {
      const domainKey = email.substring(atIdx);
      if (!senders[domainKey]) {
        senders[domainKey] = tracker;
        changed = true;
      }
    }

    if (changed) {
      await chrome.storage.local.set({ [key]: senders });
    }
  } catch { /* storage error */ }
}
