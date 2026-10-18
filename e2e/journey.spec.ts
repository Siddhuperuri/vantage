import { expect, test } from '@playwright/test';
import { advance, beStill, enterAndArrive, gotoWorld, snapshot, watchForProblems } from './helpers';

/** travel without using the interface, the way the wheel does */
async function travel(page: import('@playwright/test').Page, amount: number): Promise<void> {
  await page.evaluate((a) => {
    (window.__vantage as unknown as { rig: { travelBy(n: number): void } }).rig.travelBy(a);
  }, amount);
}

async function journey(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const v = window.__vantage as unknown as {
      sim: { module: string; travel: number; weights: Record<string, number>; invitation: string | null };
      post: { treatment: string };
      scene: { traverse(cb: (o: { name: string; visible: boolean }) => void): void };
    };
    const visible: string[] = [];
    v.scene.traverse((o) => {
      if (o.name.startsWith('module-') && o.visible) visible.push(o.name);
    });
    return {
      module: v.sim.module,
      travel: v.sim.travel,
      weights: v.sim.weights,
      invitation: v.sim.invitation,
      treatment: v.post.treatment,
      visible,
    };
  });
}

test.describe('the journey', () => {
  test('is one continuous space, travelled rather than cut to', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);

    const start = await journey(page);
    expect(start.module).toBe('vantage');
    expect(start.visible).toEqual(['module-vantage']);

    // the wheel's own gesture, not a menu
    await travel(page, 26);
    await advance(page, 12);
    const inside = await journey(page);
    expect(inside.module).toBe('inside');
    expect(Math.round(inside.travel)).toBe(26);

    await travel(page, 22);
    await advance(page, 12);
    expect((await journey(page)).module).toBe('edge');

    await travel(page, 44);
    await advance(page, 16);
    const deep = await journey(page);
    expect(deep.module).toBe('deep');
    expect(deep.travel).toBeGreaterThan(80);
  });

  test('draws only the places the visitor is near', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);
    await travel(page, 92);
    await advance(page, 20);

    const deep = await journey(page);
    // the contract the module system exists for: a module that is not
    // here costs nothing, because it is not drawn at all
    expect(deep.visible).toContain('module-deep');
    expect(deep.visible).not.toContain('module-vantage');
    expect(deep.weights.vantage).toBeLessThan(0.02);
    expect(deep.weights.deep).toBeGreaterThan(0.5);
  });

  test('gives each place its own treatment, and leaves two of them unprinted', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);
    expect((await journey(page)).treatment).toBe('none');

    await travel(page, 26);
    await advance(page, 14);
    expect((await journey(page)).treatment, 'the inside stays unprinted').toBe('none');

    await travel(page, 22);
    await advance(page, 14);
    expect((await journey(page)).treatment).toBe('riso');

    // the descent loses resolution as it falls
    const seen: string[] = [];
    for (const step of [14, 18, 18, 20]) {
      await travel(page, step);
      await advance(page, 14);
      seen.push((await journey(page)).treatment);
    }
    expect(seen).toEqual(['ascii', 'halftone', 'dither', 'pixel']);
  });

  test('the ember looks onward once a place has been met', async ({ page }) => {
    await gotoWorld(page);
    await enterAndArrive(page);
    expect((await journey(page)).invitation).toBeNull();

    // meeting the vantage means doing what it is for: holding still at it
    await beStill(page, 8);
    const invited = await journey(page);
    expect(invited.invitation).toBe('inside');
    await expect(page.getByRole('button', { name: /follow the ember/ })).toBeVisible();
  });

  test('returns to the vantage exactly, from the bottom of the deep', async ({ page }) => {
    const problems = watchForProblems(page);
    await gotoWorld(page);
    await enterAndArrive(page);
    await travel(page, 92);
    await advance(page, 20);
    expect((await snapshot(page)).err).toBeGreaterThan(40);

    await page.keyboard.press('v');
    await advance(page, 14);
    const home = await snapshot(page);
    expect(home.err).toBeLessThan(0.001);
    expect(home.lock).toBeGreaterThan(0.99);
    expect((await journey(page)).module).toBe('vantage');

    expect(problems.errors).toEqual([]);
    expect(problems.failed).toEqual([]);
  });
});
