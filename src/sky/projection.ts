// starnav — project a celestial object's horizontal coords (alt/az) onto the
// HUD field, relative to where you're aimed. A simple linear (az,alt) HUD
// projection: fine for a targeting view at moderate FOV. (A gnomonic tangent-
// plane projection is a later refinement if the edges feel stretched.)

export interface Aim { az: number; alt: number; }
export interface Projected { x: number; y: number; daz: number; dalt: number; inView: boolean; }

export const FIELD_W = 412;
export const FIELD_H = 470;
const CX = FIELD_W / 2;
const CY = FIELD_H / 2;
const FOV_X = 110; // degrees across the width
const PX = FIELD_W / FOV_X; // pixels per degree

/** shortest signed angular difference a−b, in [-180,180] */
export function angDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

/** Project (az,alt) around the aim → field coords + offsets + in-view flag. */
export function project(az: number, alt: number, aim: Aim): Projected {
  const daz = angDiff(az, aim.az);
  const dalt = alt - aim.alt;
  const x = CX + daz * PX;
  const y = CY - dalt * PX;
  const halfH = FIELD_H / PX / 2;
  const inView = Math.abs(daz) <= FOV_X / 2 + 6 && Math.abs(dalt) <= halfH + 6;
  return { x, y, daz, dalt, inView };
}

export const FIELD = { W: FIELD_W, H: FIELD_H, CX, CY, PX, FOV_X };
