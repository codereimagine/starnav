// starnav — where the observer is standing.
// Geolocation sensor first; if denied/unavailable, a CITY SEARCH by name (not
// everyone knows their lat/long); then saved/default. Coords kept LOCAL; the
// only network is the user-initiated geocoding lookup (zero-net + privacy).

export interface Observer {
  lat: number;
  lon: number;
  name?: string;
  source: 'gps' | 'search' | 'default';
}

export interface Place {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  source: 'search';
}

export const DEFAULT_OBSERVER: Observer = { lat: 40.21, lon: -74.04, name: 'default', source: 'default' };
const STORE_KEY = 'starnav.observer';

/** Try the on-device geolocation sensor. */
export function geolocate({ timeoutMs = 8000 }: { timeoutMs?: number } = {}): Promise<Observer> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('no-geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, source: 'gps' }),
      (err) => reject(err),
      { timeout: timeoutMs, maximumAge: 600000, enableHighAccuracy: false }
    );
  });
}

/** Accessible fallback: search a place by NAME (open-meteo geocoding, keyless). */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('geocode-failed');
  const data: { results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }> } =
    await res.json();
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1 ?? '',
    country: r.country ?? '',
    lat: r.latitude,
    lon: r.longitude,
    source: 'search' as const,
  }));
}

export function saveObserver(o: Observer): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(o));
  } catch { /* ignore */ }
}

export function loadObserver(): Observer {
  try {
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(STORE_KEY);
      if (s) return JSON.parse(s) as Observer;
    }
  } catch { /* ignore */ }
  return DEFAULT_OBSERVER;
}
