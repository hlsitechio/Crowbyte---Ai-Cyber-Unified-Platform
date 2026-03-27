// error-monitor.ts -- Real-time error, network, and navigation monitoring for CrowByte
// Auto-initializes on import. Intercepts console.error, uncaught errors,
// unhandled promise rejections, and ALL fetch requests.

// ---- Exported Interfaces ----

export interface ErrorEntry {
  id: string;
  timestamp: string; // ISO
  type: 'console' | 'uncaught' | 'promise' | 'network';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  stack?: string;
  url?: string;
  status?: number;
  statusText?: string;
  method?: string;
  page: string;
  userAgent: string;
}

export interface NetworkEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number; // ms
  size?: number; // response size in bytes
  ok: boolean;
  page: string;
}

export interface NavigationEntry {
  timestamp: string;
  page: string;
  duration?: number; // time spent on page in ms (filled when user leaves)
}

export interface MisclickEntry {
  id: string;
  timestamp: string;
  type: 'dead_click' | 'rage_click';
  x: number;
  y: number;
  element: string; // tag + text preview
  selector: string; // CSS-like selector for identification
  page: string;
  clickCount?: number; // for rage clicks
}

export interface UIAuditEntry {
  id: string;
  timestamp: string;
  category: 'format' | 'accessibility' | 'ux' | 'performance';
  severity: 'error' | 'warning' | 'suggestion';
  rule: string; // short rule ID like "tiny-target", "missing-alt"
  message: string;
  element: string; // tag + text preview
  selector: string; // CSS-like selector
  page: string;
  details?: Record<string, unknown>; // extra data (computed size, contrast ratio, etc.)
}

export interface UIAuditStats {
  total: number;
  errors: number;
  warnings: number;
  suggestions: number;
  byCategory: Record<string, number>;
  byRule: Record<string, number>;
}

export interface PerformanceMetrics {
  pageLoadTime?: number;
  memoryUsed?: number; // MB
  memoryTotal?: number; // MB
  slowRequests: number; // count of requests > 500ms
  totalRequests: number;
  avgLatency: number; // ms
}

export interface NetworkStats {
  total: number;
  failed: number;
  slow: number;
  avgLatency: number;
}

// ---- Constants ----

const MAX_ERROR_BUFFER = 200;
const MAX_NETWORK_BUFFER = 300;
const MAX_NAVIGATION_BUFFER = 100;
const MAX_MISCLICK_BUFFER = 100;
const MAX_AUDIT_BUFFER = 200;
const FLUSH_INTERVAL_MS = 5000;
const SLOW_REQUEST_THRESHOLD_MS = 500;
const AUDIT_DEBOUNCE_MS = 2000; // wait for page to settle before auditing

// Misclick detection constants
const RAGE_CLICK_THRESHOLD = 3; // clicks within window = rage
const RAGE_CLICK_WINDOW_MS = 1000; // time window
const RAGE_CLICK_RADIUS = 30; // px radius for "same spot"
const DEAD_CLICK_SETTLE_MS = 600; // wait for DOM/network reaction

// Elements considered "interactive" — if clicked and nothing happens, it's a dead click
const INTERACTIVE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']);
const INTERACTIVE_ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'option', 'switch', 'checkbox', 'radio']);

// Known-optional endpoints whose errors are downgraded to info severity
const OPTIONAL_ENDPOINTS = ['/api/errors'];

// ---- Helpers ----

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function getCurrentPage(): string {
  try {
    return window.location.hash || '#/';
  } catch {
    return 'unknown';
  }
}

function getUserAgent(): string {
  try {
    return navigator.userAgent;
  } catch {
    return 'unknown';
  }
}

function nowISO(): string {
  return new Date().toISOString();
}

function isOptionalEndpoint(url: string): boolean {
  return OPTIONAL_ENDPOINTS.some((ep) => url.includes(ep));
}

function classifyHttpSeverity(status: number, url: string): ErrorEntry['severity'] {
  if (isOptionalEndpoint(url)) return 'info';
  if (status >= 500) return 'critical';
  if (status >= 400) return 'warning';
  return 'warning';
}

// ---- ErrorMonitor Class ----

class ErrorMonitor {
  private errors: ErrorEntry[] = [];
  private pendingErrors: ErrorEntry[] = [];
  private networkLog: NetworkEntry[] = [];
  private pendingNetwork: NetworkEntry[] = [];
  private navigationLog: NavigationEntry[] = [];
  private pendingNavigation: NavigationEntry[] = [];
  private misclickLog: MisclickEntry[] = [];
  private pendingMisclicks: MisclickEntry[] = [];
  private auditLog: UIAuditEntry[] = [];
  private auditedPages: Set<string> = new Set(); // don't re-audit same page
  private auditTimer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private originalConsoleError: typeof console.error | null = null;
  private originalFetch: typeof window.fetch | null = null;
  private lastNavigationTimestamp: number | null = null;

  // Misclick detection state
  private recentClicks: { x: number; y: number; ts: number }[] = [];
  private networkCountAtClick = 0;
  private navCountAtClick = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.active) return;

    // Guard against non-browser environments
    if (typeof window === 'undefined') return;

    this.active = true;
    this.interceptConsoleError();
    this.interceptWindowError();
    this.interceptUnhandledRejection();
    this.interceptFetch();
    this.interceptNavigation();
    this.interceptClicks();
    this.startFlushTimer();
  }

  // ---- Internal: buffer management ----

  private addError(entry: ErrorEntry): void {
    this.errors.push(entry);
    this.pendingErrors.push(entry);

    while (this.errors.length > MAX_ERROR_BUFFER) {
      this.errors.shift();
    }
  }

  private addNetworkEntry(entry: NetworkEntry): void {
    this.networkLog.push(entry);
    this.pendingNetwork.push(entry);

    while (this.networkLog.length > MAX_NETWORK_BUFFER) {
      this.networkLog.shift();
    }
  }

  private addNavigationEntry(entry: NavigationEntry): void {
    this.navigationLog.push(entry);
    this.pendingNavigation.push(entry);

    while (this.navigationLog.length > MAX_NAVIGATION_BUFFER) {
      this.navigationLog.shift();
    }
  }

  private addMisclickEntry(entry: MisclickEntry): void {
    this.misclickLog.push(entry);
    this.pendingMisclicks.push(entry);

    while (this.misclickLog.length > MAX_MISCLICK_BUFFER) {
      this.misclickLog.shift();
    }
  }

  // ---- Click interception (dead clicks + rage clicks) ----

  private interceptClicks(): void {
    const self = this;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const now = Date.now();
      const x = e.clientX;
      const y = e.clientY;

      // --- Rage click detection ---
      self.recentClicks.push({ x, y, ts: now });
      // Prune old clicks outside the time window
      self.recentClicks = self.recentClicks.filter(
        (c) => now - c.ts < RAGE_CLICK_WINDOW_MS
      );
      // Count clicks in the same area
      const nearbyClicks = self.recentClicks.filter(
        (c) => Math.abs(c.x - x) < RAGE_CLICK_RADIUS && Math.abs(c.y - y) < RAGE_CLICK_RADIUS
      );

      if (nearbyClicks.length >= RAGE_CLICK_THRESHOLD) {
        // Only log once per burst (check if we already logged one in this window)
        const existingRage = self.misclickLog.find(
          (m) =>
            m.type === 'rage_click' &&
            now - new Date(m.timestamp).getTime() < RAGE_CLICK_WINDOW_MS * 2 &&
            Math.abs(m.x - x) < RAGE_CLICK_RADIUS &&
            Math.abs(m.y - y) < RAGE_CLICK_RADIUS
        );

        if (!existingRage) {
          self.addMisclickEntry({
            id: generateId(),
            timestamp: nowISO(),
            type: 'rage_click',
            x,
            y,
            element: self.describeElement(target),
            selector: self.buildSelector(target),
            page: getCurrentPage(),
            clickCount: nearbyClicks.length,
          });
        }
        return; // Don't also check for dead click on rage
      }

      // --- Dead click detection ---
      // Only check elements that LOOK interactive
      if (!self.isInteractiveElement(target)) return;

      // Skip the QA Agent's own UI
      if (target.closest('[data-qa-agent]')) return;

      // Skip inputs/textareas/selects — focusing is expected behavior, not a dead click
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Skip elements inside navigation/sidebar — React state updates don't trigger fetch/nav
      if (target.closest('nav, [role="navigation"], [data-sidebar], [class*="sidebar"], [class*="Sidebar"]')) return;

      // Snapshot current counts
      const netCountBefore = self.networkLog.length;
      const navCountBefore = self.navigationLog.length;

      // Use MutationObserver to detect DOM changes after click
      let domChanged = false;
      const observer = new MutationObserver(() => { domChanged = true; });
      // Observe the closest meaningful parent for any subtree changes
      const observeRoot = target.closest('[class*="content"], [class*="Content"], main, [role="main"]') || document.body;
      observer.observe(observeRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-expanded', 'aria-selected', 'aria-checked', 'data-state', 'hidden', 'open'],
      });

      // Wait for reaction
      setTimeout(() => {
        observer.disconnect();

        const netCountAfter = self.networkLog.length;
        const navCountAfter = self.navigationLog.length;

        const fetchFired = netCountAfter > netCountBefore;
        const navChanged = navCountAfter > navCountBefore;

        // If DOM changed, fetch fired, or navigation changed — the click DID something
        if (!fetchFired && !navChanged && !domChanged) {
          self.addMisclickEntry({
            id: generateId(),
            timestamp: nowISO(),
            type: 'dead_click',
            x,
            y,
            element: self.describeElement(target),
            selector: self.buildSelector(target),
            page: getCurrentPage(),
          });
        }
      }, DEAD_CLICK_SETTLE_MS);
    }, true); // Use capture phase to catch all clicks
  }

  private isInteractiveElement(el: HTMLElement): boolean {
    // Check the element itself and walk up a few levels
    let current: HTMLElement | null = el;
    let depth = 0;

    while (current && depth < 4) {
      // Interactive tag?
      if (INTERACTIVE_TAGS.has(current.tagName)) return true;
      // Interactive role?
      const role = current.getAttribute('role');
      if (role && INTERACTIVE_ROLES.has(role)) return true;
      // Has click handler indicators?
      if (current.onclick) return true;
      if (current.getAttribute('tabindex')) return true;
      // Cursor pointer via inline style
      if (current.style.cursor === 'pointer') return true;
      // Check computed cursor (more expensive, only on direct target)
      if (depth === 0) {
        try {
          const computed = window.getComputedStyle(current);
          if (computed.cursor === 'pointer') return true;
        } catch { /* */ }
      }

      current = current.parentElement;
      depth++;
    }

    return false;
  }

  private describeElement(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().slice(0, 40);
    const type = el.getAttribute('type');
    const ariaLabel = el.getAttribute('aria-label');
    const title = el.getAttribute('title');

    let desc = `<${tag}`;
    if (type) desc += ` type="${type}"`;
    if (ariaLabel) desc += ` aria-label="${ariaLabel}"`;
    desc += '>';

    if (title) return `${desc} "${title}"`;
    if (text) return `${desc} "${text}"`;
    return desc;
  }

  private buildSelector(el: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    let depth = 0;

    while (current && depth < 3) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part += `#${current.id}`;
        parts.unshift(part);
        break; // ID is unique enough
      }
      const classes = Array.from(current.classList)
        .filter((c) => !c.startsWith('__') && c.length < 30)
        .slice(0, 2);
      if (classes.length > 0) {
        part += '.' + classes.join('.');
      }
      parts.unshift(part);
      current = current.parentElement;
      depth++;
    }

    return parts.join(' > ');
  }

  // ---- console.error interception ----

  private interceptConsoleError(): void {
    this.originalConsoleError = console.error;
    const self = this;

    console.error = function (...args: unknown[]) {
      // Call the original first
      self.originalConsoleError!.apply(console, args);

      let message = '';
      let stack: string | undefined;

      for (const arg of args) {
        if (arg instanceof Error) {
          message += arg.message + ' ';
          if (arg.stack) stack = arg.stack;
        } else if (typeof arg === 'string') {
          message += arg + ' ';
        } else {
          try {
            message += JSON.stringify(arg) + ' ';
          } catch {
            message += String(arg) + ' ';
          }
        }
      }

      self.addError({
        id: generateId(),
        timestamp: nowISO(),
        type: 'console',
        severity: 'warning',
        message: message.trim(),
        stack,
        page: getCurrentPage(),
        userAgent: getUserAgent(),
      });
    };
  }

  // ---- window.onerror interception ----

  private interceptWindowError(): void {
    const self = this;

    window.onerror = function (
      messageOrEvent: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) {
      const message =
        typeof messageOrEvent === 'string'
          ? messageOrEvent
          : (error?.message ?? 'Unknown error');

      self.addError({
        id: generateId(),
        timestamp: nowISO(),
        type: 'uncaught',
        severity: 'critical',
        message,
        stack: error?.stack ?? (source ? `${source}:${lineno}:${colno}` : undefined),
        page: getCurrentPage(),
        userAgent: getUserAgent(),
      });
    };
  }

  // ---- unhandledrejection interception ----

  private interceptUnhandledRejection(): void {
    const self = this;

    window.onunhandledrejection = function (event: PromiseRejectionEvent) {
      let message = 'Unhandled promise rejection';
      let stack: string | undefined;

      if (event.reason instanceof Error) {
        message = event.reason.message;
        stack = event.reason.stack;
      } else if (typeof event.reason === 'string') {
        message = event.reason;
      } else {
        try {
          message = JSON.stringify(event.reason);
        } catch {
          message = String(event.reason);
        }
      }

      self.addError({
        id: generateId(),
        timestamp: nowISO(),
        type: 'promise',
        severity: 'critical',
        message,
        stack,
        page: getCurrentPage(),
        userAgent: getUserAgent(),
      });
    };
  }

  // ---- fetch interception (ALL requests tracked, errors recorded) ----

  private interceptFetch(): void {
    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const method = init?.method?.toUpperCase() ?? 'GET';
      let url: string;

      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.url;
      }

      // Skip monitoring our own error reporting endpoint to avoid loops
      if (url.includes('/api/errors')) {
        return self.originalFetch!.call(window, input, init);
      }

      const startTime = Date.now();

      return self.originalFetch!.call(window, input, init).then(
        (response: Response) => {
          const duration = Date.now() - startTime;

          // Parse response size from content-length header if available
          let size: number | undefined;
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const parsed = parseInt(contentLength, 10);
            if (!isNaN(parsed)) size = parsed;
          }

          // Track ALL requests in network log
          self.addNetworkEntry({
            id: generateId(),
            timestamp: nowISO(),
            method,
            url,
            status: response.status,
            statusText: response.statusText,
            duration,
            size,
            ok: response.ok,
            page: getCurrentPage(),
          });

          // Track failed responses as errors
          if (response.status >= 400) {
            self.addError({
              id: generateId(),
              timestamp: nowISO(),
              type: 'network',
              severity: classifyHttpSeverity(response.status, url),
              message: `HTTP ${response.status} ${response.statusText} - ${method} ${url}`,
              url,
              status: response.status,
              statusText: response.statusText,
              method,
              page: getCurrentPage(),
              userAgent: getUserAgent(),
            });
          }

          return response;
        },
        (err: unknown) => {
          const duration = Date.now() - startTime;
          const errMessage = err instanceof Error ? err.message : String(err);

          // Network failure still tracked
          self.addNetworkEntry({
            id: generateId(),
            timestamp: nowISO(),
            method,
            url,
            status: 0,
            statusText: 'Network Error',
            duration,
            ok: false,
            page: getCurrentPage(),
          });

          self.addError({
            id: generateId(),
            timestamp: nowISO(),
            type: 'network',
            severity: 'critical',
            message: `Fetch failed - ${method} ${url}: ${errMessage}`,
            url,
            method,
            page: getCurrentPage(),
            userAgent: getUserAgent(),
          });

          throw err;
        }
      );
    };
  }

  // ---- Navigation tracking via hashchange ----

  private interceptNavigation(): void {
    const self = this;

    // Record the initial page
    const initialPage = getCurrentPage();
    self.lastNavigationTimestamp = Date.now();
    self.addNavigationEntry({
      timestamp: nowISO(),
      page: initialPage,
    });

    // Schedule initial audit after page settles
    self.scheduleAudit(initialPage);

    window.addEventListener('hashchange', () => {
      const now = Date.now();
      const currentPage = getCurrentPage();

      // Fill duration on the previous navigation entry
      if (self.navigationLog.length > 0 && self.lastNavigationTimestamp !== null) {
        const lastEntry = self.navigationLog[self.navigationLog.length - 1];
        if (lastEntry.duration === undefined) {
          lastEntry.duration = now - self.lastNavigationTimestamp;
        }
      }

      self.lastNavigationTimestamp = now;
      self.addNavigationEntry({
        timestamp: nowISO(),
        page: currentPage,
      });

      // Schedule UI audit for the new page
      self.scheduleAudit(currentPage);
    });
  }

  private scheduleAudit(page: string): void {
    // Don't re-audit a page we've already checked this session
    if (this.auditedPages.has(page)) return;

    if (this.auditTimer) clearTimeout(this.auditTimer);
    this.auditTimer = setTimeout(() => {
      this.runUIAudit(page);
      this.auditedPages.add(page);
    }, AUDIT_DEBOUNCE_MS);
  }

  // ---- UI Audit Engine ----

  private auditSeen = new Set<string>(); // dedup by rule+selector+page

  private addAuditEntry(entry: UIAuditEntry): void {
    // Dedup: skip if same rule + selector + page already logged
    const key = `${entry.rule}::${entry.selector}::${entry.page}`;
    if (this.auditSeen.has(key)) return;
    this.auditSeen.add(key);

    this.auditLog.push(entry);
    while (this.auditLog.length > MAX_AUDIT_BUFFER) {
      this.auditLog.shift();
    }
  }

  private runUIAudit(page: string): void {
    // Skip audit on non-visible or auth pages
    if (document.hidden) return;

    const mainContent = document.querySelector('main, [role="main"], #root') || document.body;

    this.auditTinyTargets(mainContent, page);
    this.auditSmallText(mainContent, page);
    this.auditOverflow(mainContent, page);
    this.auditMissingAlt(mainContent, page);
    this.auditIconButtons(mainContent, page);
    this.auditFormLabels(mainContent, page);
    this.auditDuplicateIds(page);
    this.auditBrokenImages(mainContent, page);
    this.auditEmptyStates(mainContent, page);
    this.auditContrast(mainContent, page);
    this.auditHorizontalScroll(page);
    this.auditLucideIcons(mainContent, page);
    this.auditDarkUnderglow(mainContent, page);
  }

  // Rule: Interactive elements smaller than 24x24px (WCAG 2.5.8 — 44px ideal, 24px minimum)
  private auditTinyTargets(root: Element, page: string): void {
    const interactives = root.querySelectorAll('button, a[href], [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"]');
    for (const el of interactives) {
      if (el.closest('[data-qa-agent]')) continue;
      // Skip sidebar navigation items
      if (el.closest('nav, [data-sidebar], [class*="sidebar"], [class*="Sidebar"]')) continue;
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // hidden
      // Only flag truly tiny targets (< 20px in either dimension)
      if (rect.width < 20 || rect.height < 20) {
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'accessibility',
          severity: 'warning',
          rule: 'tiny-target',
          message: `Click target ${Math.round(rect.width)}x${Math.round(rect.height)}px — below 24x24 minimum`,
          element: this.describeElement(el as HTMLElement),
          selector: this.buildSelector(el as HTMLElement),
          page,
          details: { width: Math.round(rect.width), height: Math.round(rect.height) },
        });
      }
    }
  }

  // Rule: Text smaller than 11px
  private auditSmallText(root: Element, page: string): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.textContent?.trim();
        if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const checked = new Set<Element>();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || checked.has(parent)) continue;
      if (parent.closest('[data-qa-agent]')) continue;
      checked.add(parent);

      try {
        const computed = window.getComputedStyle(parent);
        const fontSize = parseFloat(computed.fontSize);
        // Only flag truly unreadable text (< 9px). 10px is common for badges/labels.
        if (fontSize > 0 && fontSize < 9) {
          this.addAuditEntry({
            id: generateId(),
            timestamp: nowISO(),
            category: 'format',
            severity: 'error',
            rule: 'small-text',
            message: `Text at ${fontSize.toFixed(1)}px — unreadable (min 9px)`,
            element: this.describeElement(parent),
            selector: this.buildSelector(parent),
            page,
            details: { fontSize },
          });
        }
      } catch { /* getComputedStyle can throw on detached elements */ }
    }
  }

  // Rule: Text/content overflowing container
  private auditOverflow(root: Element, page: string): void {
    // Only check leaf-ish content elements, not layout wrappers
    const elements = root.querySelectorAll('p, span, td, th, li, label, h1, h2, h3, h4, h5, h6');
    let count = 0;
    for (const el of elements) {
      if (count > 3) break; // strict limit
      if (el.closest('[data-qa-agent]')) continue;
      const htmlEl = el as HTMLElement;
      const isOverflowX = htmlEl.scrollWidth > htmlEl.clientWidth + 4;
      const isOverflowY = htmlEl.scrollHeight > htmlEl.clientHeight + 4;

      if (isOverflowX || isOverflowY) {
        const cn = String(htmlEl.className || '');

        // Skip sr-only, visually-hidden, layout classes
        if (cn.includes('sr-only') || cn.includes('visually-hidden')) continue;
        if (cn.includes('h-screen') || cn.includes('min-h-screen')) continue;
        if (cn.includes('min-w-0') || cn.includes('flex-1') || cn.includes('flex-col')) continue;
        if (cn.includes('truncate') || cn.includes('line-clamp')) continue;

        // Skip sidebar/navigation/fixed elements entirely
        if (htmlEl.closest('nav, [data-sidebar], [class*="sidebar"], [class*="Sidebar"], [class*="fixed"]')) continue;

        // Skip if element or any ancestor handles overflow
        let handled = false;
        let current: HTMLElement | null = htmlEl;
        while (current && current !== document.body) {
          try {
            const cs = window.getComputedStyle(current);
            if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
              handled = true;
              break;
            }
            if (cs.textOverflow === 'ellipsis') { handled = true; break; }
            if (cs.position === 'fixed' || cs.position === 'absolute') { handled = true; break; }
          } catch { break; }
          current = current.parentElement;
        }
        if (handled) continue;

        // Only flag visible elements with meaningful own-text
        const text = htmlEl.textContent?.trim();
        if (!text || text.length < 5) continue;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip huge containers (they're layout, not content)
        if (rect.width > 800 || rect.height > 600) continue;

        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'format',
          severity: 'warning',
          rule: 'overflow',
          message: `Content overflows container (${isOverflowX ? 'horizontal' : ''}${isOverflowX && isOverflowY ? '+' : ''}${isOverflowY ? 'vertical' : ''})`,
          element: this.describeElement(htmlEl),
          selector: this.buildSelector(htmlEl),
          page,
          details: {
            scrollWidth: htmlEl.scrollWidth,
            clientWidth: htmlEl.clientWidth,
            scrollHeight: htmlEl.scrollHeight,
            clientHeight: htmlEl.clientHeight,
          },
        });
        count++;
      }
    }
  }

  // Rule: Images missing alt attribute
  private auditMissingAlt(root: Element, page: string): void {
    const images = root.querySelectorAll('img');
    for (const img of images) {
      if (img.closest('[data-qa-agent]')) continue;
      if (!img.hasAttribute('alt')) {
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'accessibility',
          severity: 'error',
          rule: 'missing-alt',
          message: 'Image missing alt attribute',
          element: `<img src="${(img.src || '').slice(-50)}">`,
          selector: this.buildSelector(img),
          page,
        });
      }
    }
  }

  // Rule: Icon-only buttons without accessible label
  private auditIconButtons(root: Element, page: string): void {
    const buttons = root.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      if (btn.closest('[data-qa-agent]')) continue;
      const htmlBtn = btn as HTMLElement;
      const text = htmlBtn.textContent?.trim();
      const ariaLabel = htmlBtn.getAttribute('aria-label');
      const title = htmlBtn.getAttribute('title');

      // Button has SVG/icon but no text content and no aria-label
      const hasSvg = htmlBtn.querySelector('svg');
      if (hasSvg && (!text || text.length === 0) && !ariaLabel && !title) {
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'accessibility',
          severity: 'warning',
          rule: 'icon-no-label',
          message: 'Icon-only button has no aria-label or title — invisible to screen readers',
          element: this.describeElement(htmlBtn),
          selector: this.buildSelector(htmlBtn),
          page,
        });
      }
    }
  }

  // Rule: Form inputs without associated labels
  private auditFormLabels(root: Element, page: string): void {
    const inputs = root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
    for (const input of inputs) {
      if (input.closest('[data-qa-agent]')) continue;
      const htmlInput = input as HTMLInputElement;
      const id = htmlInput.id;
      const ariaLabel = htmlInput.getAttribute('aria-label');
      const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
      const placeholder = htmlInput.placeholder;

      // Has label via <label for="id">?
      const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;

      if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder) {
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'accessibility',
          severity: 'warning',
          rule: 'missing-label',
          message: 'Form input has no label, aria-label, or placeholder',
          element: this.describeElement(htmlInput),
          selector: this.buildSelector(htmlInput),
          page,
        });
      }
    }
  }

  // Rule: Duplicate IDs in DOM
  private auditDuplicateIds(page: string): void {
    const allIds = document.querySelectorAll('[id]');
    const idMap = new Map<string, number>();
    for (const el of allIds) {
      if (el.closest('[data-qa-agent]')) continue;
      const id = el.id;
      if (id) {
        idMap.set(id, (idMap.get(id) || 0) + 1);
      }
    }
    for (const [id, count] of idMap) {
      if (count > 1 && !id.startsWith('radix-')) { // Radix UI generates duplicate IDs sometimes
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'format',
          severity: 'error',
          rule: 'duplicate-id',
          message: `Duplicate DOM id="${id}" found ${count} times — breaks label associations and ARIA references`,
          element: `[id="${id}"]`,
          selector: `#${id}`,
          page,
          details: { duplicateCount: count },
        });
      }
    }
  }

  // Rule: Broken images
  private auditBrokenImages(root: Element, page: string): void {
    const images = root.querySelectorAll('img');
    for (const img of images) {
      if (img.closest('[data-qa-agent]')) continue;
      if (img.complete && img.naturalWidth === 0 && img.src) {
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'format',
          severity: 'error',
          rule: 'broken-image',
          message: `Broken image: ${img.src.slice(-60)}`,
          element: `<img src="${img.src.slice(-60)}">`,
          selector: this.buildSelector(img),
          page,
        });
      }
    }
  }

  // Rule: Empty visible containers that should show an empty state
  private auditEmptyStates(root: Element, page: string): void {
    // Look for common content containers that are visible but empty
    const containers = root.querySelectorAll('[class*="content"], [class*="list"], [class*="grid"], [class*="table-body"], tbody');
    for (const el of containers) {
      if (el.closest('[data-qa-agent]')) continue;
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // hidden
      if (rect.height < 20) continue; // too small to matter

      const text = htmlEl.textContent?.trim();
      const children = htmlEl.children.length;
      if (children === 0 && (!text || text.length === 0) && rect.height > 50) {
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'ux',
          severity: 'suggestion',
          rule: 'empty-container',
          message: `Visible container is empty — consider adding an empty state message`,
          element: this.describeElement(htmlEl),
          selector: this.buildSelector(htmlEl),
          page,
          details: { height: Math.round(rect.height), width: Math.round(rect.width) },
        });
      }
    }
  }

  // Rule: Low contrast text (simplified — checks against dark background assumption)
  private auditContrast(root: Element, page: string): void {
    // Sample a few text elements for very low opacity/very dark text on dark bg
    const textElements = root.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, td, th, li');
    let count = 0;
    for (const el of textElements) {
      if (count > 3) break;
      if (el.closest('[data-qa-agent]')) continue;
      const htmlEl = el as HTMLElement;
      const text = htmlEl.textContent?.trim();
      if (!text || text.length < 2) continue;

      try {
        const computed = window.getComputedStyle(htmlEl);
        const color = computed.color;
        const opacity = parseFloat(computed.opacity);

        // Check for near-invisible text (opacity too low)
        if (opacity > 0 && opacity < 0.3) {
          this.addAuditEntry({
            id: generateId(),
            timestamp: nowISO(),
            category: 'accessibility',
            severity: 'warning',
            rule: 'low-contrast',
            message: `Text opacity ${opacity.toFixed(2)} — may be hard to read`,
            element: this.describeElement(htmlEl),
            selector: this.buildSelector(htmlEl),
            page,
            details: { opacity, color },
          });
          count++;
        }

        // Check for very dark text on dark theme (rgb all < 40)
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          const luminance = (r + g + b) / 3;
          if (luminance < 35 && opacity >= 0.3) {
            this.addAuditEntry({
              id: generateId(),
              timestamp: nowISO(),
              category: 'accessibility',
              severity: 'suggestion',
              rule: 'low-contrast',
              message: `Very dark text (rgb avg ${Math.round(luminance)}) on dark theme — may be invisible`,
              element: this.describeElement(htmlEl),
              selector: this.buildSelector(htmlEl),
              page,
              details: { r, g, b, luminance },
            });
            count++;
          }
        }
      } catch { /* */ }
    }
  }

  // Rule: Page has horizontal scroll (layout broken)
  private auditHorizontalScroll(page: string): void {
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 5) {
      this.addAuditEntry({
        id: generateId(),
        timestamp: nowISO(),
        category: 'format',
        severity: 'error',
        rule: 'horizontal-scroll',
        message: `Page has horizontal scroll (${document.documentElement.scrollWidth}px > viewport ${document.documentElement.clientWidth}px) — layout overflow`,
        element: '<html>',
        selector: 'html',
        page,
        details: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        },
      });
    }
  }

  // Rule: Detect non-Phosphor (Lucide) SVG icons — they look generic/ugly
  private auditLucideIcons(root: Element, page: string): void {
    const svgs = root.querySelectorAll('svg');
    let count = 0;
    for (const svg of svgs) {
      if (count >= 10) break;
      if (svg.closest('[data-qa-agent]')) continue;
      // Phosphor icons set xmlns and have a specific viewBox pattern
      // Lucide icons use strokeWidth, stroke="currentColor", fill="none" pattern
      const stroke = svg.getAttribute('stroke');
      const fill = svg.getAttribute('fill');
      const strokeWidth = svg.getAttribute('stroke-width');
      // Lucide signature: stroke="currentColor" + fill="none" + stroke-width="2"
      if (stroke === 'currentColor' && fill === 'none' && strokeWidth === '2') {
        const parent = svg.parentElement;
        this.addAuditEntry({
          id: generateId(),
          timestamp: nowISO(),
          category: 'format',
          severity: 'warning',
          rule: 'lucide-icon',
          message: 'Non-Phosphor (Lucide) icon detected — should be migrated to @phosphor-icons/react',
          element: this.describeElement(parent || svg as unknown as HTMLElement),
          selector: this.buildSelector(parent || svg as unknown as HTMLElement),
          page,
        });
        count++;
      }
    }
  }

  // Rule: Detect dark background underglow (visible gray rectangles on black bg)
  private auditDarkUnderglow(root: Element, page: string): void {
    const allElements = root.querySelectorAll('div, section, article, aside, main, span');
    let count = 0;
    for (const el of allElements) {
      if (count >= 10) break;
      if (el.closest('[data-qa-agent]')) continue;
      // Skip browser panel, sidebar, inputs, and tiny elements
      if (el.closest('nav, [data-sidebar], input, textarea, [class*="browser"]')) continue;
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width < 30 || rect.height < 30) continue; // skip tiny elements
      if (rect.width === 0 || rect.height === 0) continue;
      try {
        const computed = window.getComputedStyle(htmlEl);
        const bg = computed.backgroundColor;
        if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') continue;
        // Parse rgb/rgba values
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) continue;
        const [, r, g, b] = match.map(Number);
        // Flag elements with dark gray backgrounds (rgb 5-30 range) that create visible rectangles
        // Pure black (0,0,0) is fine. Visible dark gray (5-30) is the underglow.
        if (r === g && g === b && r >= 5 && r <= 35) {
          // Skip if it's an input, select, or interactive form element
          const tag = htmlEl.tagName.toLowerCase();
          if (['input', 'textarea', 'select'].includes(tag)) continue;
          this.addAuditEntry({
            id: generateId(),
            timestamp: nowISO(),
            category: 'format',
            severity: 'warning',
            rule: 'dark-underglow',
            message: `Dark background underglow detected: ${bg} — creates visible rectangle on black`,
            element: this.describeElement(htmlEl),
            selector: this.buildSelector(htmlEl),
            page,
            details: { backgroundColor: bg, rgb: { r, g, b } },
          });
          count++;
        }
      } catch { /* skip */ }
    }
  }

  // ---- Batch flush to server ----

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private flush(): void {
    const hasErrors = this.pendingErrors.length > 0;
    const hasNetwork = this.pendingNetwork.length > 0;
    const hasNavigation = this.pendingNavigation.length > 0;
    const hasMisclicks = this.pendingMisclicks.length > 0;

    // Only flush if there are NEW entries since last flush
    if (!hasErrors && !hasNetwork && !hasNavigation && !hasMisclicks) return;

    const errorBatch = hasErrors ? this.pendingErrors.splice(0) : [];
    const networkBatch = hasNetwork ? this.pendingNetwork.splice(0) : [];
    const navigationBatch = hasNavigation ? this.pendingNavigation.splice(0) : [];
    const misclickBatch = hasMisclicks ? this.pendingMisclicks.splice(0) : [];

    // Use the original fetch to avoid self-interception
    const fetchFn = this.originalFetch ?? window.fetch;

    fetchFn('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errors: errorBatch,
        network: networkBatch,
        navigation: navigationBatch,
        misclicks: misclickBatch,
      }),
    }).catch(() => {
      // Silently fail -- do not re-add to buffer to avoid infinite growth
    });
  }

  // ---- Public API ----

  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  getNetworkLog(): NetworkEntry[] {
    return [...this.networkLog];
  }

  getNavigationLog(): NavigationEntry[] {
    return [...this.navigationLog];
  }

  getMisclickLog(): MisclickEntry[] {
    return [...this.misclickLog];
  }

  getAuditLog(): UIAuditEntry[] {
    return [...this.auditLog];
  }

  getAuditStats(): UIAuditStats {
    const stats: UIAuditStats = { total: 0, errors: 0, warnings: 0, suggestions: 0, byCategory: {}, byRule: {} };
    for (const a of this.auditLog) {
      stats.total++;
      if (a.severity === 'error') stats.errors++;
      else if (a.severity === 'warning') stats.warnings++;
      else stats.suggestions++;
      stats.byCategory[a.category] = (stats.byCategory[a.category] || 0) + 1;
      stats.byRule[a.rule] = (stats.byRule[a.rule] || 0) + 1;
    }
    return stats;
  }

  // Force re-audit current page (useful after navigation within same hash)
  reauditCurrentPage(): void {
    const page = getCurrentPage();
    this.auditedPages.delete(page);
    this.scheduleAudit(page);
  }

  getMisclickStats(): { deadClicks: number; rageClicks: number; total: number } {
    let deadClicks = 0;
    let rageClicks = 0;
    for (const m of this.misclickLog) {
      if (m.type === 'dead_click') deadClicks++;
      else if (m.type === 'rage_click') rageClicks++;
    }
    return { deadClicks, rageClicks, total: this.misclickLog.length };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      slowRequests: 0,
      totalRequests: this.networkLog.length,
      avgLatency: 0,
    };

    // Page load time from Navigation Timing API
    try {
      if (typeof performance !== 'undefined' && performance.timing) {
        const timing = performance.timing;
        if (timing.loadEventEnd > 0 && timing.navigationStart > 0) {
          metrics.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        }
      }
    } catch {
      // Not available
    }

    // Memory usage (Chrome only)
    try {
      const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (perfMemory) {
        metrics.memoryUsed = Math.round((perfMemory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
        metrics.memoryTotal = Math.round((perfMemory.totalJSHeapSize / (1024 * 1024)) * 100) / 100;
      }
    } catch {
      // Not available
    }

    // Calculate latency stats from network log
    if (this.networkLog.length > 0) {
      let totalDuration = 0;
      for (const entry of this.networkLog) {
        totalDuration += entry.duration;
        if (entry.duration > SLOW_REQUEST_THRESHOLD_MS) {
          metrics.slowRequests++;
        }
      }
      metrics.avgLatency = Math.round(totalDuration / this.networkLog.length);
    }

    return metrics;
  }

  getSlowRequests(threshold?: number): NetworkEntry[] {
    const limit = threshold ?? SLOW_REQUEST_THRESHOLD_MS;
    return this.networkLog.filter((entry) => entry.duration > limit);
  }

  getNetworkStats(): NetworkStats {
    const total = this.networkLog.length;
    let failed = 0;
    let slow = 0;
    let totalDuration = 0;

    for (const entry of this.networkLog) {
      if (!entry.ok) failed++;
      if (entry.duration > SLOW_REQUEST_THRESHOLD_MS) slow++;
      totalDuration += entry.duration;
    }

    return {
      total,
      failed,
      slow,
      avgLatency: total > 0 ? Math.round(totalDuration / total) : 0,
    };
  }

  clearErrors(): void {
    this.errors.length = 0;
    this.pendingErrors.length = 0;
  }

  clearAll(): void {
    this.errors.length = 0;
    this.pendingErrors.length = 0;
    this.networkLog.length = 0;
    this.pendingNetwork.length = 0;
    this.navigationLog.length = 0;
    this.pendingNavigation.length = 0;
    this.misclickLog.length = 0;
    this.pendingMisclicks.length = 0;
    this.recentClicks.length = 0;
    this.auditLog.length = 0;
    this.auditedPages.clear();
    this.auditSeen.clear();
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
    }
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    this.active = false;
  }
}

// Singleton -- auto-initializes on import
export const errorMonitor = new ErrorMonitor();

// ---------------------------------------------------------------------------
// Claude Code Bridge — allows external control of QA Agent
// Call from Chrome DevTools or mcp__claude-in-chrome__javascript_tool
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  (window as any).__qaAgent = {
    /** Get current error count by severity */
    status() {
      const errors = errorMonitor.getErrors();
      const critical = errors.filter(e => e.severity === 'critical').length;
      const warning = errors.filter(e => e.severity === 'warning').length;
      const network = errorMonitor.getNetworkLog().filter(n => n.failed).length;
      return { total: errors.length, critical, warning, networkFailed: network, ok: critical === 0 };
    },

    /** Get all current errors as JSON */
    errors() {
      return errorMonitor.getErrors().map(e => ({
        severity: e.severity,
        message: e.message.slice(0, 200),
        source: e.source,
        page: e.page,
        timestamp: e.timestamp,
      }));
    },

    /** Get failed network requests */
    failedRequests() {
      return errorMonitor.getNetworkLog()
        .filter(n => n.failed || (n.status && n.status >= 400))
        .map(n => ({ url: n.url, status: n.status, method: n.method, failed: n.failed }));
    },

    /** Clear all errors and re-audit current page (fresh check) */
    recheck() {
      errorMonitor.clearAll();
      // Force re-audit after a short delay to let the page settle
      setTimeout(() => {
        const status = (window as any).__qaAgent.status();
        console.log('[QA Bridge] Recheck complete:', JSON.stringify(status));
      }, 3000);
      return 'Cleared. Rechecking in 3s — call __qaAgent.status() after.';
    },

    /** Check if a specific error pattern still exists */
    verify(pattern: string) {
      const errors = errorMonitor.getErrors();
      const matches = errors.filter(e =>
        e.message.toLowerCase().includes(pattern.toLowerCase())
      );
      if (matches.length === 0) {
        return { resolved: true, pattern, message: `No errors matching "${pattern}"` };
      }
      return {
        resolved: false,
        pattern,
        count: matches.length,
        errors: matches.map(e => ({ severity: e.severity, message: e.message.slice(0, 150), page: e.page })),
      };
    },

    /** Get compact summary for Claude Code consumption */
    report() {
      const s = (window as any).__qaAgent.status();
      const failed = (window as any).__qaAgent.failedRequests();
      return {
        ...s,
        failedUrls: failed.map((f: any) => f.url),
        perf: errorMonitor.getPerformanceMetrics(),
      };
    },
  };

  console.log('[QA Bridge] __qaAgent ready — status(), errors(), verify(pattern), recheck(), report()');
}
