import React from 'react';
import { RevealMode } from '../../types';
import { ModeDefinition, ModeProps } from '../types';
import { blindsMask } from './blinds';
import { DEFAULT_BLUR_MAX_PX, blurStyle } from './blur';
import { brightnessFilter } from './brightness';
import { DEFAULT_PIXEL_MAX_SIZE, PixelCanvas } from './canvas';
import { colorFilter } from './color';
import { irisClipPath } from './iris';
import { RevealImage, Stage, clamp01, fmt, resolveDirection } from './shared';
import { wipeClipPath } from './wipe';

export const DEFAULT_COMBO: RevealMode[] = ['pixelate', 'blur', 'color'];
/** Layers that can be composed on one element; anything else is ignored. */
export const COMBO_LAYERS: RevealMode[] = ['fade', 'blur', 'pixelate', 'brightness', 'color', 'wipe', 'iris', 'blinds'];

/**
 * Combo stacks modes on one element, each receiving the same eased p:
 * - filter modes (fade, blur, brightness, color) compose into one CSS filter string;
 * - pixelate switches the base element to a canvas;
 * - one clip/mask mode (wipe, iris, blinds) is applied on the wrapper.
 * Tile/SVG modes (jigsaw, shuffle, mosaic, advent, puzzle, scratch) cannot be layered and are ignored.
 */
export function ComboMode({ src, p, width, height, settings, isGif }: ModeProps) {
  const v = clamp01(p);
  // Fall back to the default stack if nothing composable was selected, so p < 1 never shows the plain image.
  const selected = (settings.combo ?? []).filter((m) => COMBO_LAYERS.includes(m));
  const layers = selected.length ? selected : DEFAULT_COMBO;

  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }

  const filters: string[] = [];
  let transform: string | undefined;
  let opacity: number | undefined;
  let usePixelate = false;
  const wrapper: React.CSSProperties = {};
  const dir = resolveDirection(settings, 'ltr');

  for (const layer of layers) {
    switch (layer) {
      case 'fade':
        opacity = v;
        break;
      case 'blur': {
        const s = blurStyle(v, settings.blurMaxPx ?? DEFAULT_BLUR_MAX_PX);
        filters.push(s.filter);
        transform = s.transform;
        break;
      }
      case 'brightness':
        filters.push(brightnessFilter(v));
        break;
      case 'color':
        filters.push(colorFilter(v));
        break;
      case 'pixelate':
        usePixelate = true;
        break;
      case 'wipe':
        wrapper.clipPath = wipeClipPath(v, dir);
        break;
      case 'iris':
        wrapper.clipPath = irisClipPath(v);
        break;
      case 'blinds': {
        const mask = blindsMask(v, dir);
        wrapper.maskImage = mask;
        (wrapper as Record<string, unknown>).WebkitMaskImage = mask;
        break;
      }
      default:
        break;
    }
  }
  if (opacity !== undefined) {
    filters.push(`opacity(${fmt(opacity, 3)})`);
  }
  const filter = filters.length ? filters.join(' ') : undefined;

  if (usePixelate) {
    return (
      <PixelCanvas
        src={src}
        p={v}
        width={width}
        height={height}
        maxSize={settings.pixelMaxSize ?? DEFAULT_PIXEL_MAX_SIZE}
        isGif={isGif}
        filter={filter}
        stageStyle={wrapper}
      />
    );
  }
  return (
    <Stage width={width} height={height} style={wrapper}>
      <RevealImage src={src} width={width} height={height} style={{ filter, transform }} />
    </Stage>
  );
}

export const comboMode: ModeDefinition = {
  id: 'combo',
  name: 'Combo: Pixelate + Blur + Color',
  description:
    'Modes stack: pixel blocks shrink while blur and desaturation lift on the same element. Each layer can map p to its own sub-range.',
  gifSafe: false,
  Component: ComboMode,
};
