import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, clamp01, fmt } from './shared';

export function colorFilter(p: number): string {
  const v = clamp01(p);
  return `grayscale(${fmt(1 - v, 3)}) saturate(${fmt(0.15 + 0.85 * v, 3)}) contrast(${fmt(0.8 + 0.2 * v, 3)})`;
}

export function ColorMode({ src, p, width, height }: ModeProps) {
  const v = clamp01(p);
  return (
    <Stage width={width} height={height}>
      <RevealImage src={src} width={width} height={height} style={v >= 1 ? undefined : { filter: colorFilter(v) }} />
    </Stage>
  );
}

export const colorMode: ModeDefinition = {
  id: 'color',
  name: 'Color',
  description: 'Monochrome and washed out to full colour. Low suspense but pretty; good as a secondary layer in Combo.',
  gifSafe: true,
  Component: ColorMode,
};
