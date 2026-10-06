import React, { useMemo } from 'react';
import { mulberry32 } from '../rng';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, TileImage, clamp01, makeTiles, resolveGrid } from './shared';

export const MOSAIC_GRID = { cols: 16, rows: 10 };
const SOFT = 0.12; // width of the fade window per cell

export function MosaicMode({ src, p, width, height, seed, settings }: ModeProps) {
  const v = clamp01(p);
  const { cols, rows } = resolveGrid(settings, MOSAIC_GRID);
  const n = cols * rows;
  const thresholds = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: n }, () => rnd());
  }, [n, seed]);
  const tiles = useMemo(() => makeTiles(width, height, { cols, rows }), [width, height, cols, rows]);

  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  return (
    <Stage width={width} height={height}>
      {tiles.map((t) => {
        const opacity = clamp01((v * (1 + SOFT) - thresholds[t.index]) / SOFT);
        if (opacity <= 0) {
          return null;
        }
        return (
          <TileImage
            key={t.index}
            src={src}
            width={width}
            height={height}
            tile={t}
            style={{ opacity, transition: 'opacity .25s linear' }}
          />
        );
      })}
    </Stage>
  );
}

export const mosaicMode: ModeDefinition = {
  id: 'mosaic',
  name: 'Mosaic dissolve',
  description:
    '16×10 cells, each with a seeded threshold; a cell fades in over a short window once p passes it (noise-dissolve look).',
  gifSafe: true,
  Component: MosaicMode,
};
