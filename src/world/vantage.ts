/* ------------------------------------------------------------------
   vantage.ts - building the world VANTAGE.

   The trick the whole environment rests on, carried over from the
   original MIRACLE: every point of every layer is placed on the ray
   from the vantage V* = (0,0,0) through its home on the word plane,
   at a depth chosen by coherent noise. Projected from V*, depth
   cancels - all five layers land on the same pixel and, because
   everything is additive light, they sum into the subject. Projected
   from anywhere else they are five separate sheets of matter at five
   separate distances.

   Because depth cancels along the ray, a point may sit anywhere on its
   ray without disturbing the sum: that is why each layer can have real
   relief and still resolve exactly. What breaks the sum is lateral
   displacement - which is precisely what MOTION applies.

   This module is pure data: typed arrays and numbers, no three, no
   React. The same arrays feed several representations (a point cloud
   can be drawn as points or as halftone without rebuilding anything).
   ------------------------------------------------------------------ */

import { gauss, hash, noise, rng } from '../lib/mathx';
import { D0, LAYER_DEFS, type LayerDef, type LayerId } from './layers';
import { layout, resample, textStrokes, type LaidStroke, type Pt, type WordLayout } from './glyphs';

/** the subject. Four words; the environment only ever draws the last. */
export const SUBJECT_NAME = 'SIDDHARTHA';
export const SUBJECT_FULL = 'Peruri Jai Sai Siddhartha';

/* ---- the shapes the renderers consume ---- */

/** line geometry for a LineSegments draw: 2 vertices per segment, non-indexed */
export interface LineData {
  /** home position, world units: also the `position` attribute */
  readonly position: Float32Array;
  /** a unit direction shared by every vertex of one stroke: coherent dispersion */
  readonly dir: Float32Array;
  /** unit tangent of the stroke at this vertex */
  readonly tangent: Float32Array;
  /** x: amp, y: arc 0..1, z: per-stroke seed (or pass index for trace), w: sweep 0..1 across the word */
  readonly meta: Float32Array;
  readonly count: number;
}

/** one quantised cell of the lattice, drawn instanced */
export interface CellData {
  readonly center: Float32Array;
  /** x: amp, y: sweep, z: seed, w: glyph index */
  readonly meta: Float32Array;
  readonly count: number;
  /** resting cell pitch in world units at this layer depth */
  readonly pitch: number;
}

/**
 * A cloud of samples with a home and a direction of uncertainty.
 * Deliberately representation-free: Phase 2 can draw it as points,
 * halftone, dither, ASCII or pixels from exactly these arrays.
 */
export interface PointCloud {
  readonly home: Float32Array;
  /** the prior's offset direction and magnitude for this sample */
  readonly jitter: Float32Array;
  /** x: amp, y: sweep, z: seed, w: 1 if this sample belongs to the prior, not the stroke */
  readonly meta: Float32Array;
  readonly count: number;
}

export interface LayerBounds {
  readonly id: LayerId;
  /** centre of the layer's sheet in world space */
  readonly center: [number, number, number];
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export interface VantageWorld {
  readonly word: WordLayout;
  /** cap units -> world units at the word plane */
  readonly scale: number;
  readonly aspect: number;
  readonly stacked: boolean;
  readonly instrument: LineData;
  readonly design: LineData;
  readonly trace: LineData;
  readonly lattice: CellData;
  readonly field: PointCloud;
  readonly bounds: readonly LayerBounds[];
  /** the true measured width of the word, in cap units: the instrument layer draws this numeral */
  readonly measured: string;
  /** total samples across every layer, for the loading state and the quality report */
  readonly sampleCount: number;
}

export interface WorldOptions {
  readonly aspect: number;
  readonly seed?: number;
  /** multiplier on the field cloud's sample count, 0.35 .. 1.4 */
  readonly fieldDensity?: number;
  /** how many hand passes the trace layer draws */
  readonly tracePasses?: number;
  /** lattice cell pitch in cap units */
  readonly latticePitch?: number;
  /** vertical framing: fraction of the viewport the word is allowed to fill */
  readonly fill?: number;
}

/* ------------------------------------------------------------------
   builders
   ------------------------------------------------------------------ */

class LineBuilder {
  private pos: number[] = [];
  private dir: number[] = [];
  private tan: number[] = [];
  private met: number[] = [];
  count = 0;

  /** push one segment; both ends share the stroke's dir and seed */
  seg(
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    dir: readonly [number, number, number],
    meta: { ampA: number; ampB: number; arcA: number; arcB: number; seed: number; sweepA: number; sweepB: number },
  ): void {
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    let tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    this.dir.push(dir[0], dir[1], dir[2], dir[0], dir[1], dir[2]);
    this.tan.push(tx, ty, tz, tx, ty, tz);
    this.met.push(meta.ampA, meta.arcA, meta.seed, meta.sweepA);
    this.met.push(meta.ampB, meta.arcB, meta.seed, meta.sweepB);
    this.count += 2;
  }

  build(): LineData {
    return {
      position: new Float32Array(this.pos),
      dir: new Float32Array(this.dir),
      tangent: new Float32Array(this.tan),
      meta: new Float32Array(this.met),
      count: this.count,
    };
  }
}

/** a per-point placement onto the ray from V* */
function makePlacer(def: LayerDef, word: WordLayout, s: number, relief: boolean) {
  const li = def.index;
  const depthAt = (x: number, y: number, gi: number): number => {
    if (!relief) return def.depth;
    const n = noise(x * 0.21 + li * 11.7, y * 0.33 + li * 3.1, li * 5.3, 7 + li);
    let t = 0.75 * n;
    if (gi >= 0) {
      const g = word.glyphs[gi];
      if (g) {
        t +=
          0.65 *
          (hash(gi, li, 1, 91) * 2 -
            1 +
            (hash(gi, li, 2, 91) * 2 - 1) * 0.9 * (x - g.cx));
      }
    }
    return def.depth * (1 + def.spread * t);
  };
  return (x: number, y: number, gi: number, dOverride?: number): [number, number, number] => {
    const d = dOverride ?? depthAt(x, y, gi);
    const k = d / D0;
    return [s * x * k, s * y * k, -d];
  };
}

const sweepOf = (x: number, word: WordLayout): number =>
  (x - word.bbox.x0) / Math.max(1e-6, word.bbox.x1 - word.bbox.x0);

/** push a resampled polyline as segments */
function pushPolyline(
  lb: LineBuilder,
  pts: readonly (readonly [number, number, number])[],
  place: (x: number, y: number, gi: number, d?: number) => [number, number, number],
  gi: number,
  word: WordLayout,
  amp: number,
  seed: number,
  dir: readonly [number, number, number],
  depth?: number,
): void {
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    lb.seg(place(p0[0], p0[1], gi, depth), place(p1[0], p1[1], gi, depth), dir, {
      ampA: amp,
      ampB: amp,
      arcA: p0[2],
      arcB: p1[2],
      seed,
      sweepA: sweepOf(p0[0], word),
      sweepB: sweepOf(p1[0], word),
    });
  }
}

function unitDir(r: () => number): [number, number, number] {
  const x = r() * 2 - 1;
  const y = r() * 2 - 1;
  const z = (r() * 2 - 1) * 0.35;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/* ---- INSTRUMENT: what measuring looks like ---- */
function buildInstrument(word: WordLayout, def: LayerDef, s: number, seed: number): LineData {
  const lb = new LineBuilder();
  const place = makePlacer(def, word, s, true);
  const r = rng(seed + 11);
  let sid = 0;

  const seg2d = (ax: number, ay: number, bx: number, by: number, amp: number, ds = 0.1) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(len / ds));
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= n; i++) {
      pts.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, i / n]);
    }
    pushPolyline(lb, pts, place, -1, word, amp, (sid++ % 97) / 97, unitDir(r));
  };
  const dash = (ax: number, ay: number, bx: number, by: number, amp: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.round(len / 0.14));
    for (let i = 0; i < n; i += 2) {
      seg2d(
        ax + ((bx - ax) * i) / n,
        ay + ((by - ay) * i) / n,
        ax + ((bx - ax) * (i + 1)) / n,
        ay + ((by - ay) * (i + 1)) / n,
        amp,
        0.07,
      );
    }
  };

  const rows = new Map<number, typeof word.glyphs>();
  word.glyphs.forEach((g) => {
    const list = rows.get(g.row) ?? [];
    list.push(g);
    rows.set(g.row, list);
  });

  rows.forEach((gs) => {
    const last = gs[gs.length - 1];
    const yb = gs[0].y;
    const xa = gs[0].x - 0.9;
    const xb = last.x + last.w + 0.9;
    seg2d(xa, yb, xb, yb, 0.7); // baseline
    seg2d(xa, yb + 1, xb, yb + 1, 0.7); // cap line
    dash(xa, yb + 0.5, xb, yb + 0.5, 0.45); // mid line

    // the ruler under the baseline: 1/10 cap unit graduations
    for (let q = Math.ceil(xa * 10); q <= Math.floor(xb * 10); q++) {
      const xx = q / 10;
      const big = q % 10 === 0;
      const half = q % 5 === 0;
      seg2d(xx, yb - 0.05, xx, yb - (big ? 0.2 : half ? 0.13 : 0.09), big ? 0.9 : 0.55, 0.06);
    }
    // glyph edge guides
    gs.forEach((g) => {
      dash(g.x, yb - 0.26, g.x, yb + 1.26, 0.5);
      dash(g.x + g.w, yb - 0.26, g.x + g.w, yb + 1.26, 0.5);
    });

    // the overall dimension line, with a numeral that is a true measurement
    const dy = yb - 0.62;
    const xl = gs[0].x;
    const xr = last.x + last.w;
    seg2d(xl, dy - 0.09, xl, dy + 0.09, 0.8, 0.06);
    seg2d(xr, dy - 0.09, xr, dy + 0.09, 0.8, 0.06);
    const label = textStrokes((xr - xl).toFixed(2), { ticks: false, track: 0.18 });
    const sc = 0.16;
    const lx = (xl + xr) / 2 - (label.width * sc) / 2;
    seg2d(xl, dy, lx - 0.16, dy, 0.6);
    seg2d(lx + label.width * sc + 0.16, dy, xr, dy, 0.6);
    label.strokes.forEach((pts) => {
      const scaled = pts.map((p) => [lx + p[0] * sc, dy - sc / 2 + p[1] * sc] as Pt);
      // the numeral is only legible once attention is on this layer: amp 1.6 is read
      // by the shader as "reveal on attention" rather than "always bright"
      pushPolyline(
        lb,
        resample(scaled, 0.02).map((p) => [p[0], p[1], p[2]] as [number, number, number]),
        place,
        -1,
        word,
        1.6,
        (sid++ % 97) / 97,
        unitDir(r),
      );
    });
  });

  // registration crosses at the four corners of the word
  const b = word.bbox;
  const mg = 0.9;
  ([
    [b.x0 - mg, b.y0 - mg],
    [b.x1 + mg, b.y0 - mg],
    [b.x0 - mg, b.y1 + mg],
    [b.x1 + mg, b.y1 + mg],
  ] as const).forEach((c) => {
    seg2d(c[0] - 0.24, c[1], c[0] + 0.24, c[1], 0.8);
    seg2d(c[0], c[1] - 0.24, c[0], c[1] + 0.24, 0.8);
    const ring: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ring.push([c[0] + Math.cos(a) * 0.09, c[1] + Math.sin(a) * 0.09, i / 24]);
    }
    pushPolyline(lb, ring, place, -1, word, 0.8, (sid++ % 97) / 97, unitDir(r));
  });

  // the axis: a crosshair and a graduated ring on the shared A
  seg2d(-0.38, 0, 0.38, 0, 0.55);
  seg2d(0, -0.38, 0, 0.38, 0.55);
  for (let t = 0; t < 36; t++) {
    const a = (t / 36) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const tl = t % 3 === 0 ? 0.06 : 0.035;
    seg2d(c * 0.22, sn * 0.22, c * (0.22 + tl), sn * (0.22 + tl), 0.7, 0.06);
  }
  const ring: [number, number, number][] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ring.push([Math.cos(a) * 0.22, Math.sin(a) * 0.22, i / 72]);
  }
  pushPolyline(lb, ring, place, -1, word, 0.5, 0.5, unitDir(r));

  return lb.build();
}

/* ---- DESIGN: the exact geometry, and nothing else ---- */
function buildDesign(word: WordLayout, def: LayerDef, s: number, seed: number): LineData {
  const lb = new LineBuilder();
  const place = makePlacer(def, word, s, true);
  const r = rng(seed + 23);

  word.strokes.forEach((st: LaidStroke, i) => {
    const pts = resample(st.pts, st.kind === 'tick' ? 0.05 : 0.028);
    // a tick explodes along its own direction; a main stroke keeps the group it belongs to
    const dir = unitDir(r);
    pushPolyline(
      lb,
      pts.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
      place,
      st.glyph,
      word,
      st.kind === 'tick' ? 0.75 : 1,
      (i % 211) / 211,
      dir,
    );
  });

  const axis: [number, number, number][] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    axis.push([Math.cos(a) * 0.13, Math.sin(a) * 0.13, i / 72]);
  }
  pushPolyline(lb, axis, place, -1, word, 1, 0.3, unitDir(r));

  return lb.build();
}

/* ---- TRACE: passes of a hand, with overshoot ---- */
function buildTrace(word: WordLayout, def: LayerDef, s: number, seed: number, passes: number): LineData {
  const lb = new LineBuilder();
  const place = makePlacer(def, word, s, true);
  const r = rng(seed + 37);

  word.strokes.forEach((st) => {
    if (st.kind !== 'main') return;
    const n = st.pts.length;
    const closed =
      Math.hypot(st.pts[0][0] - st.pts[n - 1][0], st.pts[0][1] - st.pts[n - 1][1]) < 1e-6;
    for (let pass = 0; pass < passes; pass++) {
      const pts = resample(st.pts, 0.03);
      const over = closed ? 0 : 0.025 + r() * 0.04;
      const dOff = (r() - 0.5) * 0.09 * def.depth;
      const ph = r() * 10;
      const wob = 0.014 + r() * 0.012;
      const ext: [number, number, number][] = [];
      if (over) {
        const a = pts[0];
        const b = pts[1];
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dl = Math.hypot(dx, dy) || 1;
        ext.push([a[0] + (dx / dl) * over, a[1] + (dy / dl) * over, 0]);
      }
      pts.forEach((p) => ext.push([p[0], p[1], p[2]]));
      if (over) {
        const c = pts[pts.length - 1];
        const d = pts[pts.length - 2];
        const ex = c[0] - d[0];
        const ey = c[1] - d[1];
        const el = Math.hypot(ex, ey) || 1;
        ext.push([c[0] + (ex / el) * over, c[1] + (ey / el) * over, 1]);
      }
      // the hand wobble is baked in: this pass is not the exact letter and never becomes it
      const wobbled = ext.map((p, i) => {
        const nx = noise(i * 0.18 + ph, pass, 1, 5);
        const ny = noise(i * 0.18 + ph, pass, 2, 5);
        return [p[0] + nx * wob * 2, p[1] + ny * wob * 2, p[2]] as [number, number, number];
      });
      // z of meta carries the pass index: the shader separates the passes under motion
      pushPolyline(
        lb,
        wobbled,
        place,
        st.glyph,
        word,
        0.85 + r() * 0.3,
        passes > 1 ? pass / (passes - 1) : 0,
        unitDir(r),
        makePlacerDepth(def, dOff),
      );
    }
  });

  return lb.build();
}

/** a fixed depth for a whole trace pass, so a pass reads as one sheet of hand */
function makePlacerDepth(def: LayerDef, offset: number): number {
  return def.depth + offset;
}

/* ---- LATTICE: the subject as a machine holds it ---- */
function buildLattice(
  word: WordLayout,
  def: LayerDef,
  s: number,
  seed: number,
  pitch: number,
): CellData {
  const place = makePlacer(def, word, s, true);
  const r = rng(seed + 53);
  const seen = new Set<number>();
  const center: number[] = [];
  const meta: number[] = [];

  const add = (x: number, y: number, gi: number, amp: number) => {
    const ix = Math.round(x / pitch);
    const iy = Math.round(y / pitch);
    const key = ix * 8192 + iy;
    if (seen.has(key)) return;
    seen.add(key);
    const cx = ix * pitch;
    const cy = iy * pitch;
    const p = place(cx, cy, gi);
    center.push(p[0], p[1], p[2]);
    meta.push(amp, sweepOf(cx, word), r(), gi < 0 ? 0 : gi);
  };

  word.strokes.forEach((st) => {
    resample(st.pts, pitch * 0.5).forEach((p) => {
      add(p[0], p[1], st.glyph, 1);
      // dither residue: a machine that is not quite sure which cell the stroke is in
      if (st.kind === 'main' && r() < 0.1) {
        add(p[0] + (r() < 0.5 ? -pitch : pitch), p[1] + (r() < 0.5 ? -pitch : pitch), st.glyph, 0.45);
      }
    });
  });
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    add(Math.cos(a) * 0.13, Math.sin(a) * 0.13, -1, 1);
  }

  return {
    center: new Float32Array(center),
    meta: new Float32Array(meta),
    count: center.length / 3,
    pitch: pitch * s * (def.depth / D0),
  };
}

/* ---- FIELD: a distribution that denoises onto the stroke ---- */
function buildField(
  word: WordLayout,
  def: LayerDef,
  s: number,
  seed: number,
  density: number,
): PointCloud {
  const place = makePlacer(def, word, s, true);
  const r = rng(seed + 71);
  const home: number[] = [];
  const jitter: number[] = [];
  const meta: number[] = [];

  const perPoint = Math.max(1, Math.round(4 * density));
  const push = (x: number, y: number, gi: number, jx: number, jy: number, amp: number, prior: number) => {
    const p = place(x, y, gi);
    const k = (gi >= 0 ? def.depth : def.depth) / D0;
    home.push(p[0], p[1], p[2]);
    jitter.push(jx * s * k, jy * s * k, (r() * 2 - 1) * 0.12);
    meta.push(amp, sweepOf(x, word), r(), prior);
  };

  word.strokes.forEach((st) => {
    resample(st.pts, 0.05).forEach((p) => {
      for (let m = 0; m < perPoint; m++) {
        push(p[0], p[1], st.glyph, gauss(r) * 0.11, gauss(r) * 0.11, 0.85 + r() * 0.3, 0);
      }
    });
  });

  // the prior: the noise the subject is drawn out of. It never resolves into anything.
  const halfW = Math.max(Math.abs(word.bbox.x0), Math.abs(word.bbox.x1));
  const priorCount = Math.round(230 * density);
  for (let i = 0; i < priorCount; i++) {
    const px = gauss(r) * halfW * 0.55;
    const py = gauss(r) * 0.8;
    if (Math.abs(px) < 0.5 && Math.abs(py) < 0.3) continue;
    push(px, py, -1, 0, 0, 0.2 + r() * 0.25, 1);
  }

  return {
    home: new Float32Array(home),
    jitter: new Float32Array(jitter),
    meta: new Float32Array(meta),
    count: home.length / 3,
  };
}

/* ------------------------------------------------------------------
   the world
   ------------------------------------------------------------------ */

export function buildVantageWorld(opts: WorldOptions): VantageWorld {
  const aspect = Math.max(0.35, opts.aspect);
  const seed = opts.seed ?? 1337;
  const stacked = aspect < 1.05;
  const word = layout(stacked ? ['SIDDH', 'ARTHA'] : [SUBJECT_NAME]);

  // fit the word into the view the vantage has of the word plane
  const fov = 46 * (Math.PI / 180);
  const vh = 2 * D0 * Math.tan(fov / 2);
  const vw = vh * aspect;
  const halfW = Math.max(Math.abs(word.bbox.x0), Math.abs(word.bbox.x1));
  const halfH = Math.max(Math.abs(word.bbox.y0), Math.abs(word.bbox.y1));
  const fill = opts.fill ?? 0.78;
  const s = Math.min((vw * fill) / (2 * halfW), (vh * (stacked ? 0.42 : 0.5)) / (2 * halfH));

  const defs = Object.fromEntries(LAYER_DEFS.map((d) => [d.id, d])) as Record<LayerId, LayerDef>;

  const instrument = buildInstrument(word, defs.instrument, s, seed);
  const design = buildDesign(word, defs.design, s, seed);
  const trace = buildTrace(word, defs.trace, s, seed, Math.max(1, opts.tracePasses ?? 3));
  const lattice = buildLattice(word, defs.lattice, s, seed, opts.latticePitch ?? 0.05);
  const field = buildField(word, defs.field, s, seed, opts.fieldDensity ?? 1);

  const bounds: LayerBounds[] = LAYER_DEFS.map((d) => {
    const k = d.depth / D0;
    return {
      id: d.id,
      center: [
        ((word.bbox.x0 + word.bbox.x1) / 2) * s * k,
        ((word.bbox.y0 + word.bbox.y1) / 2) * s * k,
        -d.depth,
      ],
      width: (word.bbox.x1 - word.bbox.x0) * s * k * 1.08,
      height: (word.bbox.y1 - word.bbox.y0) * s * k * 2.1,
      depth: d.depth,
    };
  });

  const measured = (word.bbox.x1 - word.bbox.x0).toFixed(2);
  const sampleCount =
    instrument.count / 2 + design.count / 2 + trace.count / 2 + lattice.count + field.count;

  return {
    word,
    scale: s,
    aspect,
    stacked,
    instrument,
    design,
    trace,
    lattice,
    field,
    bounds,
    measured,
    sampleCount,
  };
}
