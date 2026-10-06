import React from 'react';
import { ModeDefinition, ModeProps } from '../types';
import { DEFAULT_PIXEL_MAX_SIZE, PixelCanvas } from './canvas';

export function PixelateMode({ src, p, width, height, settings, isGif }: ModeProps) {
  return (
    <PixelCanvas
      src={src}
      p={p}
      width={width}
      height={height}
      maxSize={settings.pixelMaxSize ?? DEFAULT_PIXEL_MAX_SIZE}
      isGif={isGif}
    />
  );
}

export const pixelateMode: ModeDefinition = {
  id: 'pixelate',
  name: 'Pixelate',
  description: 'Block size from 40px down to 1px. Retro and very readable as "resolution increases".',
  gifSafe: false,
  Component: PixelateMode,
};
