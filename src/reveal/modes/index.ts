import { RevealMode } from '../../types';
import { ModeDefinition } from '../types';
import { adventMode } from './advent';
import { blindsMode } from './blinds';
import { blurMode } from './blur';
import { brightnessMode } from './brightness';
import { colorMode } from './color';
import { comboMode } from './combo';
import { instantMode } from './instant';
import { fadeMode } from './fade';
import { irisMode } from './iris';
import { jigsawMode } from './jigsaw';
import { mosaicMode } from './mosaic';
import { pixelateMode } from './pixelate';
import { puzzleMode } from './puzzle';
import { scratchMode } from './scratch';
import { shuffleMode } from './shuffle';
import { wipeMode } from './wipe';

/** All modes, in the order of the RevealMode union. */
export const MODES: ModeDefinition[] = [
  fadeMode,
  blurMode,
  pixelateMode,
  jigsawMode,
  shuffleMode,
  wipeMode,
  irisMode,
  scratchMode,
  blindsMode,
  mosaicMode,
  brightnessMode,
  colorMode,
  adventMode,
  puzzleMode,
  comboMode,
  instantMode,
];

const BY_ID = new Map<string, ModeDefinition>(MODES.map((m) => [m.id, m]));

/** Look up a mode by id; unknown ids fall back to blur. */
export function getMode(id: RevealMode): ModeDefinition {
  return BY_ID.get(id) ?? blurMode;
}

export { RevealImage } from './shared';
