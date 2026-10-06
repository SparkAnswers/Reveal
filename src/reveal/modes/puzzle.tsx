import React, { useId, useMemo } from 'react';
import { mulberry32, permutation } from '../rng';
import { ModeDefinition, ModeProps } from '../types';
import { Grid, RevealImage, Stage, clamp01, resolveGrid } from './shared';

export const PUZZLE_GRID = { cols: 6, rows: 4 };

// Tab template along a unit edge (x along edge, y = toward +normal), symmetric about x = .5
const TAB: number[][] = [
  [0.36, 0],
  [0.45, 0, 0.47, 0.03, 0.44, 0.08],
  [0.4, 0.14, 0.3, 0.14, 0.3, 0.22],
  [0.3, 0.33, 0.7, 0.33, 0.7, 0.22],
  [0.7, 0.14, 0.6, 0.14, 0.56, 0.08],
  [0.53, 0.03, 0.55, 0, 0.64, 0],
];

function edge(ax: number, ay: number, bx: number, by: number, sgn: number): string {
  const dx = bx - ax;
  const dy = by - ay;
  const nx = -dy;
  const ny = dx; // normal = d rotated +90deg (into the piece for CW traversal)
  if (sgn === 0) {
    return ` L${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const P = (x: number, y: number) =>
    `${(ax + dx * x + nx * y * sgn).toFixed(1)} ${(ay + dy * x + ny * y * sgn).toFixed(1)}`;
  let d = ` L${P(TAB[0][0], TAB[0][1])}`;
  for (let i = 1; i < TAB.length; i++) {
    const t = TAB[i];
    d += ` C${P(t[0], t[1])} ${P(t[2], t[3])} ${P(t[4], t[5])}`;
  }
  return d + ` L${bx.toFixed(1)} ${by.toFixed(1)}`;
}

/** Seeded jigsaw piece outlines (SVG path data) for a cols×rows grid filling width×height. */
export function puzzlePaths(seed: number, width: number, height: number, grid: Grid): string[] {
  const { cols, rows } = grid;
  const rnd = mulberry32(seed);
  const tw = width / cols;
  const th = height / rows;
  // hE[r][col]: edge above row r; vE[r][col]: edge left of col. +1 = tab bulges down / right.
  const hE = Array.from({ length: rows + 1 }, () => Array.from({ length: cols }, () => (rnd() < 0.5 ? 1 : -1)));
  const vE = Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, () => (rnd() < 0.5 ? 1 : -1)));
  const paths: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x0 = col * tw;
      const y0 = r * th;
      const x1 = x0 + tw;
      const y1 = y0 + th;
      let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
      d += edge(x0, y0, x1, y0, r === 0 ? 0 : hE[r][col]); // top
      d += edge(x1, y0, x1, y1, col === cols - 1 ? 0 : -vE[r][col + 1]); // right
      d += edge(x1, y1, x0, y1, r === rows - 1 ? 0 : -hE[r + 1][col]); // bottom
      d += edge(x0, y1, x0, y0, col === 0 ? 0 : vE[r][col]); // left
      d += ' Z';
      paths.push(d);
    }
  }
  return paths;
}

export function PuzzleMode({ src, p, width, height, seed, settings }: ModeProps) {
  const v = clamp01(p);
  const { cols, rows } = resolveGrid(settings, PUZZLE_GRID);
  const n = cols * rows;
  const uid = useId().replace(/:/g, '');
  const paths = useMemo(() => puzzlePaths(seed, width, height, { cols, rows }), [seed, width, height, cols, rows]);
  const rank = useMemo(() => permutation(n, (seed + 0x9e3779b9) >>> 0), [n, seed]);

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
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: 'block' }}>
        <defs>
          {paths.map((d, i) => (
            <clipPath key={i} id={`pz-${uid}-${i}`}>
              <path d={d} />
            </clipPath>
          ))}
        </defs>
        <g>
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="#1f2228"
              stroke="#3a3f47"
              strokeWidth={1}
              style={{ opacity: rank[i] < shown ? 0 : 1 }}
            />
          ))}
        </g>
        <g>
          {paths.map((_, i) => {
            const on = rank[i] < shown;
            return (
              <g key={i} clipPath={`url(#pz-${uid}-${i})`} style={{ opacity: on ? 1 : 0, transition: 'opacity .4s' }}>
                {on && (
                  <image href={src} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </Stage>
  );
}

export const puzzleMode: ModeDefinition = {
  id: 'puzzle',
  name: 'Puzzle piece outlines',
  description:
    'Jigsaw with real tab-and-blank piece shapes (seeded). Pieces drop in by seeded order; missing pieces show their outline.',
  // SVG <image> generally animates GIFs in modern browsers, but the mockup rates this 'partial'.
  gifSafe: false,
  Component: PuzzleMode,
};
