import React from 'react';
import { Direction } from '../../types';
import { ModeDefinition, ModeProps } from '../types';
import { Layer, RevealImage, Stage, clamp01, fmt, resolveDirection } from './shared';

export const BLINDS_PITCH = 14;

function gradientDirection(dir: Direction): string {
  switch (dir) {
    case 'rtl':
      return 'to left';
    case 'ttb':
      return 'to bottom';
    case 'btt':
      return 'to top';
    case 'center':
      return 'to bottom';
    case 'ltr':
    default:
      return 'to right';
  }
}

/** mask-image for blinds: strips of `pitch` px whose opaque part grows with p. */
export function blindsMask(p: number, dir: Direction, pitch = BLINDS_PITCH): string {
  const open = fmt(clamp01(p) * pitch);
  return `repeating-linear-gradient(${gradientDirection(dir)}, #000 0 ${open}px, transparent ${open}px ${pitch}px)`;
}

export function BlindsMode({ src, p, width, height, settings }: ModeProps) {
  const v = clamp01(p);
  const dir = resolveDirection(settings, 'ltr');
  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  const mask = blindsMask(v, dir);
  return (
    <Stage width={width} height={height}>
      <Layer src={src} width={width} height={height} style={{ filter: 'brightness(.1)' }} />
      <Layer
        src={src}
        width={width}
        height={height}
        style={{ maskImage: mask, WebkitMaskImage: mask } as React.CSSProperties}
      />
    </Stage>
  );
}

export const blindsMode: ModeDefinition = {
  id: 'blinds',
  name: 'Scanlines / Venetian blinds',
  description:
    'Horizontal strips (14px pitch) grow in height until they merge. Vertical variant = rotate the gradient.',
  gifSafe: true,
  Component: BlindsMode,
};
