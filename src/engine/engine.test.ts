// The P1 verification fixtures, carried forward as the app's test suite
// (proof over verdict survives the vanilla → TS port). Run: npm test
import { describe, it, expect } from 'vitest';
import { raDecToAltAz, gmstHours } from './altaz';
import { star } from './stars';
import { kepler, helioLBR, sunEclipticLongitude, centuriesT } from './planets';

const ARCMIN = 1 / 60;
const LAT = 40.21;

describe('P1.1 transform — Meeus "Astronomical Algorithms" (2nd ed)', () => {
  it('Ex.13.b alt/az (Venus over Washington)', () => {
    const lst = ((128.73787 + -(77 + 3 / 60 + 56 / 3600)) % 360 + 360) % 360;
    const ra = (23 + 9 / 60 + 16.641 / 3600) * 15;
    const dec = -(6 + 43 / 60 + 11.61 / 3600);
    const lat = 38 + 55 / 60 + 17 / 3600;
    const { alt, az } = raDecToAltAz({ lstDeg: lst, latDeg: lat, raDeg: ra, decDeg: dec });
    expect(Math.abs(alt - 15.1249)).toBeLessThan(ARCMIN);
    expect(Math.abs(az - (68.0337 + 180))).toBeLessThan(ARCMIN);
  });
  it('Ex.12.a GMST (mean ST at 0h)', () => {
    const g = gmstHours(new Date(Date.UTC(1987, 3, 10, 0, 0, 0))) * 15;
    expect(Math.abs(g - 197.693195)).toBeLessThan(ARCMIN);
  });
});

describe('P1.2 stars — meridian-altitude reference (90 − |φ − δ|)', () => {
  const meridianAlt = (dec: number): number => 90 - Math.abs(LAT - dec);
  const transit = (s: { ra: number; dec: number }) =>
    raDecToAltAz({ lstDeg: s.ra, latDeg: LAT, raDeg: s.ra, decDeg: s.dec });
  it('Vega coordinates are standard J2000', () => {
    const v = star('Vega')!;
    expect(Math.abs(v.ra - 279.234734)).toBeLessThan(0.001);
    expect(Math.abs(v.dec - 38.783689)).toBeLessThan(0.001);
  });
  it('Vega transit — south culmination', () => {
    const v = star('Vega')!;
    const t = transit(v);
    expect(Math.abs(t.alt - meridianAlt(v.dec))).toBeLessThan(ARCMIN);
    expect(Math.abs(t.az - 180)).toBeLessThan(ARCMIN);
  });
  it('Capella transit — north culmination', () => {
    const c = star('Capella')!;
    const t = transit(c);
    expect(Math.abs(t.alt - meridianAlt(c.dec))).toBeLessThan(ARCMIN);
    expect(Math.abs(t.az - 0)).toBeLessThan(ARCMIN);
  });
});

describe('P1.3 planets — pipeline anchors', () => {
  it('Kepler solver residual ≈ 0', () => {
    for (const [M, e] of [[120, 0.2056], [300, 0.0484], [179, 0.9]] as const) {
      const E = kepler(M, e);
      const back = (E - e * Math.sin(E)) / (Math.PI / 180);
      const resid = Math.abs((((back - M) % 360) + 540) % 360 - 180) * 3600;
      expect(resid).toBeLessThan(1e-3);
    }
  });
  it('Sun longitude at J2000.0 — Standish vs independent Meeus', () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const T = centuriesT(j2000);
    const L0 = ((280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360 + 360) % 360;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * (Math.PI / 180);
    const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    const meeus = ((L0 + C) % 360 + 360) % 360;
    expect(Math.abs(sunEclipticLongitude(j2000) - meeus)).toBeLessThan(ARCMIN);
  });
  it('Venus heliocentric distance — Meeus Ex.33.a', () => {
    const v = helioLBR('Venus', new Date(Date.UTC(1992, 11, 20, 0, 0, 0)));
    expect(Math.abs(v.R - 0.724603)).toBeLessThan(5e-4);
  });
});
