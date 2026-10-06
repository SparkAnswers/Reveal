import React, { useId, useMemo } from 'react';
import { mulberry32 } from '../rng';
import { ModeDefinition, ModeProps } from '../types';
import { RevealImage, Stage, clamp01, fmt } from './shared';

export const SCRATCH_STROKES = 70;

/** Seeded random polyline strokes scaled to the box; the mockup's 320×200 numbers scale with size. */
export function scratchStrokes(seed: number, width: number, height: number, count = SCRATCH_STROKES): string[] {
  const rnd = mulberry32(seed);
  const sx = width / 320;
  const sy = height / 200;
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    let x = rnd() * width;
    let y = rnd() * height;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    const segs = 2 + Math.floor(rnd() * 4);
    for (let k = 0; k < segs; k++) {
      x += (rnd() - 0.5) * 90 * sx;
      y += (rnd() - 0.5) * 60 * sy;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths;
}

export function ScratchMode({ src, p, width, height, seed }: ModeProps) {
  const v = clamp01(p);
  const uid = useId().replace(/:/g, '');
  const paths = useMemo(() => scratchStrokes(seed, width, height), [seed, width, height]);

  if (v >= 1) {
    return (
      <Stage width={width} height={height}>
        <RevealImage src={src} width={width} height={height} />
      </Stage>
    );
  }
  const total = v * SCRATCH_STROKES;
  const strokeWidth = Math.max(10, 22 * Math.min(width / 320, height / 200));
  const fontSize = Math.max(10, Math.round(22 * Math.min(width / 320, height / 200)));
  return (
    <Stage width={width} height={height}>
      <RevealImage src={src} width={width} height={height} style={{ position: 'absolute', inset: 0 }} />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id={`foil-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8d8f99" />
            <stop offset=".5" stopColor="#c3c5cf" />
            <stop offset="1" stopColor="#6f717b" />
          </linearGradient>
          <mask id={`scr-${uid}`}>
            <rect width={width} height={height} fill="#fff" />
            <g fill="none" stroke="#000" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
              {paths.map((d, i) => {
                const f = clamp01(total - i);
                if (f <= 0) {
                  return null;
                }
                return <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={fmt(1 - f, 3)} />;
              })}
            </g>
          </mask>
        </defs>
        <g mask={`url(#scr-${uid})`} style={{ opacity: v >= 0.995 ? 0 : 1, transition: 'opacity .4s' }}>
          <rect width={width} height={height} fill={`url(#foil-${uid})`} />
          <text
            x={width / 2}
            y={height / 2 + fontSize * 0.35}
            textAnchor="middle"
            fontFamily="Inter,system-ui,sans-serif"
            fontWeight={800}
            fontSize={fontSize}
            fill="#4a4c55"
            letterSpacing={3}
          >
            SCRATCH HERE
          </text>
        </g>
      </svg>
    </Stage>
  );
}

export const scratchMode: ModeDefinition = {
  id: 'scratch',
  name: 'Scratch-off',
  description:
    'A foil cover is scratched away by seeded random strokes that accumulate as p rises; the last stroke draws in partially.',
  gifSafe: true,
  Component: ScratchMode,
};
