// starnav — "point me": drive the aim from the phone's orientation sensor.
// Lessons baked in (from uptyme sky-tracking): iOS permission MUST be requested
// inside the click gesture; bind deviceorientationabsolute (Android) + webkit-
// CompassHeading (iOS); 3s guard so desktops (no compass) don't hang; rAF lerp
// for smoothing (never a CSS transition on a transform). HTTPS/localhost only.

import { useEffect, useRef, useState } from 'react';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export interface AimState {
  active: boolean;
  supported: boolean;
  aim: { az: number; alt: number } | null;
  error: string | null;
}

interface OrientEvent extends DeviceOrientationEvent { webkitCompassHeading?: number }

/** Where the back of the phone points, as horizontal coords (az from N, altitude). */
function orientationToAim(e: OrientEvent): { az: number; alt: number } | null {
  let alpha = e.alpha;
  const beta = e.beta;
  const gamma = e.gamma;
  if (alpha == null || beta == null || gamma == null) return null;
  if (typeof e.webkitCompassHeading === 'number') alpha = 360 - e.webkitCompassHeading; // iOS absolute heading

  const a = alpha * RAD, b = beta * RAD, g = gamma * RAD;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  // device +Z (out of screen) in world frame (E,N,Up); back camera = its negation
  const E = -(ca * sg + sa * sb * cg);
  const N = -(sa * sg - ca * sb * cg);
  const U = -(cb * cg);
  const alt = Math.asin(clamp(U, -1, 1)) * DEG;
  const az = (Math.atan2(E, N) * DEG + 360) % 360;
  return { az, alt };
}

function lerpAngle(from: number, to: number, t: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return from + d * t;
}

export function useDeviceAim(alpha = 0.1) {
  const [state, setState] = useState<AimState>({
    active: false,
    supported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    aim: null,
    error: null,
  });
  const alphaRef = useRef(alpha);
  alphaRef.current = alpha;
  const target = useRef<{ az: number; alt: number } | null>(null);
  const disp = useRef<{ az: number; alt: number } | null>(null);
  const raf = useRef(0);
  const gotEvent = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  const stop = () => {
    cleanup.current?.();
    cleanup.current = null;
    cancelAnimationFrame(raf.current);
    target.current = null;
    disp.current = null;
    gotEvent.current = false;
    setState((s) => ({ ...s, active: false, aim: null }));
  };

  const enable = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res !== 'granted') { setState((s) => ({ ...s, error: 'motion access denied' })); return; }
      } catch {
        setState((s) => ({ ...s, error: 'motion access denied' })); return;
      }
    }

    const onOrient = (ev: Event) => {
      const aim = orientationToAim(ev as OrientEvent);
      if (!aim) return;
      gotEvent.current = true;
      target.current = aim;
      if (!disp.current) disp.current = aim;
    };
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);

    const guard = window.setTimeout(() => {
      if (!gotEvent.current) { stop(); setState((s) => ({ ...s, error: 'no compass on this device' })); }
    }, 3000);

    cleanup.current = () => {
      window.clearTimeout(guard);
      window.removeEventListener('deviceorientationabsolute', onOrient, true);
      window.removeEventListener('deviceorientation', onOrient, true);
    };

    const loop = () => {
      const t = target.current, d = disp.current;
      if (t && d) {
        // rAF low-pass: lower alpha = smooths magnetometer noise / near-zenith
        // gimbal swing into a glide instead of a jump (Settings → Tracking).
        const a = alphaRef.current;
        const next = { az: (lerpAngle(d.az, t.az, a) + 360) % 360, alt: d.alt + (t.alt - d.alt) * a };
        disp.current = next;
        setState((s) => ({ ...s, aim: next }));
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    setState((s) => ({ ...s, active: true, error: null }));
  };

  useEffect(() => () => stop(), []);
  return { state, enable, disable: stop };
}
