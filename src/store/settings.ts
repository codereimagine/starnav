import { useSyncExternalStore } from 'react';

// starnav settings — module-level shared state via useSyncExternalStore so every
// component sees the SAME values (Settings + App). Ported from the trilogy.

export type Theme = 'dark' | 'light' | 'night' | 'auto';
export type Animations = 'on' | 'reduce' | 'off';
export type Smoothness = 'smooth' | 'responsive';
export type StarLabels = 'on' | 'off';

interface SettingsState {
  theme: Theme;
  animations: Animations;
  smoothness: Smoothness;
  labels: StarLabels;
}

const STORAGE_KEY = 'starnav.settings';
const DEFAULTS: SettingsState = { theme: 'dark', animations: 'on', smoothness: 'smooth', labels: 'on' };

const THEMES: readonly Theme[] = ['dark', 'light', 'night', 'auto'];
const ANIMS: readonly Animations[] = ['on', 'reduce', 'off'];
const SMOOTHS: readonly Smoothness[] = ['smooth', 'responsive'];
const LABELS: readonly StarLabels[] = ['on', 'off'];

/** rAF low-pass factor for point-me — lower = smoother (more lag).
 *  Wide gap: Smooth glides (heavy damping); Responsive tracks near-instantly. */
export const smoothnessAlpha = (s: Smoothness): number => (s === 'responsive' ? 0.42 : 0.07);

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

function readPersisted(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const o = parsed as Record<string, unknown>;
      return {
        theme: pickEnum(o.theme, THEMES, DEFAULTS.theme),
        animations: pickEnum(o.animations, ANIMS, DEFAULTS.animations),
        smoothness: pickEnum(o.smoothness, SMOOTHS, DEFAULTS.smoothness),
        labels: pickEnum(o.labels, LABELS, DEFAULTS.labels),
      };
    }
  } catch { /* ignore */ }
  return DEFAULTS;
}

let state: SettingsState = readPersisted();
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function getSnapshot(): SettingsState { return state; }

function emit(next: SettingsState) {
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyTheme(next.theme);
  applyAnimations(next.animations);
  listeners.forEach((l) => l());
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove('theme-dark', 'theme-light', 'theme-night', 'theme-auto');
  html.classList.add(`theme-${theme}`);
}
export function applyAnimations(a: Animations): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove('anim-on', 'anim-reduce', 'anim-off');
  html.classList.add(`anim-${a}`);
}

if (typeof document !== 'undefined') {
  applyTheme(state.theme);
  applyAnimations(state.animations);
}

export interface UseSettingsResult extends SettingsState {
  setTheme: (v: Theme) => void;
  setAnimations: (v: Animations) => void;
  setSmoothness: (v: Smoothness) => void;
  setLabels: (v: StarLabels) => void;
  resetDefaults: () => void;
}

export function useSettings(): UseSettingsResult {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snap,
    setTheme: (v) => emit({ ...state, theme: v }),
    setAnimations: (v) => emit({ ...state, animations: v }),
    setSmoothness: (v) => emit({ ...state, smoothness: v }),
    setLabels: (v) => emit({ ...state, labels: v }),
    resetDefaults: () => {
      try {
        localStorage.removeItem('starnav.settings');
        localStorage.removeItem('starnav.observer');
        localStorage.removeItem('starnav.target');
      } catch { /* ignore */ }
      window.location.reload();
    },
  };
}
