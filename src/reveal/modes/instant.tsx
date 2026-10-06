import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage } from './shared';

/** Nothing until the reveal moment, then the full image. For "it just appears at 9:00". */
export function InstantMode({ src, p, width, height }: ModeProps) {
  return (
    <Stage width={width} height={height}>
      {p >= 1 ? <RevealImage src={src} width={width} height={height} /> : null}
    </Stage>
  );
}

export const instantMode: ModeDefinition = {
  id: 'instant',
  name: 'Instant',
  description: 'Stays hidden, then appears in full at the reveal moment. No gradual phase.',
  gifSafe: true,
  Component: InstantMode,
};
