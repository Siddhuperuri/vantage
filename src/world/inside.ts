/* ------------------------------------------------------------------
   inside.ts - the inside of the name.

   Module II is the same idea as the door in Module I, applied
   everywhere: a shared letter is an intersection. The spine of the
   wall is SIDDHARTHA, and every concept crosses it, or crosses
   something that crosses it, at a letter they have in common. The
   result is wrapped around the visitor, so typography is the room
   rather than a sign in it.

   The words and the five contradictions are taken from the original
   MIRACLE's own record (legacy/README.md). Nothing here is invented
   about the subject.

   Each letter carries a RESOLUTION, and the five values it passes
   through are Module I's five layers, now read as five stages:

       sketched -> inferred -> computed -> designed -> measured

   so attending to a letter here is the same act as attending to a
   layer there. Pure data: no three, no React.
   ------------------------------------------------------------------ */

import { rng } from '../lib/mathx';
import { glyphDefs, resample, type Pt } from './glyphs';

export type Axis = 'across' | 'down';

/** how loose or exact a word is at rest, which is its natural stage */
export type Temper = 'loose' | 'middle' | 'exact';

export interface WordSpec {
  readonly text: string;
  readonly temper: Temper;
  /** the word this one is in tension with, if any */
  readonly opposes?: string;
}

/**
 * The spine, then the concepts, then the five contradictions. Order
 * matters: the builder places them greedily, so the words that must
 * cross the spine come first.
 */
const WORDS: readonly WordSpec[] = [
  { text: 'SIDDHARTHA', temper: 'middle' },
  { text: 'DESIGN', temper: 'middle', opposes: 'TECHNOLOGY' },
  { text: 'TECHNOLOGY', temper: 'exact', opposes: 'DESIGN' },
  { text: 'ART', temper: 'loose', opposes: 'CODE' },
  { text: 'CODE', temper: 'exact', opposes: 'ART' },
  { text: 'INTUITION', temper: 'loose', opposes: 'SYSTEMS' },
  { text: 'SYSTEMS', temper: 'exact', opposes: 'INTUITION' },
  { text: 'CURIOSITY', temper: 'loose', opposes: 'STRUCTURE' },
  { text: 'STRUCTURE', temper: 'exact', opposes: 'CURIOSITY' },
  { text: 'IMAGINATION', temper: 'loose', opposes: 'ENGINEERING' },
  { text: 'ENGINEERING', temper: 'exact', opposes: 'IMAGINATION' },
  { text: 'CAMERA', temper: 'middle' },
  { text: 'MOTION', temper: 'middle' },
  { text: 'EXPERIMENTS', temper: 'middle' },
  { text: 'IDEAS', temper: 'loose' },
  { text: 'GAMES', temper: 'middle' },
  { text: 'WEB', temper: 'exact' },
  { text: 'AI', temper: 'middle' },
] as const;

export const RESTING_STAGE: Record<Temper, number> = {
  // a loose word still has to be readable: "unfinished" is shown by how
  // far a letter has resolved, never by a letter you cannot identify
  loose: 0.22,
  middle: 0.46,
  exact: 0.74,
};

export interface PlacedWord {
  readonly index: number;
  readonly text: string;
  readonly temper: Temper;
  readonly axis: Axis;
  readonly row: number;
  readonly col: number;
  readonly opposes: number;
  /** indices into InsideWorld.letters */
  readonly letters: number[];
}

export interface PlacedLetter {
  readonly index: number;
  readonly ch: string;
  readonly row: number;
  readonly col: number;
  /** every word that owns this cell: a crossing has two */
  readonly words: number[];
  /** position on the wall, world units */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** the angle around the room, for the attention lookup */
  readonly azimuth: number;
}

export interface InsideWorld {
  readonly words: PlacedWord[];
  readonly letters: PlacedLetter[];
  /** radius of the room */
  readonly radius: number;
  /** centre of the room in world space */
  readonly center: readonly [number, number, number];
  /** line geometry for every letter, in one buffer */
  readonly line: {
    readonly position: Float32Array;
    /** x: letter index, y: arc 0..1, z: stroke seed, w: 1 on a registration mark */
    readonly meta: Float32Array;
    /** the outward normal of the wall at this vertex: letters face inward */
    readonly normal: Float32Array;
    readonly count: number;
  };
  /** a sample cloud along the same strokes, for the inferred stage */
  readonly cloud: {
    readonly position: Float32Array;
    readonly jitter: Float32Array;
    /** x: letter index, y: arc, z: seed, w: unused */
    readonly meta: Float32Array;
    readonly count: number;
  };
  readonly letterCount: number;
  readonly sampleCount: number;
}

interface Cell {
  ch: string;
  words: number[];
  index: number;
}

const key = (r: number, c: number): string => `${r},${c}`;

/** a small deterministic crossword: every word crosses one already placed */
function buildGrid(): { cells: Map<string, Cell>; words: PlacedWord[] } {
  const cells = new Map<string, Cell>();
  const words: PlacedWord[] = [];
  const r = rng(90210);

  const fits = (text: string, row: number, col: number, axis: Axis): boolean => {
    const dr = axis === 'down' ? 1 : 0;
    const dc = axis === 'across' ? 1 : 0;
    // the cell before and after a word must be empty, or words run together
    const beforeK = key(row - dr, col - dc);
    const afterK = key(row + dr * text.length, col + dc * text.length);
    if (cells.has(beforeK) || cells.has(afterK)) return false;

    let crossings = 0;
    for (let i = 0; i < text.length; i++) {
      const rr = row + dr * i;
      const cc = col + dc * i;
      const cell = cells.get(key(rr, cc));
      if (cell) {
        if (cell.ch !== text[i]) return false;
        crossings++;
      } else {
        // a letter that is not a crossing must not sit beside another
        // word running the same way
        const sideA = axis === 'across' ? key(rr - 1, cc) : key(rr, cc - 1);
        const sideB = axis === 'across' ? key(rr + 1, cc) : key(rr, cc + 1);
        if (cells.has(sideA) || cells.has(sideB)) return false;
      }
    }
    return crossings > 0;
  };

  const place = (spec: WordSpec, row: number, col: number, axis: Axis): void => {
    const dr = axis === 'down' ? 1 : 0;
    const dc = axis === 'across' ? 1 : 0;
    const index = words.length;
    const letters: number[] = [];
    for (let i = 0; i < spec.text.length; i++) {
      const rr = row + dr * i;
      const cc = col + dc * i;
      const k = key(rr, cc);
      let cell = cells.get(k);
      if (!cell) {
        cell = { ch: spec.text[i], words: [], index: cells.size };
        cells.set(k, cell);
      }
      cell.words.push(index);
      letters.push(cell.index);
    }
    words.push({
      index,
      text: spec.text,
      temper: spec.temper,
      axis,
      row,
      col,
      opposes: -1,
      letters,
    });
  };

  // the spine
  place(WORDS[0], 0, 0, 'across');

  for (let w = 1; w < WORDS.length; w++) {
    const spec = WORDS[w];
    const options: { row: number; col: number; axis: Axis; score: number }[] = [];
    for (let i = 0; i < spec.text.length; i++) {
      for (const [k, cell] of cells) {
        if (cell.ch !== spec.text[i]) continue;
        const [cr, cc] = k.split(',').map(Number);
        for (const axis of ['across', 'down'] as Axis[]) {
          const row = axis === 'down' ? cr - i : cr;
          const col = axis === 'across' ? cc - i : cc;
          if (!fits(spec.text, row, col, axis)) continue;
          // prefer placements that stay near the spine and spread wide
          const score = -Math.abs(row) * 1.4 - Math.abs(col + spec.text.length / 2) * 0.1 + r() * 0.6;
          options.push({ row, col, axis, score });
        }
      }
    }
    if (!options.length) continue;
    options.sort((a, b) => b.score - a.score);
    const best = options[0];
    place(spec, best.row, best.col, best.axis);
  }

  // resolve the oppositions now that indices are known
  const byText = new Map(words.map((x) => [x.text, x.index]));
  const resolved = words.map((x) => {
    const spec = WORDS.find((s) => s.text === x.text);
    const other = spec?.opposes ? byText.get(spec.opposes) : undefined;
    return { ...x, opposes: other === undefined ? -1 : other };
  });
  return { cells, words: resolved };
}

const CELL = 0.74;
const CAP = 0.5;

export function buildInsideWorld(
  center: readonly [number, number, number],
  radius = 9,
  cloudDensity = 1,
): InsideWorld {
  const { cells, words } = buildGrid();

  // centre the grid on the room
  let r0 = Infinity;
  let r1 = -Infinity;
  let c0 = Infinity;
  let c1 = -Infinity;
  for (const k of cells.keys()) {
    const [r, c] = k.split(',').map(Number);
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
    c0 = Math.min(c0, c);
    c1 = Math.max(c1, c);
  }
  const rowMid = (r0 + r1) / 2;
  const colMid = (c0 + c1) / 2;
  const dAz = CELL / radius;

  const letters: PlacedLetter[] = [];
  const byIndex = new Map<number, PlacedLetter>();

  for (const [k, cell] of cells) {
    const [row, col] = k.split(',').map(Number);
    const azimuth = (col - colMid) * dAz;
    const y = -(row - rowMid) * CELL * 1.08;
    const letter: PlacedLetter = {
      index: cell.index,
      ch: cell.ch,
      row,
      col,
      words: cell.words,
      x: center[0] + Math.sin(azimuth) * radius,
      y: center[1] + y,
      z: center[2] - Math.cos(azimuth) * radius,
      azimuth,
    };
    letters.push(letter);
    byIndex.set(cell.index, letter);
  }
  letters.sort((a, b) => a.index - b.index);

  /* ---- geometry: every letter, on the inside of the wall ---------- */
  const pos: number[] = [];
  const meta: number[] = [];
  const nrm: number[] = [];
  const cPos: number[] = [];
  const cJit: number[] = [];
  const cMeta: number[] = [];
  const rr = rng(5150);

  for (const L of letters) {
    const glyph = glyphDefs[L.ch] ?? glyphDefs[' '];
    // the letter's own frame on the wall: tangent across, world up,
    // normal pointing inward at the visitor
    const ca = Math.cos(L.azimuth);
    const sa = Math.sin(L.azimuth);
    const tx = ca;
    const tz = sa;
    const nx = -sa;
    const nz = ca;
    const halfW = (glyph.w * CAP) / 2;

    const toWorld = (gx: number, gy: number): [number, number, number] => {
      const u = gx * CAP - halfW;
      return [L.x + tx * u, L.y + gy * CAP - CAP * 0.5, L.z + tz * u];
    };

    const seed = rr();
    for (const stroke of glyph.s) {
      const pts = resample(stroke as readonly Pt[], 0.075);
      for (let i = 1; i < pts.length; i++) {
        const a = toWorld(pts[i - 1][0], pts[i - 1][1]);
        const b = toWorld(pts[i][0], pts[i][1]);
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        nrm.push(nx, 0, nz, nx, 0, nz);
        meta.push(L.index, pts[i - 1][2], seed, 0);
        meta.push(L.index, pts[i][2], seed, 0);
      }
      // the inferred stage: samples along the same stroke
      const n = Math.max(2, Math.round(pts.length * 0.8 * cloudDensity));
      for (let i = 0; i < n; i++) {
        const p = pts[Math.floor((i / n) * pts.length)];
        const w = toWorld(p[0], p[1]);
        cPos.push(w[0], w[1], w[2]);
        cJit.push((rr() * 2 - 1) * 0.1, (rr() * 2 - 1) * 0.1, (rr() * 2 - 1) * 0.06);
        cMeta.push(L.index, p[2], rr(), 0);
      }
    }

    // the measured stage: a registration mark on the cell itself,
    // which only ever appears when a letter is fully attended to
    const corner = CAP * 0.62;
    const marks: [number, number, number, number][] = [
      [-halfW - 0.07, -corner, -halfW - 0.07 + 0.1, -corner],
      [-halfW - 0.07, -corner, -halfW - 0.07, -corner + 0.1],
      [halfW + 0.07, corner, halfW + 0.07 - 0.1, corner],
      [halfW + 0.07, corner, halfW + 0.07, corner - 0.1],
    ];
    for (const [ax, ay, bx, by] of marks) {
      const a: [number, number, number] = [L.x + tx * ax, L.y + ay, L.z + tz * ax];
      const b: [number, number, number] = [L.x + tx * bx, L.y + by, L.z + tz * bx];
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      nrm.push(nx, 0, nz, nx, 0, nz);
      meta.push(L.index, 0, seed, 1);
      meta.push(L.index, 1, seed, 1);
    }
  }

  return {
    words,
    letters,
    radius,
    center,
    line: {
      position: new Float32Array(pos),
      meta: new Float32Array(meta),
      normal: new Float32Array(nrm),
      count: pos.length / 3,
    },
    cloud: {
      position: new Float32Array(cPos),
      jitter: new Float32Array(cJit),
      meta: new Float32Array(cMeta),
      count: cPos.length / 3,
    },
    letterCount: letters.length,
    sampleCount: pos.length / 6 + cPos.length / 3,
  };
}
