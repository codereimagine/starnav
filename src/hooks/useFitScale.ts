import { useLayoutEffect, useState, type RefObject } from 'react';
import { useVisualViewport } from './useVisualViewport';

/**
 * Scale-to-fit: the factor that makes `ref`'s natural (untransformed) box fit
 * inside the visible viewport, capped at 1 (scale-DOWN only — keeps text/SVG
 * crisp). The stage is top-aligned in CSS (.stage-wrap), so this governs size,
 * not position. offsetWidth/Height report LAYOUT size (immune to transforms),
 * so applying the result via transform doesn't feed back into the measurement.
 * Ported from the trilogy.
 */
export function useFitScale(ref: RefObject<HTMLElement | null>): number {
  const vv = useVisualViewport();
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      let availW = vv.width || window.innerWidth;
      let availH = vv.height || window.innerHeight;
      // The stage reserves the safe-area insets as padding, so the phone must
      // fit the stage's CONTENT box, not the raw viewport — otherwise it scales
      // to the full height then gets shoved down by the top inset and spills
      // past the bottom (the "bleed").
      const parent = el.parentElement;
      if (parent) {
        const cs = getComputedStyle(parent);
        availW -= parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        availH -= parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      }
      const natW = el.offsetWidth;
      const natH = el.offsetHeight;
      if (!natW || !natH || !availW || !availH) return;
      setScale(Math.min(availW / natW, availH / natH, 1));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [ref, vv.width, vv.height]);

  return scale;
}
