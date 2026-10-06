import { useEffect, useState } from 'react';

/** Memoised first frames keyed by source so re-mounts and resizes don't redraw. */
const cache = new Map<string, string>();

/**
 * When `enabled`, returns a still PNG data URL of the first frame of `src` (drawn via canvas), or
 * undefined while that frame is loading or cannot be produced (jsdom, tainted cross-origin images,
 * load errors). It never falls back to the live `src`, so an animated GIF cannot leak frames before
 * the reveal completes. When not enabled, returns `src` unchanged.
 */
export function useStaticFrame(src: string | undefined, enabled: boolean): string | undefined {
  // Keyed by source so a frame captured for a previous image is never shown for the next one.
  const [frame, setFrame] = useState<{ src: string; url: string } | undefined>();

  useEffect(() => {
    if (!enabled || !src) {
      return;
    }
    if (cache.has(src)) {
      // Render already reads the cache directly; nothing to do.
      return;
    }
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let cancelled = false;
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (cancelled) {
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        cache.set(src, url);
        setFrame({ src, url });
      } catch {
        // Tainted canvas or unsupported; fall back to the live source.
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, enabled]);

  if (!enabled || !src) {
    return src;
  }
  return cache.get(src) ?? (frame?.src === src ? frame.url : undefined);
}
