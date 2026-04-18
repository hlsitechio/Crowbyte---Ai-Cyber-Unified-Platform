/**
 * safeRedirect — validates a URL before navigating.
 * Blocks javascript:, data:, vbscript:, and other non-HTTP schemes.
 * Only allows https://, http://, or same-origin relative paths.
 */
export function safeRedirect(url: string | null | undefined, fallback = '/'): void {
  if (!url) { window.location.href = fallback; return; }
  try {
    // Allow relative paths starting with /
    if (url.startsWith('/') && !url.startsWith('//')) {
      window.location.href = url;
      return;
    }
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
      window.location.href = url;
      return;
    }
  } catch { /* invalid URL */ }
  console.warn('[safeRedirect] Blocked unsafe redirect:', url);
  window.location.href = fallback;
}
