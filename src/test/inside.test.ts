import { describe, expect, it } from 'vitest';
import { buildInsideWorld } from '../world/inside';

describe('the inside: a crossword of the mind', () => {
  const w = buildInsideWorld([0, 0, -36], 9, 0.6);

  it('places the spine and most of the concepts', () => {
    expect(w.words[0].text).toBe('SIDDHARTHA');
    expect(w.words.length).toBeGreaterThanOrEqual(14);
  });

  it('crosses every word with one already on the wall', () => {
    const owned = new Map<number, number[]>();
    for (const L of w.letters) owned.set(L.index, L.words);
    for (const word of w.words.slice(1)) {
      const crossings = word.letters.filter((i) => (owned.get(i) ?? []).length > 1);
      expect(crossings.length, `${word.text} must cross something`).toBeGreaterThan(0);
    }
  });

  it('never puts two different letters in one cell', () => {
    const seen = new Map<string, string>();
    for (const L of w.letters) {
      const k = `${L.row},${L.col}`;
      const prev = seen.get(k);
      if (prev) expect(prev).toBe(L.ch);
      seen.set(k, L.ch);
    }
    expect(seen.size).toBe(w.letters.length);
  });

  it('pairs the five contradictions both ways', () => {
    const pairs = w.words.filter((x) => x.opposes >= 0);
    expect(pairs.length).toBe(10);
    for (const a of pairs) {
      const b = w.words[a.opposes];
      expect(b.opposes).toBe(a.index);
    }
  });

  it('wraps the wall around the visitor without closing it', () => {
    const az = w.letters.map((L) => L.azimuth);
    const spread = Math.max(...az) - Math.min(...az);
    expect(spread).toBeGreaterThan(1.2);
    expect(spread).toBeLessThan(Math.PI * 2);
    for (const L of w.letters) {
      const r = Math.hypot(L.x - 0, L.z - -36);
      expect(Math.abs(r - 9)).toBeLessThan(0.001);
    }
  });

  it('builds geometry for every letter and a cloud along it', () => {
    expect(w.line.count).toBeGreaterThan(2000);
    expect(w.cloud.count).toBeGreaterThan(500);
    expect(w.line.meta.length).toBe(w.line.count * 4);
    expect(w.line.normal.length).toBe(w.line.count * 3);
    const maxLetter = Math.max(...Array.from(w.line.meta).filter((_, i) => i % 4 === 0));
    expect(maxLetter).toBeLessThan(w.letterCount);
  });
});
