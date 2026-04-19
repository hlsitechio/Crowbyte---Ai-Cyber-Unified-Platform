import { createContext, useState, useEffect } from 'react';
import { loggingService } from '@/services/logging';
import { LogLevel, LogTag, LogEntry, LogsContextType } from './types';

// eslint-disable-next-line react-refresh/only-export-components
export const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(loggingService.getLogs());
  const [unreadErrorCount, setUnreadErrorCount] = useState<number>(loggingService.getUnreadErrorCount());

  // Subscribe to logging service updates
  useEffect(() => {
    const unsubscribe = loggingService.subscribe(() => {
      setLogs(loggingService.getLogs());
    });

    return unsubscribe;
  }, []);

  // Subscribe to error count updates
  useEffect(() => {
    const unsubscribe = loggingService.subscribeToErrorCount((count) => {
      setUnreadErrorCount(count);
    });

    return unsubscribe;
  }, []);

  const addLog = (level: LogLevel, tag: LogTag, action: string, details?: string) => {
    loggingService.addLog(level, tag, action, details);
  };

  const clearLogs = () => {
    loggingService.clearLogs();
    setLogs([]);
  };

  const markErrorsAsRead = () => {
    loggingService.markErrorsAsRead();
  };

  const getFilteredLogs = (tag?: LogTag, level?: LogLevel): LogEntry[] => {
    return logs.filter((log) => {
      const tagMatch = !tag || log.tag === tag;
      const levelMatch = !level || log.level === level;
      return tagMatch && levelMatch;
    });
  };

  return (
    <LogsContext.Provider value={{ logs, addLog, clearLogs, getFilteredLogs, unreadErrorCount, markErrorsAsRead }}>
      {children}
    </LogsContext.Provider>
  );
}
