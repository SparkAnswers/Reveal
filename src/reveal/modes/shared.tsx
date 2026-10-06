import React from 'react';
import { Direction, ModeSettings } from '../../types';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Base image: fills the box with object-fit: cover. Rendered plain at p = 1 by every mode. */
export function RevealImage({
  src,
  width,
  height,
  style,
}: {
  src: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
}) {
  return (
    <img src={src} alt="" draggable={false} style={{ width, height, objectFit: 'cover', display: 'block', ...style }} />
  );
}

/** Positioned box every mode renders into (relative, clipped; the panel supplies the background colour). */
export function Stage({
  width,
  height,
  style,
  children,
}: {
  width: number;
  height: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return <div style={{ position: 'relative', width, height, overflow: 'hidden', ...style }}>{children}</div>;
}

/** Absolutely positioned copy of the image stacked at inset 0 (used as dim base / clipped overlay). */
export function Layer({
  src,
  width,
  height,
  style,
}: {
  src: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
}) {
  return <RevealImage src={src} width={width} height={height} style={{ position: 'absolute', inset: 0, ...style }} />;
}

export interface Grid {
  cols: number;
  rows: number;
}

export function resolveGrid(settings: ModeSettings, fallback: Grid): Grid {
  const g = settings.grid;
  const cols = g && Number.isFinite(g.cols) && g.cols >= 1 ? Math.floor(g.cols) : fallback.cols;
  const rows = g && Number.isFinite(g.rows) && g.rows >= 1 ? Math.floor(g.rows) : fallback.rows;
  return { cols, rows };
}

export function resolveDirection(settings: ModeSettings, fallback: Direction = 'ltr'): Direction {
  return settings.direction ?? fallback;
}

export interface TileSpec {
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function makeTiles(width: number, height: number, grid: Grid): TileSpec[] {
  const tw = width / grid.cols;
  const th = height / grid.rows;
  const tiles: TileSpec[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      tiles.push({ index: r * grid.cols + c, col: c, row: r, x: c * tw, y: r * th, w: tw, h: th });
    }
  }
  return tiles;
}

/**
 * One tile of the image: a clipped box showing the region (x, y, w, h) of the full-size, object-fit: cover
 * image. Using a real <img> per tile keeps GIF animation (browsers share the decoded frames across
 * elements with the same src) and matches the plain image shown at p = 1 pixel for pixel.
 */
export function TileImage({
  src,
  width,
  height,
  tile,
  style,
  children,
}: {
  src: string;
  width: number;
  height: number;
  tile: TileSpec;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: tile.x,
        top: tile.y,
        width: tile.w,
        height: tile.h,
        overflow: 'hidden',
        ...style,
      }}
    >
      <RevealImage
        src={src}
        width={width}
        height={height}
        style={{ position: 'absolute', left: -tile.x, top: -tile.y }}
      />
      {children}
    </div>
  );
}

/** Dark placeholder for a not-yet-revealed tile. */
export const HIDDEN_TILE: React.CSSProperties = {
  background: '#1f2228',
  boxShadow: 'inset 0 0 0 1px #2c3235',
};

export const fmt = (v: number, digits = 2) => Number(v.toFixed(digits)).toString();
