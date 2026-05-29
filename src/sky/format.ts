// starnav — small shared formatters + the sky-object shape used across the HUD.

export interface SkyObj {
  name: string;
  kind: 'star' | 'planet';
  color: string;
  mag: number; // planets carry -1 (magnitude not computed); branch on kind for display
  alt: number;
  az: number;
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compass = (az: number): string => DIRS[Math.round((((az % 360) + 360) % 360) / 45) % 8];
export const pad3 = (n: number): string => String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0');
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
