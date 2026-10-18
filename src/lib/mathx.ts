/* ------------------------------------------------------------------
   mathx.ts - the arithmetic the world is made of.
   Ported from the original MIRACLE (js/core.js) and typed. No deps,
   no three, no React: everything here is a pure function or a tiny
   struct, so it can be unit-tested and reused by any representation.
   ------------------------------------------------------------------ */

export const TAU = Math.PI * 2;

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** smoothstep between two edges */
export function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** quintic smootherstep: zero 1st and 2nd derivative at both ends */
export function smoother(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Frame-rate independent exponential approach. Use this instead of
 * `a += (b - a) * 0.1`, which is a different animation at 60 and 144 Hz.
 */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));

/**
 * A critically damped spring toward `target`, solved exactly, so it is
 * stable at any dt (including the 2 s dt of a backgrounded tab).
 * Unlike damp(), whose speed is maximal the instant the target moves,
 * this builds speed up and lets it settle: a turn of the head starts
 * and ends like something with weight. Mutates and returns `out`.
 */
export function crit(
  x: number,
  v: number,
  target: number,
  w: number,
  dt: number,
  out: [number, number],
): [number, number] {
  const d = x - target;
  const e = Math.exp(-w * dt);
  const c = (v + w * d) * dt;
  out[0] = target + (d + c) * e;
  out[1] = (v - w * c) * e;
  return out;
}

/** mulberry32: a small seeded PRNG, so the world is identical on every visit */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller: a normal deviate from a uniform source */
export function gauss(r: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

export function hash(ix: number, iy: number, iz: number, seed: number): number {
  let h =
    Math.imul(ix, 374761393) ^
    Math.imul(iy, 668265263) ^
    Math.imul(iz, 1440662683) ^
    Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** smooth value noise in [-1, 1] */
export function noise(x: number, y: number, z: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iy, iz, seed);
  const b = hash(ix + 1, iy, iz, seed);
  const c = hash(ix, iy + 1, iz, seed);
  const d = hash(ix + 1, iy + 1, iz, seed);
  const e = hash(ix, iy, iz + 1, seed);
  const f = hash(ix + 1, iy, iz + 1, seed);
  const g = hash(ix, iy + 1, iz + 1, seed);
  const h = hash(ix + 1, iy + 1, iz + 1, seed);
  const x1 = a + (b - a) * fx;
  const x2 = c + (d - c) * fx;
  const x3 = e + (f - e) * fx;
  const x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy;
  const y2 = x3 + (x4 - x3) * fy;
  return (y1 + (y2 - y1) * fz) * 2 - 1;
}

/** the shortest signed turn, as an angle in (-pi, pi] */
export const wrapPi = (a: number): number => a - TAU * Math.floor((a + Math.PI) / TAU);
