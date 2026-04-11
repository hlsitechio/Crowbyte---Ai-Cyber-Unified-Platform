/**
 * CrowByte Theme System
 *
 * Each theme defines HSL values for all CSS custom properties.
 * Themes are applied via data-theme attribute on <html>.
 */

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    sidebar: string;
    accent: string;
    text: string;
  };
  vars: Record<string, string>;
}

export const THEMES: AppTheme[] = [
  {
    id: 'slate',
    name: 'Slate',
    description: 'Default CrowByte theme — neutral dark slate',
    preview: { bg: '#252628', sidebar: '#212224', accent: '#c8c9cc', text: '#ededee' },
    vars: {
      '--background': '210 5% 15%',
      '--foreground': '210 5% 93%',
      '--card': '210 5% 15%',
      '--card-foreground': '210 5% 93%',
      '--popover': '210 5% 22%',
      '--popover-foreground': '210 5% 93%',
      '--primary': '210 5% 80%',
      '--primary-foreground': '210 5% 15%',
      '--secondary': '210 5% 24%',
      '--secondary-foreground': '210 5% 90%',
      '--muted': '210 5% 22%',
      '--muted-foreground': '210 5% 60%',
      '--accent': '210 5% 85%',
      '--accent-foreground': '210 5% 16%',
      '--destructive': '0 70% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '210 5% 25%',
      '--input': '210 5% 18%',
      '--ring': '210 5% 70%',
      '--sidebar-background': '210 5% 13%',
      '--sidebar-foreground': '210 5% 90%',
      '--sidebar-primary': '210 5% 80%',
      '--sidebar-primary-foreground': '210 5% 13%',
      '--sidebar-accent': '210 5% 20%',
      '--sidebar-accent-foreground': '210 5% 93%',
      '--sidebar-border': '210 5% 22%',
      '--sidebar-ring': '210 5% 70%',
      '--silver-light': '210 5% 85%',
      '--silver': '210 5% 75%',
      '--silver-muted': '210 5% 55%',
      '--silver-dark': '210 5% 35%',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic, north-bluish color palette',
    preview: { bg: '#2e3440', sidebar: '#272c36', accent: '#88c0d0', text: '#eceff4' },
    vars: {
      // Nord Polar Night
      '--background': '220 16% 22%',        // #2e3440
      '--foreground': '219 28% 94%',         // #eceff4
      '--card': '222 16% 20%',               // #2b303b
      '--card-foreground': '219 28% 94%',
      '--popover': '220 16% 26%',            // #353c4a
      '--popover-foreground': '219 28% 94%',
      // Nord Frost - primary is nord8 (teal)
      '--primary': '193 43% 67%',            // #88c0d0
      '--primary-foreground': '220 16% 16%', // dark bg
      '--secondary': '220 16% 28%',          // #3b4252
      '--secondary-foreground': '219 28% 88%',// #d8dee9
      '--muted': '220 16% 26%',
      '--muted-foreground': '219 13% 63%',   // #7b88a1
      // Nord Frost - accent is nord9 (light blue)
      '--accent': '210 34% 63%',             // #81a1c1
      '--accent-foreground': '220 16% 16%',
      '--destructive': '354 42% 56%',        // #bf616a (nord11)
      '--destructive-foreground': '0 0% 100%',
      '--border': '220 16% 28%',             // #3b4252
      '--input': '220 16% 24%',
      '--ring': '193 43% 67%',               // nord8
      '--sidebar-background': '222 16% 18%', // darker polar night
      '--sidebar-foreground': '219 28% 88%',
      '--sidebar-primary': '193 43% 67%',
      '--sidebar-primary-foreground': '222 16% 18%',
      '--sidebar-accent': '220 16% 25%',
      '--sidebar-accent-foreground': '219 28% 94%',
      '--sidebar-border': '220 16% 25%',
      '--sidebar-ring': '193 43% 67%',
      '--silver-light': '210 34% 63%',       // nord9
      '--silver': '213 32% 52%',             // nord10
      '--silver-muted': '219 13% 53%',
      '--silver-dark': '220 16% 32%',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dark theme with vibrant colors',
    preview: { bg: '#282a36', sidebar: '#21222c', accent: '#bd93f9', text: '#f8f8f2' },
    vars: {
      // Dracula Background
      '--background': '231 15% 18%',         // #282a36
      '--foreground': '60 30% 96%',           // #f8f8f2
      '--card': '232 14% 17%',               // #272833
      '--card-foreground': '60 30% 96%',
      '--popover': '231 15% 22%',            // #313342
      '--popover-foreground': '60 30% 96%',
      // Dracula Purple
      '--primary': '265 89% 78%',            // #bd93f9
      '--primary-foreground': '231 15% 14%',
      '--secondary': '231 15% 24%',          // #343746
      '--secondary-foreground': '60 30% 90%',
      '--muted': '231 15% 22%',
      '--muted-foreground': '228 8% 56%',    // #6272a4 (comment)
      // Dracula Cyan
      '--accent': '191 97% 77%',             // #8be9fd
      '--accent-foreground': '231 15% 14%',
      '--destructive': '0 100% 67%',         // #ff5555
      '--destructive-foreground': '0 0% 100%',
      '--border': '231 15% 25%',             // #383a4a
      '--input': '231 15% 20%',
      '--ring': '265 89% 78%',               // purple
      '--sidebar-background': '235 14% 15%', // #21222c
      '--sidebar-foreground': '60 30% 90%',
      '--sidebar-primary': '265 89% 78%',
      '--sidebar-primary-foreground': '235 14% 15%',
      '--sidebar-accent': '231 15% 22%',
      '--sidebar-accent-foreground': '60 30% 96%',
      '--sidebar-border': '231 15% 22%',
      '--sidebar-ring': '265 89% 78%',
      '--silver-light': '265 89% 78%',       // purple
      '--silver': '191 97% 77%',             // cyan
      '--silver-muted': '135 94% 65%',       // green #50fa7b
      '--silver-dark': '231 15% 32%',
    },
  },
];

import supabase from '@/lib/supabase';

const THEME_STORAGE_KEY = 'crowbyte_theme';

export function getCurrentThemeId(): string {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'slate';
}

export function getTheme(id: string): AppTheme {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

/** Apply theme CSS vars + persist to localStorage and Supabase */
export function applyTheme(id: string): void {
  const theme = getTheme(id);
  const root = document.documentElement;

  // Set all CSS custom properties
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }

  // Store locally (instant, offline-safe)
  localStorage.setItem(THEME_STORAGE_KEY, id);

  // Sync to Supabase (fire-and-forget)
  syncThemeToCloud(id);

  // Dispatch event for any listeners
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId: id } }));
}

/** Sync theme preference to Supabase user_settings */
async function syncThemeToCloud(themeId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        theme: themeId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch {
    // Silent fail — localStorage is the fallback
  }
}

/**
 * Initialize theme — two phases:
 * 1. SYNC: Apply localStorage theme instantly (no flash)
 * 2. ASYNC: Check cloud for updates (silent override if different)
 */
export function initTheme(): void {
  // Phase 1: Instant — apply localStorage theme SYNCHRONOUSLY (kills the flash)
  const localId = getCurrentThemeId();
  if (localId !== 'slate') {
    applyThemeVars(localId);
  }

  // Phase 2: Background — check cloud for a different theme (e.g. set on another device)
  syncThemeFromCloud();
}

/** Background cloud sync — only overrides if cloud has a DIFFERENT theme */
async function syncThemeFromCloud(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('theme')
      .eq('user_id', user.id)
      .single();

    if (data?.theme && THEMES.some(t => t.id === data.theme)) {
      const currentLocal = getCurrentThemeId();
      if (data.theme !== currentLocal) {
        // Cloud has a different theme — apply it silently
        applyThemeVars(data.theme);
        localStorage.setItem(THEME_STORAGE_KEY, data.theme);
      }
    }
  } catch {
    // Cloud unavailable — localStorage is already applied
  }
}

/** Apply CSS vars only (no persistence, used by initTheme to avoid loops) */
function applyThemeVars(id: string): void {
  const theme = getTheme(id);
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId: id } }));
}
