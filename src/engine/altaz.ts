// starnav celestial engine — RA/Dec → alt/az transform.
// Seeded byte-faithfully from uptyme's verified engine (J2000-noon epoch,
// low-precision GMST, spherical alt/az). Verified to arcminute vs Meeus — see
// engine.test.ts. Conventions: longitude EAST-positive; azimuth 0=N, 90=E.
// All angles in degrees.

export const RAD = Math.PI / 180;
const J2000_NOON_MS = Date.UTC(2000, 0, 1, 12); // J2000.0 epoch

export interface AltAz {
  /** degrees above the horizon (negative = below) */
  alt: number;
  /** compass azimuth, 0=N 90=E 180=S 270=W */
  az: number;
  /** hour angle, degrees [-180,180] */
  ha: number;
}

/** Days since the J2000.0 epoch. */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_NOON_MS) / 86400000;
}

/** Greenwich Mean Sidereal Time in hours, [0,24). */
export function gmstHours(date: Date): number {
  const h = (18.697374558 + 24.06570982441908 * daysSinceJ2000(date)) % 24;
  return (h + 24) % 24;
}

/** Local (mean) Sidereal Time in degrees, [0,360). lonEastDeg positive east. */
export function localSiderealTimeDeg(date: Date, lonEastDeg: number): number {
  return ((gmstHours(date) * 15 + lonEastDeg) % 360 + 360) % 360;
}

/** Equatorial (RA/Dec) → horizontal (alt/az) for a given Local Sidereal Time. */
export function raDecToAltAz(p: {
  lstDeg: number;
  latDeg: number;
  raDeg: number;
  decDeg: number;
}): AltAz {
  const ha = ((p.lstDeg - p.raDeg + 540) % 360) - 180;
  const lat = p.latDeg * RAD;
  const dec = p.decDeg * RAD;
  const H = ha * RAD;
  const alt =
    Math.asin(
      Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)
    ) / RAD;
  let az =
    Math.atan2(
      -Math.sin(H),
      Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H)
    ) / RAD;
  az = (az + 360) % 360;
  return { alt, az, ha };
}

/** alt/az for a target (RA/Dec) at a UTC instant + observer (lon east-positive). */
export function altAzAt(
  date: Date,
  latDeg: number,
  lonEastDeg: number,
  raDeg: number,
  decDeg: number
): AltAz {
  return raDecToAltAz({
    lstDeg: localSiderealTimeDeg(date, lonEastDeg),
    latDeg,
    raDeg,
    decDeg,
  });
}
