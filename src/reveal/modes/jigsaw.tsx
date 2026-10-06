import React, { useMemo } from 'react';
import { permutation } from '../rng';
import { ModeDefinition, ModeProps } from '../types';
import { HIDDEN_TILE, RevealImage, Stage, TileImage, clamp01, makeTiles, resolveGrid } from './shared';

export const JIGSAW_GRID = { cols: 8, rows: 5 };

export function JigsawMode({ src, p, width, height, seed, settings }: ModeProps) {
  const v = clamp01(p);
  const { cols, rows } = resolveGrid(settings, JIGSAW_GRID);
  const n = cols * rows;
  const rank = useMemo(() => permutation(n, seed), [n, seed]);
  const tiles = useMemo(() => makeTiles(width, height, { cols, rows }), [width, height, cols, rows]);

  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  const shown = Math.round(v * n);
  return (
    <Stage width={width} height={height}>
      {tiles.map((t) => {
        const hidden = rank[t.index] >= shown;
        return hidden ? (
          <div
            key={t.index}
            style={{ position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, ...HIDDEN_TILE }}
          />
        ) : (
          <TileImage key={t.index} src={src} width={width} height={height} tile={t} />
        );
      })}
    </Stage>
  );
}

export const jigsawMode: ModeDefinition = {
  id: 'jigsaw',
  name: 'Jigsaw / Tile puzzle',
  description: '8×5 grid; tiles appear in a seeded pseudo-random order. Unrevealed tiles are dark placeholders.',
  gifSafe: true,
  Component: JigsawMode,
};
