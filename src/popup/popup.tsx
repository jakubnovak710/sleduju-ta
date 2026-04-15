import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  ShieldCheck,
  Lock,
  Globe,
  CalendarDays,
  CalendarRange,
  EyeOff,
  ExternalLink,
} from 'lucide-preact';
import type { StatsResponse, DailyStats } from '../shared/types';

function TopTrackers({ trackers }: { trackers: Record<string, number> }) {
  const sorted = Object.entries(trackers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div class="tracker-list">
      <h2>Top trackery</h2>
      {sorted.map(([name, count]) => (
        <div class="tracker-item" key={name}>
          <span class="tracker-name">{name}</span>
          <span class="tracker-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'get-stats' }, (response: StatsResponse) => {
      if (response) {
        setStats(response);
        setEnabled(response.enabled);
      }
    });
  }, []);

  const toggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    chrome.runtime.sendMessage({ type: 'toggle-enabled', enabled: newEnabled });
  };

  const today: DailyStats = stats?.today || { blocked: 0, emails: 0, trackers: {} };
  const week: DailyStats = stats?.week || { blocked: 0, emails: 0, trackers: {} };
  const month: DailyStats = stats?.month || { blocked: 0, emails: 0, trackers: {} };

  return (
    <div>
      <div class="header">
        <ShieldCheck class="header-icon" size={32} color="white" strokeWidth={2} />
        <div>
          <h1>Sledujú Ťa!</h1>
          <div class="subtitle">
            <EyeOff size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Ochrana emailového súkromia
          </div>
        </div>
      </div>

      <div class="stats-card">
        <h2>Dnes</h2>
        {today.blocked > 0 ? (
          <>
            <div class="big-number">
              {today.blocked}
              <span class="unit">
                {today.blocked === 1 ? 'tracker' : today.blocked < 5 ? 'trackery' : 'trackerov'}
              </span>
            </div>
            <div class="emails-count">
              v {today.emails} {today.emails === 1 ? 'maili' : today.emails < 5 ? 'mailoch' : 'mailoch'}
            </div>
          </>
        ) : (
          <div class="empty-state">
            <Lock size={32} color="#5f6368" strokeWidth={1.5} />
            <div style={{ marginTop: '8px' }}>Zatiaľ žiadne trackery zablokované</div>
          </div>
        )}
      </div>

      <TopTrackers trackers={month.trackers} />

      <div class="period-stats">
        <div class="period-stat">
          <CalendarDays size={16} color="#5f6368" style={{ marginBottom: '4px' }} />
          <div class="number">{week.blocked}</div>
          <div class="label">tento týždeň</div>
        </div>
        <div class="period-stat">
          <CalendarRange size={16} color="#5f6368" style={{ marginBottom: '4px' }} />
          <div class="number">{month.blocked}</div>
          <div class="label">tento mesiac</div>
        </div>
      </div>

      <div class="footer">
        <label class="toggle-container">
          <div class="toggle">
            <input type="checkbox" checked={enabled} onChange={toggleEnabled} />
            <span class="toggle-slider" />
          </div>
          {enabled ? 'Zapnuté' : 'Vypnuté'}
        </label>
      </div>

      <div class="author-bar">
        <span>Vyrobil <a href="https://jakubnovak.dev" target="_blank" rel="noopener">Jakub Novák</a></span>
        <span class="author-links">
          <a href="https://jakubnovak.dev" target="_blank" rel="noopener" title="Web">
            <Globe size={14} color="#5f6368" />
          </a>
          <a href="https://www.linkedin.com/in/jakubnovak3/" target="_blank" rel="noopener" title="LinkedIn">
            <ExternalLink size={14} color="#5f6368" />
          </a>
        </span>
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
