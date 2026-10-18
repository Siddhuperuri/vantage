/* ------------------------------------------------------------------
   palette.ts - three colours, and a rule about the third.

   GROUND is the dark the piece is made of. PAPER is the only colour
   light is drawn in. EMBER is reserved for the one thing that is
   curious, and for a mark that has just been measured. If ember is
   doing anything else, it is a mistake.
   ------------------------------------------------------------------ */

import { Color } from 'three';

export const GROUND_HEX = '#0a0908';
export const PAPER_HEX = '#e9e2d3';
export const EMBER_HEX = '#ff5c24';

export const GROUND = new Color(GROUND_HEX);
export const PAPER = new Color(PAPER_HEX);
export const EMBER = new Color(EMBER_HEX);
/** the ember's own core: hotter than its light, so it does not read as orange plastic */
export const EMBER_CORE = new Color('#ffd6be');
