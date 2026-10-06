import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, clamp01, fmt } from './shared';

export function brightnessFilter(p: number): string {
  const v = clamp01(p);
  return `brightness(${fmt(0.03 + 0.97 * v, 3)}) contrast(${fmt(0.4 + 0.6 * v, 3)})`;
}

export function BrightnessMode({ src, p, width, height }: ModeProps) {
  const v = clamp01(p);
  return (
    <Stage width={width} height={height}>
      <RevealImage
        src={src}
        width={width}
        height={height}
        style={v >= 1 ? undefined : { filter: brightnessFilter(v) }}
      />
    </Stage>
  );
}

export const brightnessMode: ModeDefinition = {
  id: 'brightness',
  name: 'Brightness / Darkness',
  description: 'Starts almost black and brightens; contrast rises with it so the first glimpses are murky silhouettes.',
  gifSafe: true,
  Component: BrightnessMode,
};
