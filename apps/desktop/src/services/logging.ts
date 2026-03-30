import { LogLevel, LogTag, LogEntry } from '@/contexts/logs';

type LogListener = (log: LogEntry) => void;
type ErrorCountListener = (count: number) => void;

class LoggingService {
  private listeners: LogListener[] = [];
  private errorCountListeners: ErrorCountListener[] = [];
  private logs: LogEntry[] = [];
  private unreadErrorCount: number = 0;
  private readonly LOGS_STORAGE_KEY = 'ghost_ai_logs';
  private readonly UNREAD_ERRORS_KEY = 'ghost_ai_unread_errors';
  private readonly MAX_LOGS = 1000;

  constructor() {
    this.loadLogs();
    this.loadUnreadErrorCount();
  }

  private loadLogs() {
    try {
      const storedLogs = localStorage.getItem(this.LOGS_STORAGE_KEY);
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(this.LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  private loadUnreadErrorCount() {
    try {
      const stored = localStorage.getItem(this.UNREAD_ERRORS_KEY);
      this.unreadErrorCount = stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Failed to load unread error count:', error);
      this.unreadErrorCount = 0;
    }
  }

  private saveUnreadErrorCount() {
    try {
      localStorage.setItem(this.UNREAD_ERRORS_KEY, this.unreadErrorCount.toString());
      this.notifyErrorCountListeners();
    } catch (error) {
      console.error('Failed to save unread error count:', error);
    }
  }

  private notifyErrorCountListeners() {
    this.errorCountListeners.forEach((listener) => listener(this.unreadErrorCount));
  }

  addLog(level: LogLevel, tag: LogTag, action: string, details?: string) {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      tag,
      action,
      details,
    };

    this.logs = [newLog, ...this.logs].slice(0, this.MAX_LOGS);
    this.saveLogs();

    // Increment unread error count for errors
    if (level === 'error') {
      this.unreadErrorCount++;
      this.saveUnreadErrorCount();
    }

    // Notify all listeners
    this.listeners.forEach((listener) => listener(newLog));
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getUnreadErrorCount(): number {
    return this.unreadErrorCount;
  }

  markErrorsAsRead() {
    this.unreadErrorCount = 0;
    this.saveUnreadErrorCount();
  }

  clearLogs() {
    this.logs = [];
    this.unreadErrorCount = 0;
    localStorage.removeItem(this.LOGS_STORAGE_KEY);
    localStorage.removeItem(this.UNREAD_ERRORS_KEY);
    this.saveUnreadErrorCount();
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  subscribeToErrorCount(listener: ErrorCountListener): () => void {
    this.errorCountListeners.push(listener);
    // Immediately notify with current count
    listener(this.unreadErrorCount);
    return () => {
      this.errorCountListeners = this.errorCountListeners.filter((l) => l !== listener);
    };
  }
}

export const loggingService = new LoggingService();
