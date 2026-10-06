import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, clamp01 } from './shared';

export function FadeMode({ src, p, width, height }: ModeProps) {
  const v = clamp01(p);
  return (
    <Stage width={width} height={height}>
      <RevealImage src={src} width={width} height={height} style={v >= 1 ? undefined : { opacity: v }} />
    </Stage>
  );
}

export const fadeMode: ModeDefinition = {
  id: 'fade',
  name: 'Fade',
  description: 'Opacity ramps from 0 to 1. Simple, calm, works for anything; weakest suspense.',
  gifSafe: true,
  Component: FadeMode,
};
