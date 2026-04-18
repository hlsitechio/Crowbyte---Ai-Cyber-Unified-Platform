import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";


// Production console hardening — silence internals, reroute errors to GlitchTip
if (import.meta.env.PROD) {
  const GLITCHTIP_DSN = import.meta.env.VITE_GLITCHTIP_DSN as string | undefined;

  // Parse DSN → store endpoint
  let glitchtipEndpoint: string | null = null;
  if (GLITCHTIP_DSN) {
    try {
      const url = new URL(GLITCHTIP_DSN);
      const projectId = url.pathname.replace('/', '');
      const key = url.username;
      glitchtipEndpoint = `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`;
    } catch { /* invalid DSN */ }
  }

  const sendToGlitchTip = (message: string, level: 'error' | 'warning' = 'error') => {
    if (!glitchtipEndpoint) return;
    try {
      const payload = {
        message,
        level,
        platform: 'javascript',
        timestamp: new Date().toISOString(),
        tags: { app: 'crowbyte-web', version: '1.0.0' },
      };
      navigator.sendBeacon(glitchtipEndpoint, JSON.stringify(payload));
    } catch { /* ignore */ }
  };

  // Intercept errors and forward to GlitchTip
  console.error = (...args: unknown[]) => {
    sendToGlitchTip(args.map(String).join(' '), 'error');
  };
  console.warn = (...args: unknown[]) => {
    sendToGlitchTip(args.map(String).join(' '), 'warning');
  };

  // Silence everything else
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};

  // Global unhandled errors → GlitchTip
  window.addEventListener('error', (e) => {
    sendToGlitchTip(`${e.message} @ ${e.filename}:${e.lineno}`, 'error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    sendToGlitchTip(`Unhandled Promise: ${String(e.reason)}`, 'error');
  });

}

createRoot(document.getElementById("root")!).render(<App />);
