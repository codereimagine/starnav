import { describe, expect, it, vi } from 'vitest';
import { acquireLocation, fetchIpLocation, GEO_ENABLED_KEY, IP_ENDPOINT, readGeoEnabled, validCoords, writeGeoEnabled } from './geo';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    map: m,
  };
}

type Outcome = 'ok' | 'error' | 'hang';
function fakeGeo(outcome: Outcome) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, err?: PositionErrorCallback | null) => {
    if (outcome === 'ok') ok({ coords: { latitude: 40.71, longitude: -74.01 } } as GeolocationPosition);
    if (outcome === 'error') err?.({ code: 1, message: 'denied' } as GeolocationPositionError);
    // 'hang': never calls back (seen on Chrome iOS)
  });
  return { getCurrentPosition } as unknown as Geolocation & { getCurrentPosition: typeof getCurrentPosition };
}

function fakeFetch(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('validCoords', () => {
  it('accepts real coords and rejects out-of-range, non-finite and 0,0', () => {
    expect(validCoords(40.71, -74.01)).toBe(true);
    expect(validCoords(91, 0)).toBe(false);
    expect(validCoords(0, 181)).toBe(false);
    expect(validCoords(Number.NaN, 1)).toBe(false);
    expect(validCoords('40', 1)).toBe(false);
    expect(validCoords(0, 0)).toBe(false);
  });
});

describe('location mode', () => {
  it('is ON by default and persists OFF', () => {
    const kv = memoryStorage();
    expect(readGeoEnabled(kv)).toBe(true);
    writeGeoEnabled(false, kv);
    expect(kv.map.get(GEO_ENABLED_KEY)).toBe('0');
    expect(readGeoEnabled(kv)).toBe(false);
    writeGeoEnabled(true, kv);
    expect(readGeoEnabled(kv)).toBe(true);
  });
});

describe('fetchIpLocation', () => {
  it('reads ipwho.is coordinates', async () => {
    const f = fakeFetch({ success: true, latitude: 40.7, longitude: -74.0 });
    expect(await fetchIpLocation(f)).toEqual({ lat: 40.7, lon: -74.0 });
    expect(f).toHaveBeenCalledWith(IP_ENDPOINT, expect.anything());
  });
  it('returns null on failure, bad data, HTTP error or network error', async () => {
    expect(await fetchIpLocation(fakeFetch({ success: false }))).toBeNull();
    expect(await fetchIpLocation(fakeFetch({ success: true, latitude: 0, longitude: 0 }))).toBeNull();
    expect(await fetchIpLocation(fakeFetch({}, false))).toBeNull();
    expect(await fetchIpLocation((async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toBeNull();
  });
});

describe('acquireLocation', () => {
  const ipBody = { success: true, latitude: 40.7, longitude: -74.0 };

  it('uses GPS when it answers, and never calls the network', async () => {
    const f = fakeFetch(ipBody);
    expect(await acquireLocation({ enabled: true, geo: fakeGeo('ok'), fetchImpl: f })).toEqual({ lat: 40.71, lon: -74.01, approximate: false });
    expect(f).not.toHaveBeenCalled();
  });

  it('falls back to the network when GPS is denied/fails', async () => {
    const f = fakeFetch(ipBody);
    expect(await acquireLocation({ enabled: true, geo: fakeGeo('error'), fetchImpl: f })).toEqual({ lat: 40.7, lon: -74.0, approximate: true });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('falls back to the network when GPS never answers (watchdog)', async () => {
    const f = fakeFetch(ipBody);
    expect(await acquireLocation({ enabled: true, geo: fakeGeo('hang'), fetchImpl: f, watchdogMs: 20 })).toEqual({ lat: 40.7, lon: -74.0, approximate: true });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('falls back to the network when the browser has no geolocation API', async () => {
    expect(await acquireLocation({ enabled: true, geo: undefined, fetchImpl: fakeFetch(ipBody) })).toEqual({ lat: 40.7, lon: -74.0, approximate: true });
  });

  it('returns null when both GPS and the network fail', async () => {
    expect(await acquireLocation({ enabled: true, geo: fakeGeo('error'), fetchImpl: fakeFetch({ success: false }) })).toBeNull();
  });

  it('switching to OFF while GPS is pending: no network request, nothing returned', async () => {
    let auto = true;
    const f = fakeFetch(ipBody);
    const p = acquireLocation({ enabled: () => auto, geo: fakeGeo('hang'), fetchImpl: f, watchdogMs: 30 });
    auto = false;   // user flips the kill switch mid-flight
    expect(await p).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('switching to OFF while the network lookup is in flight: result discarded', async () => {
    let auto = true;
    const f = vi.fn(async () => { auto = false; return { ok: true, json: async () => ipBody } as Response; }) as unknown as typeof fetch;
    expect(await acquireLocation({ enabled: () => auto, geo: fakeGeo('error'), fetchImpl: f })).toBeNull();
  });

  it('switching to OFF before GPS answers: GPS result discarded', async () => {
    let auto = true;
    let answer: PositionCallback = () => {};
    const geo = { getCurrentPosition: (ok: PositionCallback) => { answer = ok; } } as unknown as Geolocation;
    const p = acquireLocation({ enabled: () => auto, geo, fetchImpl: fakeFetch(ipBody) });
    auto = false;
    answer({ coords: { latitude: 40.71, longitude: -74.01 } } as GeolocationPosition);
    expect(await p).toBeNull();
  });

  it('OFF mode (kill switch): no GPS request and no network request', async () => {
    const geo = fakeGeo('ok');
    const f = fakeFetch(ipBody);
    expect(await acquireLocation({ enabled: false, geo, fetchImpl: f })).toBeNull();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });
});
