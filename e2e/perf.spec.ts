import { test } from '@playwright/test';

/**
 * A frame rate measured in a headless browser is a number about
 * SwiftShader, not about this artwork, so this project runs headed and
 * reports the renderer alongside the figure. The assertion is a floor
 * that catches a catastrophic regression; the number itself is the
 * point, and it is printed rather than hidden in a pass.
 */
test('frame rate at the vantage, on whatever GPU is present', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as never as { __vantage?: unknown }).__vantage, undefined, {
    timeout: 20_000,
  });

  const renderer = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'none';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
  const software = /swiftshader|llvmpipe|software/i.test(renderer);

  await page.getByRole('button', { name: 'Begin' }).click();
  // stand at the vantage, where every layer is drawn and resolved
  await page.evaluate(() => {
    const v = (window as never as { __vantage: { step(d: number, n: number): void } }).__vantage;
    v.step(1 / 60, 1100);
  });

  const measure = async (label: string) => {
    const result = await page.evaluate(async () => {
      const w = window as never as {
        __vantage: { gl: { info: { render: { frame: number; calls: number; triangles: number; points: number; lines: number } } } };
      };
      const info = w.__vantage.gl.info.render;
      // let the compositor settle before counting
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const f0 = info.frame;
      const t0 = performance.now();
      await new Promise((r) => setTimeout(r, 3000));
      const elapsed = (performance.now() - t0) / 1000;
      return {
        fps: (info.frame - f0) / elapsed,
        seconds: elapsed,
        calls: info.calls,
        triangles: info.triangles,
        points: info.points,
        lines: info.lines,
      };
    });
    const line =
      `${label}: ${result.fps.toFixed(1)} fps over ${result.seconds.toFixed(1)} s · ` +
      `${result.calls} draw calls, ${result.triangles} triangles, ` +
      `${result.points} points, ${result.lines} lines`;
    // eslint-disable-next-line no-console
    console.log(line);
    await testInfo.attach(label, { body: line, contentType: 'text/plain' });
    return result;
  };

  await testInfo.attach('renderer', { body: renderer, contentType: 'text/plain' });
  // eslint-disable-next-line no-console
  console.log(`renderer: ${renderer}${software ? '  (SOFTWARE RASTERISER)' : ''}`);

  const desktop = await measure('vantage 1280x720');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const mobile = await measure('vantage 390x844');

  if (software) {
    testInfo.annotations.push({
      type: 'note',
      description: `measured on a software rasteriser (${renderer}); figure is not representative`,
    });
  } else {
    // a floor, not a target: this is here to catch a regression that
    // makes the piece unusable, not to assert a frame rate
    if (desktop.fps < 30) throw new Error(`desktop fps ${desktop.fps.toFixed(1)} below floor of 30`);
    if (mobile.fps < 30) throw new Error(`mobile-sized fps ${mobile.fps.toFixed(1)} below floor of 30`);
  }
});
