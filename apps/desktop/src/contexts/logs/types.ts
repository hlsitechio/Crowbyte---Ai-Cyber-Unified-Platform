export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'system';
export type LogTag = 'auth' | 'api' | 'navigation' | 'database' | 'security' | 'user' | 'system' | 'network' | 'ai' | 'terminal' | 'settings';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  tag: LogTag;
  action: string;
  details?: string;
  user?: string;
}

export interface LogsContextType {
  logs: LogEntry[];
  addLog: (level: LogLevel, tag: LogTag, action: string, details?: string) => void;
  clearLogs: () => void;
  getFilteredLogs: (tag?: LogTag, level?: LogLevel) => LogEntry[];
  unreadErrorCount: number;
  markErrorsAsRead: () => void;
}
