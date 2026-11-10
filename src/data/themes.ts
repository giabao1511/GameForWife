/**
 * Theme & room-customization presets ("Đổi Bối Cảnh & Chủ Đề").
 *
 * A theme is the SINGLE source of the app's ambient look: it owns the
 * background gradient, the ambient particle system, the on-theme card/text
 * colors, and an optional looping ambient audio bed. When the real-time
 * sync toggle is ON the wall clock picks one of these automatically
 * (see resolveClockTheme); when OFF the player's manual pick wins 100%.
 *
 * Pure data + pure functions only — no React, no store — so it stays trivial
 * to import from the store, the canvas, the modal, and the test suite.
 */
export interface AppTheme {
  id: 'pastel' | 'rainy_cafe' | 'sunset' | 'starry_camp';
  name: string;
  badge: string;
  /** Tailwind gradient color stops (applied to a `bg-gradient-to-br` layer). */
  bgGradient: string;
  particleType: 'hearts' | 'rain' | 'petals' | 'stars';
  /** Optional looping ambient bed, served from /public/audio. */
  ambientAudio?: string;
  /** Readable text color for the active background. */
  textColor: string;
  /** Surface color (bg + border) for the game card / panels on this background. */
  cardBg: string;
  /** Readable text color *inside* the card (contrasts with cardBg). */
  cardText: string;
  /** Per-theme accent (sparkle color, focus ring, CTA tint). */
  accent: string;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'pastel',
    name: 'Kẹo Ngọt (Mặc định)',
    badge: '🌸',
    bgGradient: 'from-pink-100 via-rose-50 to-pink-200',
    particleType: 'hearts',
    textColor: 'text-rose-950',
    cardBg: 'bg-white/90',
    cardText: 'text-[#4a3f35]',
    accent: '#e5484d',
  },
  {
    id: 'rainy_cafe',
    name: 'Tiệm Cà Phê Mưa',
    badge: '☕',
    bgGradient: 'from-amber-950/20 via-stone-800/25 to-stone-900/30',
    particleType: 'rain',
    ambientAudio: '/audio/rain-ambient.mp3',
    textColor: 'text-amber-950',
    cardBg: 'bg-amber-50/95',
    cardText: 'text-stone-900',
    accent: '#d97706',
  },
  {
    id: 'sunset',
    name: 'Hoàng Hôn Bờ Kè',
    badge: '🌇',
    bgGradient: 'from-orange-200 via-rose-300 to-purple-400',
    particleType: 'petals',
    textColor: 'text-purple-950',
    cardBg: 'bg-white/95',
    cardText: 'text-purple-950',
    accent: '#f97316',
  },
  {
    id: 'starry_camp',
    name: 'Doanh Trại Đêm Trăng',
    badge: '⛺',
    bgGradient: 'from-slate-950 via-indigo-950 to-slate-900',
    particleType: 'stars',
    ambientAudio: '/audio/crickets-ambient.mp3',
    textColor: 'text-indigo-100',
    cardBg: 'bg-slate-900/90 border border-indigo-500/30 text-white',
    cardText: 'text-slate-100',
    accent: '#818cf8',
  },
];

export type AppThemeId = AppTheme['id'];

/** O(1) lookup by id (keeps the store + modal from re-scanning the array). */
export const THEME_BY_ID: Record<AppThemeId, AppTheme> = APP_THEMES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<AppThemeId, AppTheme>,
);

/**
 * Map the local wall clock onto a theme for the "Đồng bộ theo thời gian thực"
 * auto-switch. The boundaries are hour-based (per spec) and are intentionally
 * INDEPENDENT of lib/timeContext's 4-period ambience model:
 *
 *   06:00–16:59  → pastel       (soft daylight romance)
 *   17:00–19:59  → sunset       (warm twilight breeze)
 *   20:00–05:59  → starry_camp  (twinkling star camp)
 */
export function resolveClockTheme(hour: number | Date = new Date()): AppThemeId {
  const h = typeof hour === 'number' ? hour : hour.getHours();
  if (h >= 17 && h < 20) return 'sunset';
  if (h >= 20 || h < 6) return 'starry_camp';
  return 'pastel'; // 06:00–16:59
}

/** Validate a persisted theme id; anything unknown falls back to the default. */
export function themeFromStored(raw: string | null): AppThemeId {
  if (raw && raw in THEME_BY_ID) return raw as AppThemeId;
  return 'pastel';
}

// ── Persistence shape ─────────────────────────────────────────────
/** The full theme preference, persisted under bf_sim_theme as JSON. */
export interface ThemeConfig {
  /** The player's manual theme pick (authoritative when sync is OFF). */
  theme: AppThemeId;
  /** "Đồng bộ theo thời gian thực" — when true the clock drives the theme. */
  sync: boolean;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = { theme: 'pastel', sync: false };

const LS_THEME_KEY = 'bf_sim_theme';

/** Read + validate the persisted preference (SSR-safe, returns defaults). */
export function loadThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;
  try {
    const raw = window.localStorage.getItem(LS_THEME_KEY);
    if (!raw) return DEFAULT_THEME_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ThemeConfig> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_THEME_CONFIG;
    return {
      theme: themeFromStored(typeof parsed.theme === 'string' ? parsed.theme : null),
      sync: parsed.sync === true,
    };
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
}

/** Persist the preference (SSR-safe; storage failures are swallowed). */
export function saveThemeConfig(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_THEME_KEY, JSON.stringify(config));
  } catch {
    // Storage may be unavailable (private mode) — in-memory state still works.
  }
}

/**
 * Resolve the theme that is actually active *right now*:
 *   sync ON  → follow the real clock (resolveClockTheme)
 *   sync OFF → the player's manual pick
 * This is the single seam the UI reads from, so one call never conflicts with
 * the clock-driven ambience layer.
 */
export function resolveActiveTheme(
  config: ThemeConfig,
  now: Date = new Date(),
): AppTheme {
  const id = config.sync ? resolveClockTheme(now) : config.theme;
  return THEME_BY_ID[id];
}

/** Default export kept for a stable, greppable handle on the storage key. */
export { LS_THEME_KEY as THEME_STORAGE_KEY };

