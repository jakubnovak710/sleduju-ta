export interface TrackerMatch {
  tracker: string;
  domain: string;
  method: 'known' | 'heuristic' | 'pattern';
  element: HTMLImageElement;
}

export interface TrackerEvent {
  timestamp: number;
  tracker: string;
  domain: string;
  emailSubject: string;
  sender: string;
}

export interface DailyStats {
  blocked: number;
  emails: number;
  trackers: Record<string, number>;
}

export interface StorageSchema {
  enabled: boolean;
  whitelist: string[];
  showBanner: boolean;
  language: 'sk' | 'en';
  events: TrackerEvent[];
  dailyStats: Record<string, DailyStats>;
}

export const DEFAULT_STORAGE: StorageSchema = {
  enabled: true,
  whitelist: [],
  showBanner: true,
  language: 'sk',
  events: [],
  dailyStats: {},
};

export interface BlockedMessage {
  type: 'tracker-blocked';
  trackers: Array<{
    tracker: string;
    domain: string;
    method: string;
  }>;
  emailSubject: string;
  sender: string;
}

export interface StatsRequest {
  type: 'get-stats';
}

export interface StatsResponse {
  today: DailyStats;
  week: DailyStats;
  month: DailyStats;
  enabled: boolean;
}

export interface ToggleMessage {
  type: 'toggle-enabled';
  enabled: boolean;
}

export type Message = BlockedMessage | StatsRequest | ToggleMessage;
