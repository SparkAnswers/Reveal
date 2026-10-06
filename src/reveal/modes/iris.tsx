import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { Layer, RevealImage, Stage, clamp01, fmt } from './shared';

/** 72% radius covers the corners of a 16:10 box. Iris supports 'center' only. */
export function irisClipPath(p: number): string {
  return `circle(${fmt(clamp01(p) * 72)}% at 50% 50%)`;
}

export function IrisMode({ src, p, width, height }: ModeProps) {
  const v = clamp01(p);
  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  return (
    <Stage width={width} height={height}>
      <Layer src={src} width={width} height={height} style={{ filter: 'brightness(.1)' }} />
      <Layer src={src} width={width} height={height} style={{ clipPath: irisClipPath(v) }} />
    </Stage>
  );
}

export const irisMode: ModeDefinition = {
  id: 'iris',
  name: 'Iris / Spotlight',
  description:
    'Circular aperture growing from the centre (72% radius covers the corners). Could follow a seeded off-centre point.',
  gifSafe: true,
  Component: IrisMode,
};
