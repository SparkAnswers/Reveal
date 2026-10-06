import React from 'react';
import { Direction } from '../../types';
import { ModeDefinition, ModeProps } from '../types';
import { Layer, RevealImage, Stage, clamp01, fmt, resolveDirection } from './shared';

/** clip-path for a wipe at progress p in the given direction ('center' = split curtain). */
export function wipeClipPath(p: number, dir: Direction): string {
  const hidden = fmt((1 - clamp01(p)) * 100);
  switch (dir) {
    case 'rtl':
      return `inset(0 0 0 ${hidden}%)`;
    case 'ttb':
      return `inset(0 0 ${hidden}% 0)`;
    case 'btt':
      return `inset(${hidden}% 0 0 0)`;
    case 'center': {
      const half = fmt((1 - clamp01(p)) * 50);
      return `inset(0 ${half}% 0 ${half}%)`;
    }
    case 'ltr':
    default:
      return `inset(0 ${hidden}% 0 0)`;
  }
}

const EDGE: React.CSSProperties = {
  position: 'absolute',
  background: '#fff',
  opacity: 0.7,
  boxShadow: '0 0 12px 3px rgba(255,255,255,.6)',
  pointerEvents: 'none',
};

function edges(p: number, dir: Direction): React.CSSProperties[] {
  const pct = fmt(p * 100);
  const inv = fmt((1 - p) * 100);
  const vertical = { ...EDGE, top: 0, bottom: 0, width: 2 };
  const horizontal = { ...EDGE, left: 0, right: 0, height: 2 };
  switch (dir) {
    case 'rtl':
      return [{ ...vertical, left: `calc(${inv}% - 1px)` }];
    case 'ttb':
      return [{ ...horizontal, top: `calc(${pct}% - 1px)` }];
    case 'btt':
      return [{ ...horizontal, top: `calc(${inv}% - 1px)` }];
    case 'center': {
      const half = fmt((1 - p) * 50);
      return [
        { ...vertical, left: `calc(${half}% - 1px)` },
        { ...vertical, right: `calc(${half}% - 1px)` },
      ];
    }
    case 'ltr':
    default:
      return [{ ...vertical, left: `calc(${pct}% - 1px)` }];
  }
}

export function WipeMode({ src, p, width, height, settings }: ModeProps) {
  const v = clamp01(p);
  const dir = resolveDirection(settings, 'ltr');
  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  return (
    <Stage width={width} height={height}>
      {/* dim preview of what is to come */}
      <Layer src={src} width={width} height={height} style={{ filter: 'brightness(.12) saturate(.3)' }} />
      <Layer src={src} width={width} height={height} style={{ clipPath: wipeClipPath(v, dir) }} />
      {v > 0 && edges(v, dir).map((style, i) => <div key={i} style={style} />)}
    </Stage>
  );
}

export const wipeMode: ModeDefinition = {
  id: 'wipe',
  name: 'Wipe / Curtain',
  description:
    'Left→right wipe with a soft leading edge. Variants: rtl, top→bottom, bottom→top, split-curtain from centre.',
  gifSafe: true,
  Component: WipeMode,
};
