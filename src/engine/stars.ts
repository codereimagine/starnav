// starnav — bright named-star catalog (a Hipparcos subset). J2000 equatorial
// coordinates in degrees, visual magnitudes, an approximate spectral tint.

export interface Star {
  name: string;
  con: string;
  /** right ascension, degrees (J2000) */
  ra: number;
  /** declination, degrees (J2000) */
  dec: number;
  /** visual magnitude */
  mag: number;
  /** spectral tint for rendering */
  color: string;
}

export const STARS: Star[] = [
  { name: 'Sirius',     con: 'CMa', ra: 101.287155, dec: -16.716116, mag: -1.46, color: '#CBD8FF' },
  { name: 'Canopus',    con: 'Car', ra:  95.987958, dec: -52.695661, mag: -0.74, color: '#FFF4E6' },
  { name: 'Arcturus',   con: 'Boo', ra: 213.915300, dec:  19.182409, mag: -0.05, color: '#FFD9A0' },
  { name: 'Vega',       con: 'Lyr', ra: 279.234734, dec:  38.783689, mag:  0.03, color: '#CFE0FF' },
  { name: 'Capella',    con: 'Aur', ra:  79.172328, dec:  45.997991, mag:  0.08, color: '#FFE9B8' },
  { name: 'Rigel',      con: 'Ori', ra:  78.634467, dec:  -8.201638, mag:  0.13, color: '#CFE0FF' },
  { name: 'Procyon',    con: 'CMi', ra: 114.825498, dec:   5.224993, mag:  0.34, color: '#FFFAF0' },
  { name: 'Betelgeuse', con: 'Ori', ra:  88.792939, dec:   7.407064, mag:  0.50, color: '#FFB48A' },
  { name: 'Altair',     con: 'Aql', ra: 297.695827, dec:   8.868321, mag:  0.77, color: '#F2F5FF' },
  { name: 'Aldebaran',  con: 'Tau', ra:  68.980163, dec:  16.509302, mag:  0.85, color: '#FFC58A' },
  { name: 'Antares',    con: 'Sco', ra: 247.351915, dec: -26.432002, mag:  1.06, color: '#FFA070' },
  { name: 'Spica',      con: 'Vir', ra: 201.298247, dec: -11.161319, mag:  1.04, color: '#C9D6FF' },
  { name: 'Pollux',     con: 'Gem', ra: 116.328958, dec:  28.026199, mag:  1.14, color: '#FFD9A0' },
  { name: 'Fomalhaut',  con: 'PsA', ra: 344.412693, dec: -29.622237, mag:  1.16, color: '#EFF3FF' },
  { name: 'Deneb',      con: 'Cyg', ra: 310.357958, dec:  45.280339, mag:  1.25, color: '#EAF0FF' },
  { name: 'Regulus',    con: 'Leo', ra: 152.092962, dec:  11.967209, mag:  1.40, color: '#CFE0FF' },
  { name: 'Polaris',    con: 'UMi', ra:  37.954561, dec:  89.264109, mag:  1.98, color: '#FFF1DA' },
  { name: 'Sadr',       con: 'Cyg', ra: 305.557089, dec:  40.256679, mag:  2.23, color: '#FFF4E6' },
  { name: 'Gienah',     con: 'Cyg', ra: 311.552923, dec:  33.970256, mag:  2.48, color: '#FFD9A0' },
  { name: 'Albireo',    con: 'Cyg', ra: 292.680420, dec:  27.959681, mag:  3.08, color: '#FFCF9A' },
];

/** Look up a star by name (case-insensitive). */
export function star(name: string): Star | null {
  const k = name.toLowerCase();
  return STARS.find((s) => s.name.toLowerCase() === k) ?? null;
}
