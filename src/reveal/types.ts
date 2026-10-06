import React from 'react';
import { ModeSettings, RevealMode } from '../types';

/**
 * Props every mode component receives. A mode is a React component that renders
 * `src` into a box of width x height, revealed by eased progress `p` (0..1).
 *
 * Rules for mode implementations:
 * - p = 1 must render the plain image (an <img> with object-fit: cover) so GIFs animate.
 * - p = 0 must leave the image unrecognizable.
 * - All randomness must come from `seed` via mulberry32 so every viewer sees the same thing.
 * - Must re-render correctly when width/height change (tiles are computed from the box size).
 * - Keep the DOM stable between p updates (no remounting the image every tick).
 */
export interface ModeProps {
  src: string;
  /** Eased progress 0..1. */
  p: number;
  width: number;
  height: number;
  seed: number;
  settings: ModeSettings;
  /** True when the source is an animated GIF. Canvas modes must draw a static frame. */
  isGif: boolean;
  /** Total whole days in the window; used by advent and steps defaults. */
  days: number;
}

export interface ModeDefinition {
  id: RevealMode;
  name: string;
  description: string;
  /** True if the original <img> stays in the DOM and GIF animation is preserved. */
  gifSafe: boolean;
  Component: React.ComponentType<ModeProps>;
}
