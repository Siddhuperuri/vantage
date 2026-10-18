import { defineConfig, devices } from '@playwright/test';

/**
 * The suite drives the dev server, because the deterministic frame
 * stepper (`window.__vantage.step`) is a development-only handle. That
 * is deliberate: the assertions below are about what the world does
 * after N frames, not about what it happens to look like after a
 * wall-clock wait, so they do not depend on machine speed.
 *
 * The `production` project serves the real bundle and checks the
 * things that can be checked without that handle.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: { trace: 'retain-on-failure' },

  projects: [
    {
      name: 'vantage',
      testMatch: /(vantage|journey)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5173' },
    },
    {
      name: 'production',
      testMatch: /production\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'stills',
      testMatch: /stills\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5173' },
    },
    {
      // Headed, with the GPU, because a headless Chromium draws WebGL
      // through SwiftShader on the CPU and any frame rate measured
      // there would be a number about software rasterisation, not
      // about this artwork.
      name: 'perf',
      testMatch: /perf\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:5173',
        headless: false,
        launchOptions: {
          args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
        },
      },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run build && npm run preview',
      url: 'http://127.0.0.1:4173',
      // never reused: a preview server left running from an earlier run
      // would be serving an older dist, and the production project
      // would quietly be testing a bundle that no longer exists
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
