import { expect, test } from '@playwright/test';
import {
  advance,
  beStill,
  enter,
  enterAndArrive,
  gotoWorld,
  shake,
  snapshot,
  watchForProblems,
} from './helpers';

test.describe('VANTAGE', () => {
  test('loads, offers the way in, and says how big the world is', async ({ page }) => {
    const problems = watchForProblems(page);
    await gotoWorld(page);

    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.getByText(/samples · drag to turn/)).toBeVisible();
    // the accessible description exists before anything is drawn
    await expect(page.getByRole('heading', { name: 'Siddhartha — Vantage' })).toBeAttached();

    expect(problems.errors, 'console errors on load').toEqual([]);
    expect(problems.failed, 'failed requests on load').toEqual([]);
  });

  test('the guided path arrives exactly at the vantage and hands over', async ({ page }) => {
    await gotoWorld(page);
    await enter(page);

    const start = await snapshot(page);
    expect(start.mode).toBe('guided');
    expect(start.err).toBeGreaterThan(20);

    await advance(page, 19);
    const end = await snapshot(page);

    // the vantage is an exact state, not a tolerance
    expect(end.err).toBeLessThan(0.001);
    expect(end.lock).toBeGreaterThan(0.99);
    expect(end.progress).toBe(1);
    // and the visitor is not left inside a cinematic
    expect(end.mode).toBe('exploratory');
  });

  test('motion scatters, and each layer fails in its own way', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    await shake(page);
    const s = await snapshot(page);

    expect(s.E).toBeGreaterThan(0.4);
    expect(s.still).toBeLessThan(0.1);
    for (const id of ['instrument', 'design', 'lattice', 'field', 'trace']) {
      expect(s.motion[id], `${id} should answer motion`).toBeGreaterThan(0.1);
    }
    // the lattice loses resolution; the instrument, which is the
    // reference frame, keeps far more of its own
    expect(s.resolution.lattice).toBeLessThan(0.7);
    expect(s.resolution.trace).toBeLessThan(0.4);
    expect(s.resolution.instrument).toBeGreaterThan(s.resolution.lattice);
  });

  test('stillness resolves, exactly', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);
    await shake(page);
    await beStill(page);

    const s = await snapshot(page);
    expect(s.E).toBeLessThan(0.01);
    expect(s.still).toBeGreaterThan(0.99);
    expect(s.err).toBeLessThan(0.001);
    expect(s.lock).toBeGreaterThan(0.99);
    for (const id of ['instrument', 'design', 'lattice', 'field']) {
      expect(s.motion[id], `${id} should have settled`).toBeLessThan(0.02);
      expect(s.resolution[id], `${id} should have resolved`).toBeGreaterThan(0.9);
    }
  });

  test('attention pulls: hovering a sheet raises only that layer', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.3);
    await advance(page, 2);

    const s = await snapshot(page);
    expect(s.hovered).not.toBeNull();
    const raised = Object.entries(s.motion).length;
    expect(raised).toBe(5);
    const attn = await page.evaluate(() => {
      const v = window.__vantage!;
      return Object.fromEntries(
        Object.entries(v.sim.layers).map(([k, L]) => [k, L.attention]),
      ) as Record<string, number>;
    });
    const hovered = s.hovered!;
    expect(attn[hovered]).toBeGreaterThan(0.1);
    for (const [id, a] of Object.entries(attn)) {
      if (id !== hovered) expect(a, `${id} should not be attended to`).toBeLessThan(0.05);
    }
  });

  test('focusing a layer moves the camera off-axis and names it', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    await page.getByRole('button', { name: 'instrument, measures' }).click();
    await advance(page, 3.5);

    const s = await snapshot(page);
    expect(s.focused).toBe('instrument');
    expect(s.mode).toBe('focused');
    // off the vantage: the sheet has to read as a separate sheet
    expect(s.err).toBeGreaterThan(2);
    await expect(
      page.getByRole('navigation', { name: 'Layers' }).getByText(/Baselines, rulers/),
    ).toBeVisible();

    // the discovery is recorded once, and it feeds the drawn figure
    const found = await page.evaluate(() => [...window.__vantage!.sim.discovered]);
    expect(found).toContain('instrument');
  });

  test('V returns to the vantage exactly, from anywhere', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    await page.getByRole('button', { name: 'field, infers' }).click();
    await advance(page, 3.5);
    expect((await snapshot(page)).err).toBeGreaterThan(2);

    await page.keyboard.press('v');
    await advance(page, 7);

    const s = await snapshot(page);
    expect(s.err).toBeLessThan(0.001);
    expect(s.lock).toBeGreaterThan(0.99);
    expect(s.focused).toBeNull();
  });

  test('a guided path taken over early still settles completely', async ({ page }) => {
    // regression: the pre-arrival drift used to be gated on the guided
    // path reaching its end, so a visitor who took over early kept a
    // world that breathed for ever and a name that never resolved
    await gotoWorld(page);
    await enter(page);
    await advance(page, 2);

    await page.evaluate(() => {
      const v = window.__vantage!;
      v.rig.release();
      v.rig.toVantage();
    });
    await advance(page, 10);

    const s = await snapshot(page);
    expect(s.progress).toBeLessThan(0.5);
    expect(s.err).toBeLessThan(0.001);
    expect(s.lock).toBeGreaterThan(0.99);
    expect(s.E).toBeLessThan(0.01);
  });

  test('the keyboard operates the piece', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    await page.keyboard.press('3');
    await advance(page, 1);
    expect((await snapshot(page)).focused).toBe('lattice');

    await page.keyboard.press('Escape');
    await advance(page, 1);
    expect((await snapshot(page)).focused).toBeNull();

    // arrow keys turn the view. Settle at the vantage first, or the
    // camera is still flying home and err is falling, not rising.
    await page.keyboard.press('v');
    await advance(page, 7);
    const before = await snapshot(page);
    expect(before.err).toBeLessThan(0.01);
    await page.keyboard.down('ArrowRight');
    await advance(page, 1);
    await page.keyboard.up('ArrowRight');
    await advance(page, 1);
    expect((await snapshot(page)).err).toBeGreaterThan(before.err + 0.2);

    // H hides every piece of interface, and offers the way back
    await page.keyboard.press('h');
    await expect(page.getByRole('radio', { name: 'guided' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /show interface/ })).toBeVisible();
    await page.keyboard.press('h');
    await expect(page.getByRole('radio', { name: 'guided' })).toBeVisible();
  });

  // desktop, tablet and phone: the three the brief asks for, checked
  // for the two things that actually break - the frame overflowing
  // sideways, and the two docks walking into each other
  for (const vp of [
    { name: 'desktop', width: 1280, height: 720, stacked: false },
    { name: 'tablet', width: 768, height: 1024, stacked: true },
    { name: 'phone', width: 390, height: 844, stacked: true },
  ]) {
    test(`lays out and resolves at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }, info) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoWorld(page);
      await enterAndArrive(page);

      const aspect = await page.evaluate(() => window.__vantage!.camera.aspect);
      expect(aspect < 1.05).toBe(vp.stacked);

      // the framing adapts by the lens, so the subject still resolves
      expect((await snapshot(page)).err).toBeLessThan(0.001);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);

      const camera = (await page.getByRole('radio', { name: 'guided' }).boundingBox())!;
      const layers = (await page.getByRole('button', { name: 'trace, sketches' }).boundingBox())!;
      const overlap =
        layers.y < camera.y + camera.height &&
        layers.y + layers.height > camera.y &&
        layers.x < camera.x + camera.width &&
        layers.x + layers.width > camera.x;
      expect(overlap, 'the layer list must not sit on the camera dock').toBe(false);

      await info.attach(`${vp.name}.png`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    });
  }

  test('reduced motion shortens the path and softens the law', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    await shake(page);
    const full = await snapshot(page);
    await beStill(page);

    await page.getByRole('button', { name: 'settings' }).click();
    await page.getByRole('radio', { name: 'reduced' }).click();
    await page.keyboard.press('Escape');

    expect(await page.evaluate(() => window.__vantage!.sim.reducedMotion)).toBe(true);

    await page.keyboard.press('g');
    const guided = await page.evaluate(() => window.__vantage!.rig.progress);
    expect(guided, 'reduced motion starts past the long approach').toBeGreaterThan(0.5);

    await advance(page, 9);
    await shake(page);
    const reduced = await snapshot(page);

    // the law still applies, it is simply gentler
    expect(reduced.motion.design).toBeGreaterThan(0.05);
    expect(reduced.motion.design).toBeLessThan(full.motion.design * 0.75);

    await beStill(page);
    expect((await snapshot(page)).err).toBeLessThan(0.001);
  });

  test('swapping a treatment disposes the one it replaced', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    const before = await page.evaluate(() => window.__vantage!.gl.info.memory.geometries);

    await page.getByRole('button', { name: 'settings' }).click();
    // 'halftone' names both a field treatment and a print treatment now,
    // so the control is addressed through the group it belongs to
    await page
      .getByRole('group', { name: 'field layer' })
      .getByRole('radio', { name: 'halftone' })
      .click();
    await advance(page, 3.5);
    await page.keyboard.press('Escape');

    const after = await page.evaluate(() => ({
      geometries: window.__vantage!.gl.info.memory.geometries,
      fields: (() => {
        let n = 0;
        (window.__vantage!.scene as { traverse(cb: (o: { name: string }) => void): void }).traverse(
          (o) => {
            if (o.name === 'field') n++;
          },
        );
        return n;
      })(),
    }));

    expect(after.geometries, 'the outgoing treatment must be released').toBe(before);
    expect(after.fields, 'exactly one field treatment in the scene').toBe(1);
  });

  test('a session leaves no console errors and no failed requests', async ({ page }) => {
    const problems = watchForProblems(page);
    await gotoWorld(page);
    await enterAndArrive(page);
    await shake(page);
    await beStill(page);
    await page.getByRole('button', { name: 'design, arranges' }).click();
    await advance(page, 2);
    await page.keyboard.press('v');
    await advance(page, 3.5);

    expect(problems.errors).toEqual([]);
    expect(problems.failed).toEqual([]);
  });

  test('without WebGL the piece still draws itself', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (orig as (t: string, ...r: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto('/');

    // the still is drawn from the same stroke geometry, not a message
    const svg = page.locator('svg.fallback__art');
    await expect(svg).toBeVisible();
    await expect(svg.locator('path')).toHaveCount(5);
    await expect(page.getByText(/cannot give the piece a WebGL context/)).toBeVisible();
    await expect(page.getByText(/instrument/).first()).toBeVisible();
  });
});
