/* ------------------------------------------------------------------
   glyphs.ts - a typeface that exists only as geometry.

   Ported from the original MIRACLE (legacy/js/glyphs.js). Every letter
   is a handful of strokes on a cap-height-1 grid, y up. Arcs are real
   ellipse arcs; nothing is a font file, so there is nothing to load
   and the same geometry feeds the 3D line meshes, the in-world labels
   and the no-WebGL SVG fallback. Free stroke ends receive a short
   perpendicular survey tick, so the alphabet reads as an engineer
   drawing of letters: stems are beams, terminals are dimension marks.
   ------------------------------------------------------------------ */

export type Pt = readonly [number, number];
export type Stroke = Pt[];

export interface GlyphDef {
  readonly ch: string;
  /** advance width in cap units */
  readonly w: number;
  readonly s: readonly Stroke[];
  /** a point inside the letter that can act as an axis (the counter of A) */
  readonly anchor: Pt | null;
}

const RAD = Math.PI / 180;

/** polyline from a flat x,y list */
function L(...a: number[]): Stroke {
  const out: Pt[] = [];
  for (let i = 0; i < a.length; i += 2) out.push([a[i], a[i + 1]] as Pt);
  return out;
}

/** elliptical arc in degrees, counter-clockwise positive */
function A(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Stroke {
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 6));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * RAD;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt);
  }
  return out;
}

/** join pieces, dropping duplicate joints */
function P(...segs: Stroke[]): Stroke {
  const out: Pt[] = [];
  for (const seg of segs) {
    for (const p of seg) {
      const q = out[out.length - 1];
      if (q && Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6) continue;
      out.push([p[0], p[1]] as Pt);
    }
  }
  return out;
}

const G: Record<string, GlyphDef> = {};
function def(ch: string, w: number, s: Stroke[], anchor: Pt | null = null): void {
  G[ch] = { ch, w, s, anchor };
}

/* ---- capitals ---- */
def('A', 0.84, [L(0, 0, 0.42, 1, 0.84, 0), L(0.134, 0.32, 0.706, 0.32)], [0.42, 0.51]);
def('B', 0.62, [
  L(0, 0, 0, 1),
  P(L(0, 1, 0.3, 1), A(0.3, 0.75, 0.28, 0.25, 90, -90), L(0.3, 0.5, 0, 0.5)),
  P(L(0, 0.5, 0.34, 0.5), A(0.34, 0.25, 0.28, 0.25, 90, -90), L(0.34, 0, 0, 0)),
]);
def('C', 0.82, [A(0.46, 0.5, 0.46, 0.5, 40, 320)]);
def('D', 0.82, [P(L(0, 0, 0, 1, 0.38, 1), A(0.38, 0.5, 0.44, 0.5, 90, -90), L(0.38, 0, 0, 0))]);
def('E', 0.58, [L(0.58, 1, 0, 1, 0, 0, 0.58, 0), L(0, 0.5, 0.48, 0.5)]);
def('F', 0.58, [L(0.58, 1, 0, 1, 0, 0), L(0, 0.55, 0.48, 0.55)]);
def('G', 0.92, [P(A(0.46, 0.5, 0.46, 0.5, 40, 360), L(0.5, 0.5))]);
def('H', 0.72, [L(0, 0, 0, 1), L(0.72, 0, 0.72, 1), L(0, 0.5, 0.72, 0.5)]);
def('I', 0.4, [L(0.2, 0, 0.2, 1), L(0, 1, 0.4, 1), L(0, 0, 0.4, 0)]);
def('J', 0.5, [P(L(0.5, 1, 0.5, 0.32), A(0.25, 0.32, 0.25, 0.32, 0, -180))]);
def('K', 0.68, [L(0, 0, 0, 1), L(0.64, 1, 0, 0.4), L(0.18, 0.58, 0.68, 0)]);
def('L', 0.54, [L(0, 1, 0, 0, 0.54, 0)]);
def('M', 0.8, [L(0, 0, 0, 1, 0.4, 0.36, 0.8, 1, 0.8, 0)]);
def('N', 0.7, [L(0, 0, 0, 1, 0.7, 0, 0.7, 1)]);
def('O', 0.92, [A(0.46, 0.5, 0.46, 0.5, 90, 450)]);
def('P', 0.6, [
  L(0, 0, 0, 1),
  P(L(0, 1, 0.3, 1), A(0.3, 0.72, 0.3, 0.28, 90, -90), L(0.3, 0.44, 0, 0.44)),
]);
def('Q', 0.92, [A(0.46, 0.5, 0.46, 0.5, 90, 450), L(0.56, 0.22, 0.9, -0.1)]);
def('R', 0.72, [
  L(0, 0, 0, 1),
  P(L(0, 1, 0.36, 1), A(0.36, 0.75, 0.3, 0.25, 90, -90), L(0.36, 0.5, 0, 0.5)),
  L(0.3, 0.5, 0.72, 0),
]);
def('S', 0.6, [P(A(0.3, 0.75, 0.3, 0.25, 25, 270), A(0.3, 0.25, 0.3, 0.25, 90, -155))]);
def('T', 0.8, [L(0, 1, 0.8, 1), L(0.4, 1, 0.4, 0)]);
def('U', 0.72, [P(L(0, 1, 0, 0.42), A(0.36, 0.42, 0.36, 0.42, 180, 360), L(0.72, 0.42, 0.72, 1))]);
def('V', 0.8, [L(0, 1, 0.4, 0, 0.8, 1)]);
def('W', 1.0, [L(0, 1, 0.22, 0, 0.5, 0.62, 0.78, 0, 1, 1)]);
def('X', 0.7, [L(0, 0, 0.7, 1), L(0, 1, 0.7, 0)]);
def('Y', 0.72, [L(0, 1, 0.36, 0.5, 0.72, 1), L(0.36, 0.5, 0.36, 0)]);
def('Z', 0.66, [L(0, 1, 0.66, 1, 0, 0, 0.66, 0)]);

/* ---- numerals: chamfered, instrument-like ---- */
def('0', 0.5, [L(0.1, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.9, 0.4, 1, 0.1, 1, 0, 0.9, 0, 0.1, 0.1, 0)]);
def('1', 0.4, [L(0.06, 0.78, 0.28, 1, 0.28, 0)]);
def('2', 0.5, [L(0, 0.9, 0.1, 1, 0.4, 1, 0.5, 0.9, 0.5, 0.62, 0, 0, 0.5, 0)]);
def('3', 0.5, [
  L(0, 0.9, 0.1, 1, 0.4, 1, 0.5, 0.9, 0.5, 0.6, 0.4, 0.5, 0.16, 0.5),
  L(0.4, 0.5, 0.5, 0.4, 0.5, 0.1, 0.4, 0, 0.1, 0, 0, 0.1),
]);
def('4', 0.5, [L(0.4, 0, 0.4, 1, 0, 0.34, 0.5, 0.34)]);
def('5', 0.5, [L(0.5, 1, 0.04, 1, 0, 0.56, 0.4, 0.6, 0.5, 0.5, 0.5, 0.1, 0.4, 0, 0.1, 0, 0, 0.1)]);
def('6', 0.5, [
  L(0.46, 1, 0.1, 1, 0, 0.9, 0, 0.1, 0.1, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.44, 0.4, 0.54, 0, 0.54),
]);
def('7', 0.5, [L(0, 1, 0.5, 1, 0.16, 0)]);
def('8', 0.5, [
  L(0.1, 0.5, 0, 0.6, 0, 0.9, 0.1, 1, 0.4, 1, 0.5, 0.9, 0.5, 0.6, 0.4, 0.5, 0.1, 0.5, 0, 0.4, 0, 0.1, 0.1, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.4, 0.4, 0.5),
]);
def('9', 0.5, [
  L(0.04, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.9, 0.4, 1, 0.1, 1, 0, 0.9, 0, 0.56, 0.1, 0.46, 0.5, 0.46),
]);

/* ---- marks ---- */
def('.', 0.12, [L(0.06, 0, 0.06, 0.09)]);
def('-', 0.42, [L(0, 0.5, 0.42, 0.5)]);
def(':', 0.12, [L(0.06, 0.06, 0.06, 0.15), L(0.06, 0.6, 0.06, 0.69)]);
def('/', 0.42, [L(0, 0, 0.42, 1)]);
def('+', 0.5, [L(0, 0.5, 0.5, 0.5), L(0.25, 0.25, 0.25, 0.75)]);
def('?', 0.5, [P(A(0.25, 0.74, 0.25, 0.26, 170, -70), L(0.25, 0.44, 0.25, 0.3)), L(0.25, 0, 0.25, 0.09)]);
def(' ', 0.5, []);

/* ---- geometry helpers ---- */
function distPtSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px;
  const qy = ay + dy * t - py;
  return Math.sqrt(qx * qx + qy * qy);
}

const TICK = 0.1;

/** a short perpendicular mark on every stroke end that joins nothing */
export function ticksFor(strokes: readonly Stroke[]): Stroke[] {
  const out: Stroke[] = [];
  for (let si = 0; si < strokes.length; si++) {
    const pts = strokes[si];
    const n = pts.length;
    if (n < 2) continue;
    if (
      Math.abs(pts[0][0] - pts[n - 1][0]) < 1e-6 &&
      Math.abs(pts[0][1] - pts[n - 1][1]) < 1e-6
    ) {
      continue;
    }
    for (let end = 0; end < 2; end++) {
      const ei = end ? n - 1 : 0;
      const ni = end ? n - 2 : 1;
      const adj = end ? n - 2 : 0;
      const e = pts[ei];
      let joined = false;
      for (let sj = 0; sj < strokes.length && !joined; sj++) {
        const q = strokes[sj];
        for (let k = 0; k < q.length - 1; k++) {
          if (sj === si && k === adj) continue;
          if (distPtSeg(e[0], e[1], q[k][0], q[k][1], q[k + 1][0], q[k + 1][1]) < 0.012) {
            joined = true;
            break;
          }
        }
      }
      if (joined) continue;
      const tx = e[0] - pts[ni][0];
      const ty = e[1] - pts[ni][1];
      const tl = Math.sqrt(tx * tx + ty * ty) || 1;
      const px = -ty / tl;
      const py = tx / tl;
      const dx = Math.abs(px) >= Math.abs(py) ? 1 : 0;
      const dy = dx ? 0 : 1;
      out.push([
        [e[0] - (dx * TICK) / 2, e[1] - (dy * TICK) / 2],
        [e[0] + (dx * TICK) / 2, e[1] + (dy * TICK) / 2],
      ]);
    }
  }
  return out;
}

/** a point on a resampled polyline: x, y and arc position 0..1 */
export type SamplePt = readonly [number, number, number];

/** resample a polyline to roughly uniform spacing */
export function resample(pts: readonly Pt[], ds: number): SamplePt[] {
  const n = pts.length;
  const cum: number[] = [0];
  for (let i = 1; i < n; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = cum[n - 1];
  if (total < 1e-9) return [[pts[0][0], pts[0][1], 0]];
  const count = Math.max(1, Math.round(total / ds));
  const out: SamplePt[] = [];
  let j = 1;
  for (let i = 0; i <= count; i++) {
    const d = (total * i) / count;
    while (j < n - 1 && cum[j] < d) j++;
    const seg = cum[j] - cum[j - 1] || 1;
    const u = (d - cum[j - 1]) / seg;
    out.push([
      pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u,
      pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u,
      d / total,
    ]);
  }
  return out;
}

export function strokeLength(pts: readonly Pt[]): number {
  let t = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    t += Math.sqrt(dx * dx + dy * dy);
  }
  return t;
}

/* ---- word layout ---- */

export interface LaidGlyph {
  readonly ch: string;
  readonly idx: number;
  readonly row: number;
  x: number;
  y: number;
  readonly w: number;
  cx: number;
  cy: number;
}

export type StrokeKind = 'main' | 'tick';

export interface LaidStroke {
  readonly pts: Stroke;
  readonly glyph: number;
  readonly kind: StrokeKind;
}

export interface WordLayout {
  readonly glyphs: LaidGlyph[];
  readonly strokes: LaidStroke[];
  readonly bbox: { x0: number; x1: number; y0: number; y1: number };
  readonly rows: number;
}

export const TRACK = 0.3;
const LINEGAP = 0.62;

/**
 * Lay out one or more lines of capitals. The origin of the result is
 * the axis of the piece: the counter of the shared A on a single line
 * (SIDDH-A-RTHA), or the gap between the rows when the name is
 * stacked for a narrow screen. Everything else is placed relative to
 * that point, so the composition survives a change of aspect.
 */
export function layout(lines: readonly string[]): WordLayout {
  const glyphs: LaidGlyph[] = [];
  let gi = 0;

  lines.forEach((text, r) => {
    let w = 0;
    for (let i = 0; i < text.length; i++) w += (G[text[i]]?.w ?? 0.5) + (i ? TRACK : 0);
    let x = -w / 2;
    const y = -r * (1 + LINEGAP);
    for (let i = 0; i < text.length; i++) {
      const g = G[text[i]] ?? G[' '];
      glyphs.push({ ch: text[i], idx: gi++, row: r, x, y, w: g.w, cx: x + g.w / 2, cy: y + 0.5 });
      x += g.w + TRACK;
    }
  });

  let ax: number;
  let ay: number;
  if (lines.length === 1) {
    const ga = glyphs.find((g) => g.ch === 'A');
    const anchor = G.A.anchor as Pt;
    ax = (ga?.x ?? 0) + anchor[0];
    ay = (ga?.y ?? 0) + anchor[1];
  } else {
    ax = 0;
    ay = -LINEGAP / 2;
  }

  const strokes: LaidStroke[] = [];
  let x0 = 1e9;
  let x1 = -1e9;
  let y0 = 1e9;
  let y1 = -1e9;

  glyphs.forEach((g) => {
    g.x -= ax;
    g.y -= ay;
    g.cx -= ax;
    g.cy -= ay;
  });

  glyphs.forEach((g) => {
    const src = (G[g.ch] ?? G[' ']).s.map((pts) => pts.map((p) => [p[0] + g.x, p[1] + g.y] as Pt));
    const note = (pts: Stroke) => {
      for (const p of pts) {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[1] > y1) y1 = p[1];
      }
    };
    src.forEach((pts) => {
      strokes.push({ pts, glyph: g.idx, kind: 'main' });
      note(pts);
    });
    ticksFor(src).forEach((pts) => {
      strokes.push({ pts, glyph: g.idx, kind: 'tick' });
      note(pts);
    });
  });

  return { glyphs, strokes, bbox: { x0, x1, y0, y1 }, rows: lines.length };
}

/** text as raw strokes, for in-world labels and measured numerals */
export function textStrokes(
  str: string,
  opts: { track?: number; ticks?: boolean } = {},
): { strokes: Stroke[]; width: number } {
  const track = opts.track ?? 0.22;
  let x = 0;
  const out: Stroke[] = [];
  for (const raw of str) {
    const g = G[raw.toUpperCase()] ?? G[' '];
    g.s.forEach((pts) => out.push(pts.map((p) => [p[0] + x, p[1]] as Pt)));
    if (opts.ticks !== false) {
      ticksFor(g.s).forEach((pts) => out.push(pts.map((p) => [p[0] + x, p[1]] as Pt)));
    }
    x += g.w + track;
  }
  return { strokes: out, width: Math.max(0, x - track) };
}

/** the same strokes as an SVG path: used by the no-WebGL fallback */
export function svgPath(str: string, unit = 100, track = 0.3): { d: string; width: number } {
  const t = textStrokes(str, { track, ticks: false });
  let d = '';
  t.strokes.forEach((pts) => {
    d +=
      'M' +
      pts.map((p) => `${(p[0] * unit).toFixed(1)} ${(unit - p[1] * unit).toFixed(1)}`).join('L');
  });
  return { d, width: t.width * unit };
}

export const glyphDefs = G;
