// starnav — naked-eye planet positions via the JPL/Standish low-precision
// Keplerian elements (1800–2050 set). Heliocentric Kepler position → geocentric
// → equatorial (J2000) → the alt/az transform. Verified — see engine.test.ts.
import { RAD, daysSinceJ2000, raDecToAltAz, localSiderealTimeDeg, type AltAz } from './altaz';

const OBLIQ = 23.43928 * RAD; // mean obliquity of the ecliptic, J2000

/** [J2000 value, rate per Julian century] */
type El = [number, number];
interface Elements { a: El; e: El; I: El; L: El; peri: El; node: El; }

const ELEMENTS: Record<string, Elements> = {
  Mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], peri: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081] },
  Venus:   { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], peri: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418] },
  Earth:   { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0.0, 0.0] },
  Mars:    { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], peri: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343] },
  Jupiter: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
  Saturn:  { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] },
};

export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
export const PLANETS: PlanetName[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

interface Vec3 { x: number; y: number; z: number; }

const norm360 = (x: number): number => ((x % 360) + 360) % 360;
const wrap180 = (x: number): number => { const n = norm360(x); return n > 180 ? n - 360 : n; };

/** centuries past J2000 */
export const centuriesT = (date: Date): number => daysSinceJ2000(date) / 36525;

/** Solve Kepler's equation E − e·sin E = M (M in degrees); returns E in radians. */
export function kepler(Mdeg: number, e: number): number {
  const M = wrap180(Mdeg) * RAD;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 20; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-11) break;
  }
  return E;
}

/** Heliocentric ecliptic (J2000) rectangular coordinates (AU). */
export function helioXYZ(planet: string, date: Date): Vec3 {
  const T = centuriesT(date);
  const el = ELEMENTS[planet];
  const g = (x: El): number => x[0] + x[1] * T;
  const a = g(el.a);
  const e = g(el.e);
  const omega = (g(el.peri) - g(el.node)) * RAD;
  const E = kepler(g(el.L) - g(el.peri), e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const I = g(el.I) * RAD;
  const O = g(el.node) * RAD;
  const cw = Math.cos(omega), sw = Math.sin(omega), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: (sw * sI) * xp + (cw * sI) * yp,
  };
}

/** Heliocentric ecliptic longitude/latitude (deg) + radius (AU). */
export function helioLBR(planet: string, date: Date): { L: number; B: number; R: number } {
  const { x, y, z } = helioXYZ(planet, date);
  const R = Math.hypot(x, y, z);
  return { L: norm360(Math.atan2(y, x) / RAD), B: Math.asin(z / R) / RAD, R };
}

/** Geocentric equatorial RA/Dec (deg, J2000) + Earth-distance (AU). */
export function planetRaDec(planet: PlanetName, date: Date): { ra: number; dec: number; dist: number } {
  const p = helioXYZ(planet, date);
  const ea = helioXYZ('Earth', date);
  const X = p.x - ea.x, Y = p.y - ea.y, Z = p.z - ea.z;
  const Xe = X;
  const Ye = Y * Math.cos(OBLIQ) - Z * Math.sin(OBLIQ);
  const Ze = Y * Math.sin(OBLIQ) + Z * Math.cos(OBLIQ);
  return {
    ra: norm360(Math.atan2(Ye, Xe) / RAD),
    dec: Math.atan2(Ze, Math.hypot(Xe, Ye)) / RAD,
    dist: Math.hypot(X, Y, Z),
  };
}

/** Geometric geocentric ecliptic longitude of the SUN (deg) = Earth helio + 180°. */
export function sunEclipticLongitude(date: Date): number {
  const e = helioXYZ('Earth', date);
  return norm360(Math.atan2(-e.y, -e.x) / RAD);
}

/** alt/az for a planet at a UTC instant + observer (lon east-positive). */
export function planetAltAz(planet: PlanetName, date: Date, latDeg: number, lonEastDeg: number): AltAz {
  const { ra, dec } = planetRaDec(planet, date);
  return raDecToAltAz({ lstDeg: localSiderealTimeDeg(date, lonEastDeg), latDeg, raDeg: ra, decDeg: dec });
}
