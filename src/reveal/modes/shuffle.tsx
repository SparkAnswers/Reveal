import React, { useMemo } from 'react';
import { permutation } from '../rng';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, clamp01, makeTiles, resolveGrid } from './shared';

export const SHUFFLE_GRID = { cols: 6, rows: 4 };

/**
 * slot[i] = index of the tile currently occupying slot i. Starting from the seeded scramble, the first
 * `solved` tiles in `order` slide home, each swapping with whatever occupied its home slot.
 */
export function shuffleSlots(order: number[], start: number[], solved: number): number[] {
  const slot = start.slice();
  for (let i = 0; i < solved && i < order.length; i++) {
    const t = order[i];
    if (slot[t] === t) {
      continue;
    }
    const u = slot.indexOf(t);
    slot[u] = slot[t];
    slot[t] = t;
  }
  return slot;
}

export function ShuffleMode({ src, p, width, height, seed, settings }: ModeProps) {
  const v = clamp01(p);
  const { cols, rows } = resolveGrid(settings, SHUFFLE_GRID);
  const n = cols * rows;
  const order = useMemo(() => permutation(n, seed), [n, seed]);
  const start = useMemo(() => permutation(n, (seed + 0x9e3779b9) >>> 0), [n, seed]);
  const tiles = useMemo(() => makeTiles(width, height, { cols, rows }), [width, height, cols, rows]);

  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  const solved = Math.round(v * n);
  const slot = shuffleSlots(order, start, solved);
  const solvedSet = new Set(order.slice(0, solved));
  // position[tileIndex] = slot it currently sits in
  const position: number[] = new Array(n);
  slot.forEach((tileIdx, slotIdx) => (position[tileIdx] = slotIdx));

  return (
    <Stage width={width} height={height}>
      {tiles.map((t) => {
        const sl = position[t.index];
        const col = sl % cols;
        const row = Math.floor(sl / cols);
        return (
          <div
            key={t.index}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: t.w,
              height: t.h,
              overflow: 'hidden',
              transform: `translate(${col * t.w}px, ${row * t.h}px)`,
              transition: 'transform .55s cubic-bezier(.3,.9,.3,1)',
              boxShadow: solvedSet.has(t.index) ? 'none' : 'inset 0 0 0 1px rgba(0,0,0,.35)',
              willChange: 'transform',
            }}
          >
            <RevealImage
              src={src}
              width={width}
              height={height}
              style={{ position: 'absolute', left: -t.x, top: -t.y }}
            />
          </div>
        );
      })}
    </Stage>
  );
}

export const shuffleMode: ModeDefinition = {
  id: 'shuffle',
  name: 'Shuffle puzzle',
  description:
    'Tiles start scrambled; each day a tile slides home (swapping with whatever occupied its slot), in seeded order.',
  gifSafe: true,
  Component: ShuffleMode,
};
