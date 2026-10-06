import React, { useEffect, useRef, useState } from 'react';
import { RevealImage, Stage, clamp01, fmt } from './shared';
import { blurStyle } from './blur';

export const DEFAULT_PIXEL_MAX_SIZE = 40;

/** Block size in px at progress p (1 = full resolution). */
export function pixelBlock(p: number, maxSize: number): number {
  return Math.max(1, Math.round((1 - clamp01(p)) * maxSize));
}

type LoadState = 'loading' | 'ready' | 'failed' | 'tainted';

interface Loaded {
  src: string;
  img: HTMLImageElement | null;
  state: LoadState;
}

/**
 * Loads `src` into a detached <img> suitable for canvas drawing. Non-data URLs are requested with
 * crossOrigin="anonymous" so the canvas is not tainted; if the server refuses, the load fails and the
 * caller falls back to a CSS rendering. A 1x1 test draw + getImageData detects a tainted canvas.
 */
function useDecodedImage(src: string): { img: HTMLImageElement | null; state: LoadState } {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    let cancelled = false;
    const el = new Image();
    if (!/^data:/i.test(src)) {
      el.crossOrigin = 'anonymous';
    }
    el.onload = () => {
      if (cancelled) {
        return;
      }
      setLoaded({ src, img: el, state: canDraw(el) ? 'ready' : 'tainted' });
    };
    el.onerror = () => {
      if (!cancelled) {
        setLoaded({ src, img: null, state: 'failed' });
      }
    };
    el.src = src;
    return () => {
      cancelled = true;
      el.onload = null;
      el.onerror = null;
    };
  }, [src]);
  if (!loaded || loaded.src !== src) {
    return { img: null, state: 'loading' };
  }
  return { img: loaded.img, state: loaded.state };
}

function canDraw(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d');
    if (!ctx) {
      return true; // cannot verify (jsdom); the draw effect guards getContext anyway
    }
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch (e) {
    return false;
  }
}

export interface PixelCanvasProps {
  src: string;
  p: number;
  width: number;
  height: number;
  maxSize: number;
  isGif: boolean;
  /** Extra CSS filter applied on top of the canvas (used by combo). */
  filter?: string;
  /** Extra styles applied to the outer stage (clip-path / mask for combo). */
  stageStyle?: React.CSSProperties;
}

/**
 * Canvas pixelation: downscale into an offscreen canvas with smoothing, then upscale without smoothing.
 * For GIFs the browser hands us a single (static) frame; nothing else is attempted.
 * If drawing throws (tainted canvas) or the image cannot be loaded, falls back to a CSS blur of
 * matching strength so the panel still degrades the image.
 */
export function PixelCanvas({ src, p, width, height, maxSize, filter, stageStyle }: PixelCanvasProps) {
  const v = clamp01(p);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const { img, state } = useDecodedImage(src);
  const block = pixelBlock(v, maxSize);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img || state !== 'ready' || v >= 1) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return; // jsdom / unsupported
    }
    try {
      ctx.clearRect(0, 0, width, height);
      if (block === 1) {
        ctx.imageSmoothingEnabled = true;
        drawCover(ctx, img, width, height);
        return;
      }
      const sw = Math.max(1, Math.round(width / block));
      const sh = Math.max(1, Math.round(height / block));
      const off = offRef.current ?? (offRef.current = document.createElement('canvas'));
      off.width = sw;
      off.height = sh;
      const o = off.getContext('2d');
      if (!o) {
        return;
      }
      o.imageSmoothingEnabled = true;
      drawCover(o, img, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, sw, sh, 0, 0, width, height);
    } catch (e) {
      // Tainted canvas or decode failure at draw time: leave the canvas blank (unrecognizable).
    }
  }, [img, state, v, block, width, height]);

  if (v >= 1) {
    return (
      <Stage width={width} height={height} style={stageStyle}>
        <RevealImage src={src} width={width} height={height} style={filter ? { filter } : undefined} />
      </Stage>
    );
  }

  if (state === 'tainted' || state === 'failed') {
    // CSS fallback: blur of comparable strength, plus image-rendering hint.
    const fb = blurStyle(v, maxSize);
    return (
      <Stage width={width} height={height} style={stageStyle}>
        <RevealImage
          src={src}
          width={width}
          height={height}
          style={{ ...fb, filter: [fb.filter, filter].filter(Boolean).join(' '), imageRendering: 'pixelated' }}
        />
      </Stage>
    );
  }

  return (
    <Stage width={width} height={height} style={stageStyle}>
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.round(width))}
        height={Math.max(1, Math.round(height))}
        style={{
          display: 'block',
          width,
          height,
          imageRendering: 'pixelated',
          filter: filter || undefined,
          transform: filter && /blur\(/.test(filter) ? `scale(${fmt(1 + 0.08 * (1 - v), 3)})` : undefined,
        }}
      />
    </Stage>
  );
}

/** drawImage with object-fit: cover semantics so the canvas matches the plain <img> shown at p = 1. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dw: number, dh: number) {
  const iw = img.naturalWidth || img.width || dw;
  const ih = img.naturalHeight || img.height || dh;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}
