import { expect, type Page } from '@playwright/test';

/**
 * The shape of the development handle the Director installs. It exposes
 * the real frame function, so a test can advance the world by an exact
 * number of frames instead of sleeping and hoping.
 */
export interface Vantage {
  step(dt: number, n: number, renderEvery?: number): void;
  rig: {
    mode: 'guided' | 'exploratory' | 'focused';
    progress: number;
    begin(reduced: boolean): void;
    release(): void;
    toVantage(): void;
  };
  sim: {
    t: number;
    E: number;
    still: number;
    lock: number;
    err: number;
    reducedMotion: boolean;
    hovered: string | null;
    focused: string | null;
    reveal: number;
    discovered: Set<string>;
    layers: Record<
      string,
      { motion: number; attention: number; resolution: number; separation: number }
    >;
  };
  input: { state: { present: boolean; vx: number; vy: number; keys: Set<string> } };
  gl: {
    info: {
      render: { frame: number; calls: number; triangles: number; points: number; lines: number };
      memory: { geometries: number; textures: number };
      programs: { length: number };
    };
  };
  scene: unknown;
  camera: { fov: number; aspect: number };
}

declare global {
  interface Window {
    __vantage?: Vantage;
  }
}

/** collect console errors and failed requests for the life of a page */
export function watchForProblems(page: Page): { errors: string[]; failed: string[] } {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText ?? 'unknown';
    // a navigation the test itself aborted is not a product failure
    if (why.includes('ERR_ABORTED')) return;
    failed.push(`${r.url()} ${why}`);
  });
  return { errors, failed };
}

export async function gotoWorld(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__vantage, undefined, { timeout: 20_000 });
}

/** press Begin and let the dev handle appear */
export async function enter(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('radio', { name: 'guided' })).toBeVisible();
}

/**
 * Advance the world by `seconds` of simulated time. Fixed-step, so an
 * assertion is about what the world does, never about how fast the
 * machine running the test happens to be. `renderEvery` keeps a
 * software rasteriser from setting the pace of the suite.
 */
export const TEST_DT = 1 / 30;

export async function advance(page: Page, seconds: number, renderEvery = 6): Promise<void> {
  await page.evaluate(
    ([secs, every, dt]) =>
      window.__vantage?.step(dt as number, Math.max(1, Math.round((secs as number) / (dt as number))), every as number),
    [seconds, renderEvery, TEST_DT],
  );
}

export interface Snapshot {
  err: number;
  lock: number;
  still: number;
  E: number;
  mode: string;
  focused: string | null;
  hovered: string | null;
  progress: number;
  reveal: number;
  motion: Record<string, number>;
  resolution: Record<string, number>;
}

export async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const v = window.__vantage!;
    const motion: Record<string, number> = {};
    const resolution: Record<string, number> = {};
    for (const [k, L] of Object.entries(v.sim.layers)) {
      motion[k] = L.motion;
      resolution[k] = L.resolution;
    }
    return {
      err: v.sim.err,
      lock: v.sim.lock,
      still: v.sim.still,
      E: v.sim.E,
      mode: v.rig.mode,
      focused: v.sim.focused,
      hovered: v.sim.hovered,
      progress: v.rig.progress,
      reveal: v.sim.reveal,
      motion,
      resolution,
    };
  });
}

/** enter, run the guided path to its end, and confirm the exact arrival */
export async function enterAndArrive(page: Page): Promise<void> {
  await enter(page);
  await advance(page, 19);
  const s = await snapshot(page);
  expect(s.err).toBeLessThan(0.001);
  expect(s.lock).toBeGreaterThan(0.99);
}

/**
 * Shake the pointer the way a visitor would, through the real input
 * state, then let the world run on.
 */
export async function shake(page: Page, seconds = 1.2): Promise<void> {
  await page.evaluate(
    ([secs, dt]) => {
      const v = window.__vantage!;
      const s = v.input.state;
      const n = Math.max(1, Math.round((secs as number) / (dt as number)));
      s.present = true;
      for (let i = 0; i < n; i++) {
        s.vx = 1.1 * Math.sin(i * 0.6);
        s.vy = 0.5 * Math.cos(i * 0.5);
        v.step(dt as number, 1, i === n - 1 ? 1 : 0);
      }
    },
    [seconds, TEST_DT],
  );
}

export async function beStill(page: Page, seconds = 5): Promise<void> {
  await page.evaluate(
    ([secs, dt]) => {
      const v = window.__vantage!;
      v.input.state.vx = 0;
      v.input.state.vy = 0;
      v.step(dt as number, Math.max(1, Math.round((secs as number) / (dt as number))), 6);
    },
    [seconds, TEST_DT],
  );
}
