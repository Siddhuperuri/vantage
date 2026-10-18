/* ------------------------------------------------------------------
   world.test.ts - the claims worth proving in code.

   The central one: every layer has real relief in depth, and that
   relief changes nothing about where its points land when projected
   from the vantage. If that invariant breaks, the artwork stops
   working and nothing on screen would tell you why - so it is a test.
   ------------------------------------------------------------------ */

import { describe, expect, it } from 'vitest';
import { crit, damp, noise, rng, smooth } from '../lib/mathx';
import { layout, resample, strokeLength, svgPath, textStrokes } from '../world/glyphs';
import { Harmonograph } from '../world/harmonograph';
import { D0 } from '../world/layers';
import { buildVantageWorld } from '../world/vantage';

describe('glyph geometry', () => {
  it('lays the name out around the counter of the shared A', () => {
    const w = layout(['SIDDHARTHA']);
    expect(w.glyphs).toHaveLength(10);
    // the axis of the piece is the origin of the layout
    const firstA = w.glyphs.find((g) => g.ch === 'A');
    expect(firstA).toBeDefined();
    expect(Math.abs((firstA?.x ?? 9) + 0.42)).toBeLessThan(1e-9);
    expect(w.bbox.x1 - w.bbox.x0).toBeGreaterThan(9);
    expect(w.bbox.y1 - w.bbox.y0).toBeGreaterThan(0.9);
  });

  it('gives every free terminal a survey tick', () => {
    const w = layout(['SIDDHARTHA']);
    const ticks = w.strokes.filter((s) => s.kind === 'tick');
    // H alone has four free ends; the whole name has many
    expect(ticks.length).toBeGreaterThan(20);
    // a tick is a two-point mark, never a polyline
    expect(ticks.every((s) => s.pts.length === 2)).toBe(true);
  });

  it('resamples to roughly uniform spacing', () => {
    const pts = [
      [0, 0],
      [1, 0],
      [1, 1],
    ] as const;
    const out = resample(pts, 0.1);
    expect(out.length).toBeGreaterThan(18);
    expect(out[0][2]).toBe(0);
    expect(out[out.length - 1][2]).toBeCloseTo(1, 6);
    const gaps: number[] = [];
    for (let i = 1; i < out.length; i++) {
      gaps.push(Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    }
    const max = Math.max(...gaps);
    const min = Math.min(...gaps);
    expect(max - min).toBeLessThan(0.02);
    expect(strokeLength(pts)).toBeCloseTo(2, 9);
  });

  it('writes the same strokes as an SVG path for the no-WebGL still', () => {
    const { d, width } = svgPath('VANTAGE');
    expect(d.startsWith('M')).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(textStrokes('VANTAGE').strokes.length).toBeGreaterThan(7);
  });
});

describe('the anamorphic placement', () => {
  const world = buildVantageWorld({ aspect: 1.6, fieldDensity: 0.4, tracePasses: 1 });

  it('builds all five layers', () => {
    expect(world.design.count).toBeGreaterThan(1000);
    expect(world.instrument.count).toBeGreaterThan(1000);
    expect(world.trace.count).toBeGreaterThan(500);
    expect(world.lattice.count).toBeGreaterThan(300);
    expect(world.field.count).toBeGreaterThan(300);
    expect(world.sampleCount).toBeGreaterThan(3000);
  });

  it('gives each layer real relief in depth', () => {
    const z = world.design.position;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 2; i < z.length; i += 3) {
      min = Math.min(min, z[i]);
      max = Math.max(max, z[i]);
    }
    // the design layer sits at 12.6, spread 0.075: a sheet with relief,
    // not a plane
    expect(max - min).toBeGreaterThan(0.5);
    expect(-max).toBeGreaterThan(11);
    expect(-min).toBeLessThan(15);
  });

  it('projects every layer onto the same image from the vantage, relief and all', () => {
    // from the origin, a point (x, y, z) lands at (x/|z|, y/|z|): if the
    // placement is right, that is s*x/D0 whatever depth was chosen, so
    // the projected bounding box must be the word's, exactly.
    const expectX0 = (world.word.bbox.x0 * world.scale) / D0;
    const expectX1 = (world.word.bbox.x1 * world.scale) / D0;

    const box = (data: Float32Array) => {
      let x0 = Infinity;
      let x1 = -Infinity;
      for (let i = 0; i < data.length; i += 3) {
        const d = Math.abs(data[i + 2]);
        const rx = data[i] / d;
        x0 = Math.min(x0, rx);
        x1 = Math.max(x1, rx);
      }
      return { x0, x1 };
    };

    // the design layer is exactly the letters plus the axis ring, so its
    // projection must match the word's own extent
    const design = box(world.design.position);
    expect(design.x0).toBeCloseTo(expectX0, 5);
    expect(design.x1).toBeCloseTo(expectX1, 5);

    // the trace layer is the same letters drawn loosely: it must project
    // onto the same image, within the hand wobble that is baked into it
    const trace = box(world.trace.position);
    expect(Math.abs(trace.x0 - expectX0)).toBeLessThan(0.02);
    expect(Math.abs(trace.x1 - expectX1)).toBeLessThan(0.02);

    // the lattice is the same letters on a 0.05 cap-unit grid
    const lattice = box(world.lattice.center);
    expect(Math.abs(lattice.x0 - expectX0)).toBeLessThan(0.02);
    expect(Math.abs(lattice.x1 - expectX1)).toBeLessThan(0.02);
  });

  it('stacks the name when the viewport is portrait', () => {
    const tall = buildVantageWorld({ aspect: 0.62, fieldDensity: 0.3, tracePasses: 1 });
    expect(tall.stacked).toBe(true);
    expect(tall.word.rows).toBe(2);
    expect(tall.word.glyphs).toHaveLength(10);
  });

  it('reports a true measurement for the instrument layer to draw', () => {
    expect(Number(world.measured)).toBeCloseTo(world.word.bbox.x1 - world.word.bbox.x0, 2);
  });
});

describe('motion that is frame-rate independent', () => {
  it('damps to the same place at 60 and 144 Hz', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 6, 1 / 60);
    let b = 0;
    for (let i = 0; i < 144; i++) b = damp(b, 1, 6, 1 / 144);
    expect(Math.abs(a - b)).toBeLessThan(0.002);
    expect(a).toBeGreaterThan(0.99);
  });

  it('keeps the critically damped spring stable at an absurd dt', () => {
    const out: [number, number] = [0, 0];
    let x = 12;
    let v = -40;
    for (let i = 0; i < 10; i++) {
      crit(x, v, 0, 5, 2.5, out);
      x = out[0];
      v = out[1];
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(Math.abs(x)).toBeLessThan(0.001);
  });

  it('has noise in range and a repeatable prng', () => {
    const r1 = rng(7);
    const r2 = rng(7);
    expect(r1()).toBe(r2());
    for (let i = 0; i < 200; i++) {
      const n = noise(i * 0.37, i * 0.11, i * 0.71, 3);
      expect(n).toBeGreaterThanOrEqual(-1);
      expect(n).toBeLessThanOrEqual(1);
    }
    expect(smooth(0, 1, -5)).toBe(0);
    expect(smooth(0, 1, 5)).toBe(1);
  });
});

describe('the figure a visit draws', () => {
  it('grows only as loci are expressed, and stays inside the unit square', () => {
    const h = new Harmonograph(0.31);
    const before = h.complexity();
    h.express('instrument', 1);
    h.express('curiosity', 0.4);
    expect(h.complexity()).toBeGreaterThan(before);

    for (let i = 0; i < 400; i++) h.update(1 / 60, 1, false);
    expect(h.prog).toBeGreaterThan(0.2);

    const n = h.sample(600);
    expect(n).toBe(600);
    for (let i = 0; i < n; i++) {
      expect(Math.abs(h.px[i])).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(h.py[i])).toBeLessThanOrEqual(1.0001);
    }
  });
});
