import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";


// Production error forwarding — unhandled errors/rejections → GlitchTip via envelope
if (import.meta.env.PROD) {
  const GLITCHTIP_DSN = import.meta.env.VITE_GLITCHTIP_DSN as string | undefined;

  let envelopeUrl: string | null = null;
  let dsn_key: string | null = null;
  if (GLITCHTIP_DSN) {
    try {
      const url = new URL(GLITCHTIP_DSN);
      const projectId = url.pathname.replace('/', '');
      dsn_key = url.username;
      envelopeUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_key=${dsn_key}`;
    } catch { /* invalid DSN */ }
  }

  const sendToGlitchTip = (message: string, level: 'error' | 'warning' = 'error') => {
    if (!envelopeUrl) return;
    try {
      const event_id = crypto.randomUUID().replace(/-/g, '');
      const envelopeHeader = JSON.stringify({ event_id, sdk: { name: 'crowbyte.js', version: '1.0.0' } });
      const itemHeader = JSON.stringify({ type: 'event' });
      const itemPayload = JSON.stringify({
        event_id,
        message,
        level,
        platform: 'javascript',
        timestamp: new Date().toISOString(),
        tags: { app: 'crowbyte-web', version: import.meta.env.VITE_APP_VERSION || '1.0.0' },
      });
      const blob = new Blob([`${envelopeHeader}\n${itemHeader}\n${itemPayload}`], { type: 'application/x-sentry-envelope' });
      navigator.sendBeacon(envelopeUrl, blob);
    } catch { /* ignore */ }
  };

  // Global unhandled errors → GlitchTip only (don't intercept console — too noisy)
  window.addEventListener('error', (e) => {
    sendToGlitchTip(`${e.message} @ ${e.filename}:${e.lineno}`, 'error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    sendToGlitchTip(`Unhandled Promise: ${String(e.reason)}`, 'error');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
