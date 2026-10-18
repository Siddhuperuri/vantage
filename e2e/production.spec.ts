import { expect, test } from '@playwright/test';
import { watchForProblems } from './helpers';

/**
 * The real bundle, served by `vite preview`. The deterministic frame
 * stepper is stripped from production builds, so this project checks
 * what can be checked without it: that the thing loads, draws, is
 * operable, and is quiet.
 */
test.describe('production bundle', () => {
  test('loads, enters and draws, with nothing in the console', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    // the development handle must not ship
    expect(await page.evaluate(() => typeof (window as { __vantage?: unknown }).__vantage)).toBe(
      'undefined',
    );

    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page.getByRole('radio', { name: 'guided' })).toBeVisible();

    // something is actually being drawn: a canvas with a live context
    const drawn = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!c) return null;
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return { w: c.width, h: c.height, context: !!gl, lost: gl ? gl.isContextLost() : true };
    });
    expect(drawn?.context).toBe(true);
    expect(drawn?.lost).toBe(false);
    expect(drawn?.w).toBeGreaterThan(0);

    await page.waitForTimeout(1500);
    expect(problems.errors).toEqual([]);
    expect(problems.failed).toEqual([]);
  });

  test('the interface is operable by keyboard alone', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page.getByRole('radio', { name: 'guided' })).toBeVisible();

    // Entering removes the button that was focused, so the piece moves
    // focus to the stage deliberately. Assert that happened before
    // sending a key: without it the test races its own keypress
    // against the focus move and loses about one time in three.
    await expect(page.locator('.stage')).toBeFocused();

    await page.keyboard.press('h');
    await expect(page.getByRole('button', { name: /show interface/ })).toBeVisible();
    await page.keyboard.press('h');
    await page.keyboard.press(',');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
  });
});
