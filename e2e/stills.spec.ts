import { test } from '@playwright/test';
import { advance, enterAndArrive, gotoWorld } from './helpers';

/**
 * Not an assertion suite: this drives the world to the places the
 * effects live and saves a still of each, so that what the
 * documentation claims can be looked at instead of believed.
 * Run with: npx playwright test --project=stills
 */
test('capture one still of each place', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoWorld(page);
  await enterAndArrive(page);
  await advance(page, 4);
  await page.screenshot({ path: 'docs/stills/01-vantage.png' });

  const travel = async (amount: number, settle = 14) => {
    await page.evaluate((a) => {
      (window.__vantage as unknown as { rig: { travelBy(n: number): void } }).rig.travelBy(a);
    }, amount);
    await advance(page, settle);
  };

  await travel(26);
  await page.screenshot({ path: 'docs/stills/02-inside.png' });

  await travel(22);
  await page.screenshot({ path: 'docs/stills/03-edge.png' });

  // close on the still life: clay, glass, foil, and the bauhaus group
  await page.evaluate(() => {
    const v = window.__vantage as unknown as {
      rig: { drag(x: number, y: number): void; dolly(a: number): void };
    };
    v.rig.dolly(-4.5);
    v.rig.drag(-150, -30);
  });
  await advance(page, 10);
  await page.screenshot({ path: 'docs/stills/04-edge-matter.png' });

  await page.keyboard.press('v');
  await advance(page, 10);
  await travel(62, 18);
  await page.screenshot({ path: 'docs/stills/05-deep-metaballs.png' });

  await travel(22, 16);
  await page.screenshot({ path: 'docs/stills/06-deep-fractal.png' });

  await travel(18, 16);
  await page.screenshot({ path: 'docs/stills/07-deep-ending.png' });
});
