import { loggingService } from '@/services/logging';
import { LogLevel, LogTag } from '@/contexts/logs';
import { toast } from 'sonner';

interface LogOptions {
  showToast?: boolean; // Override to force show toast
}

/**
 * Custom logging hook that replaces toast notifications
 * - All notifications are logged to the system logs
 * - Only critical errors show toast notifications by default
 * - Can be overridden with showToast option
 */
export function useLogger() {
  const log = (
    level: LogLevel,
    tag: LogTag,
    title: string,
    description?: string,
    options?: LogOptions
  ) => {
    // Always log to system
    loggingService.addLog(level, tag, title, description);

    // Show toast only for errors or if explicitly requested
    const shouldShowToast = options?.showToast || level === 'error';

    if (shouldShowToast) {
      switch (level) {
        case 'success':
          toast.success(title, { description });
          break;
        case 'error':
          toast.error(title, { description });
          break;
        case 'warning':
          toast.warning(title, { description });
          break;
        case 'info':
        case 'system':
          toast.info(title, { description });
          break;
      }
    }
  };

  return {
    // Convenience methods
    success: (tag: LogTag, title: string, description?: string, options?: LogOptions) =>
      log('success', tag, title, description, options),

    error: (tag: LogTag, title: string, description?: string, options?: LogOptions) =>
      log('error', tag, title, description, options),

    warning: (tag: LogTag, title: string, description?: string, options?: LogOptions) =>
      log('warning', tag, title, description, options),

    info: (tag: LogTag, title: string, description?: string, options?: LogOptions) =>
      log('info', tag, title, description, options),

    system: (tag: LogTag, title: string, description?: string, options?: LogOptions) =>
      log('system', tag, title, description, options),

    // Generic log method
    log,
  };
}
