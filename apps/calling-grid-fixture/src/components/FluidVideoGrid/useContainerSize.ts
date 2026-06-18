import {useEffect, useRef} from 'react';

/**
 * Observes size changes on `ref` via ResizeObserver and calls `onResize`
 * with the new content dimensions. Uses a stable callback ref so the
 * effect never needs to re-run when the caller's dispatch function changes.
 */
export function useContainerSize(
  ref: React.RefObject<HTMLDivElement | null>,
  onResize: (width: number, height: number) => void,
) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastW = 0;
    let lastH = 0;
    const ro = new ResizeObserver(([entry]) => {
      // Round to integers — sub-pixel fluctuations (e.g. 799.98 vs 800.00)
      // would otherwise cause an infinite dispatch → re-render → resize loop.
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width !== lastW || height !== lastH) {
        lastW = width;
        lastH = height;
        onResizeRef.current(width, height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
