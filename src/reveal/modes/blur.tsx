import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, clamp01, fmt } from './shared';

export const DEFAULT_BLUR_MAX_PX = 40;

/** CSS filter + transform for the blur look at progress p (shared with combo). */
export function blurStyle(p: number, maxPx: number): { filter: string; transform: string } {
  const b = (1 - clamp01(p)) * maxPx;
  return {
    filter: `blur(${fmt(b)}px)`,
    // Slight upscale hides the transparent fringe a blur creates at the edges.
    transform: `scale(${fmt(1 + 0.08 * (1 - clamp01(p)), 3)})`,
  };
}

export function BlurMode({ src, p, width, height, settings }: ModeProps) {
  const v = clamp01(p);
  const maxPx = settings.blurMaxPx ?? DEFAULT_BLUR_MAX_PX;
  return (
    <Stage width={width} height={height}>
      <RevealImage src={src} width={width} height={height} style={v >= 1 ? undefined : blurStyle(v, maxPx)} />
    </Stage>
  );
}

export const blurMode: ModeDefinition = {
  id: 'blur',
  name: 'Blur',
  description: 'Gaussian blur from 40px to 0. Shapes/colours emerge first, details last. Recommended default.',
  gifSafe: true,
  Component: BlurMode,
};
