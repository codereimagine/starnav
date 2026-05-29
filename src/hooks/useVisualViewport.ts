import { useEffect, useState } from 'react';

export interface VisualViewportState {
  width: number;
  height: number;
  offsetTop: number;
}

const EMPTY: VisualViewportState = { width: 0, height: 0, offsetTop: 0 };

function getSnapshot(): VisualViewportState {
  if (typeof window === 'undefined' || !window.visualViewport) return EMPTY;
  return {
    width: window.visualViewport.width,
    height: window.visualViewport.height,
    offsetTop: window.visualViewport.offsetTop,
  };
}

/**
 * Tracks the visual viewport — the rectangle actually visible to the user, which
 * shrinks when the on-screen keyboard appears on iOS Safari / Android Chrome and
 * excludes the browser toolbar. CSS units (vh/dvh/svh) don't account for the
 * keyboard (OS overlay); this bridges the gap. {0,0,0} when unavailable — treat
 * as "fall back to window.inner* / CSS sizing." Ported from the trilogy.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(getSnapshot);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setState({ width: vv.width, height: vv.height, offsetTop: vv.offsetTop });
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}
