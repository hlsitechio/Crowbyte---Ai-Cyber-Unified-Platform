/**
 * Timezone Service — Central timezone/locale management
 * Auto-detects from browser on first boot, persists to localStorage,
 * syncs across all widgets via a custom event.
 */

const TZ_KEY = "crowbyte-user-timezone";
const LOCALE_KEY = "crowbyte-user-locale";
const EVENT_NAME = "crowbyte-timezone-changed";

export interface TimezoneInfo {
  timezone: string;
  locale: string;
  detectedFrom: "auto" | "manual";
}

/** All IANA timezones grouped by region */
export const TIMEZONE_REGIONS: Record<string, { label: string; tz: string }[]> = {
  "Americas": [
    { label: "Hawaii (HST)", tz: "Pacific/Honolulu" },
    { label: "Alaska (AKST)", tz: "America/Anchorage" },
    { label: "Los Angeles (PST)", tz: "America/Los_Angeles" },
    { label: "Denver (MST)", tz: "America/Denver" },
    { label: "Chicago (CST)", tz: "America/Chicago" },
    { label: "New York (EST)", tz: "America/New_York" },
    { label: "Toronto (EST)", tz: "America/Toronto" },
    { label: "Sao Paulo (BRT)", tz: "America/Sao_Paulo" },
    { label: "Buenos Aires (ART)", tz: "America/Argentina/Buenos_Aires" },
    { label: "Mexico City (CST)", tz: "America/Mexico_City" },
    { label: "Bogota (COT)", tz: "America/Bogota" },
  ],
  "Europe": [
    { label: "London (GMT)", tz: "Europe/London" },
    { label: "Paris (CET)", tz: "Europe/Paris" },
    { label: "Berlin (CET)", tz: "Europe/Berlin" },
    { label: "Amsterdam (CET)", tz: "Europe/Amsterdam" },
    { label: "Madrid (CET)", tz: "Europe/Madrid" },
    { label: "Rome (CET)", tz: "Europe/Rome" },
    { label: "Moscow (MSK)", tz: "Europe/Moscow" },
    { label: "Istanbul (TRT)", tz: "Europe/Istanbul" },
    { label: "Warsaw (CET)", tz: "Europe/Warsaw" },
    { label: "Bucharest (EET)", tz: "Europe/Bucharest" },
  ],
  "Asia & Pacific": [
    { label: "Dubai (GST)", tz: "Asia/Dubai" },
    { label: "Mumbai (IST)", tz: "Asia/Kolkata" },
    { label: "Bangkok (ICT)", tz: "Asia/Bangkok" },
    { label: "Singapore (SGT)", tz: "Asia/Singapore" },
    { label: "Hong Kong (HKT)", tz: "Asia/Hong_Kong" },
    { label: "Shanghai (CST)", tz: "Asia/Shanghai" },
    { label: "Tokyo (JST)", tz: "Asia/Tokyo" },
    { label: "Seoul (KST)", tz: "Asia/Seoul" },
    { label: "Sydney (AEST)", tz: "Australia/Sydney" },
    { label: "Auckland (NZST)", tz: "Pacific/Auckland" },
  ],
  "Africa & Middle East": [
    { label: "Cairo (EET)", tz: "Africa/Cairo" },
    { label: "Lagos (WAT)", tz: "Africa/Lagos" },
    { label: "Johannesburg (SAST)", tz: "Africa/Johannesburg" },
    { label: "Nairobi (EAT)", tz: "Africa/Nairobi" },
    { label: "Casablanca (WET)", tz: "Africa/Casablanca" },
    { label: "Riyadh (AST)", tz: "Asia/Riyadh" },
    { label: "Tehran (IRST)", tz: "Asia/Tehran" },
    { label: "Jerusalem (IST)", tz: "Asia/Jerusalem" },
  ],
  "Other": [
    { label: "UTC", tz: "UTC" },
  ],
};

/** Flat list of all timezones */
export const ALL_TIMEZONES = Object.values(TIMEZONE_REGIONS).flat();

/** Auto-detect timezone from browser */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Auto-detect locale from browser */
function detectLocale(): string {
  try {
    return navigator.language || "en-US";
  } catch {
    return "en-US";
  }
}

/** Get the user's timezone (auto-detect on first boot) */
export function getUserTimezone(): string {
  const stored = localStorage.getItem(TZ_KEY);
  if (stored) return stored;
  // First boot — auto-detect and save
  const detected = detectTimezone();
  localStorage.setItem(TZ_KEY, detected);
  return detected;
}

/** Get the user's locale */
export function getUserLocale(): string {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored) return stored;
  const detected = detectLocale();
  localStorage.setItem(LOCALE_KEY, detected);
  return detected;
}

/** Set user timezone (from settings) */
export function setUserTimezone(tz: string) {
  localStorage.setItem(TZ_KEY, tz);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { timezone: tz } }));
}

/** Set user locale */
export function setUserLocale(locale: string) {
  localStorage.setItem(LOCALE_KEY, locale);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { locale } }));
}

/** Get detected info */
export function getTimezoneInfo(): TimezoneInfo {
  const stored = localStorage.getItem(TZ_KEY);
  const detected = detectTimezone();
  return {
    timezone: stored || detected,
    locale: getUserLocale(),
    detectedFrom: stored && stored !== detected ? "manual" : "auto",
  };
}

/** Get human-readable label for a timezone */
export function getTimezoneLabel(tz: string): string {
  const found = ALL_TIMEZONES.find(t => t.tz === tz);
  return found?.label || tz;
}

/** Subscribe to timezone changes */
export function onTimezoneChange(callback: (tz: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.timezone) callback(detail.timezone);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
