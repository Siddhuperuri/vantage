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

  // the matter: clay, glass, foil and the bauhaus group, from a little
  // closer in than the module's own viewpoint
  await page.evaluate(() => {
    const v = window.__vantage as unknown as { rig: { dolly(a: number): void } };
    v.rig.dolly(-2.2);
  });
  await advance(page, 10);
  await page.screenshot({ path: 'docs/stills/04-edge-matter.png' });

  await page.keyboard.press('v');
  await advance(page, 10);
  await travel(62, 18);
  await page.screenshot({ path: 'docs/stills/05-deep-metaballs.png' });

  await travel(22, 16);
  await page.screenshot({ path: 'docs/stills/06-deep-fractal.png' });

  await travel(20, 18);
  await page.screenshot({ path: 'docs/stills/07-deep-name.png' });

  // all the way to the end, and held still, which is what the last
  // line waits for
  await travel(30, 10);
  await advance(page, 14);
  await page.screenshot({ path: 'docs/stills/08-deep-ending.png' });
});
