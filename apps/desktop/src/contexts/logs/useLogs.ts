import { useContext } from 'react';
import { LogsContext } from './LogsProvider';

export function useLogs() {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
}
