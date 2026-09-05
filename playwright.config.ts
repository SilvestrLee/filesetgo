import { defineConfig, devices } from '@playwright/test';

/**
 * FSG-006 browser compatibility suite (docs/directives/FSG-006.md).
 *
 * Runs against the real, built, locally served FileSetGo application
 * (`php artisan serve` over the production Vite build) — never a synthetic
 * reimplementation of controller logic (§9).
 *
 * Engine coverage: Chromium, Firefox, and WebKit — all three are governed
 * targets (see docs/governance/DECISIONS.md ADR-019). The WebKit project
 * below is only added when `CI` is set: this coding agent's local macOS 12
 * host cannot launch any current, non-CVE-affected Playwright WebKit build
 * at all (ADR-019 has the full investigation), so WebKit runs on the
 * GitHub Actions runner (`.github/workflows/fsg-006-browser-certification.yml`,
 * which sets `CI: true`), not locally. This is a local-environment
 * constraint worked around by running WebKit somewhere it isn't
 * constrained — not a decision to drop WebKit from the matrix.
 *
 * Mobile viewport coverage uses Chromium with explicit viewport/touch
 * emulation rather than named "iPhone"/"iPad" device presets, because those
 * presets force WebKit in Playwright, which is unavailable in exactly the
 * same way locally (directive §11 explicitly allows this: "the required
 * product behaviors are more important than device branding").
 */
const PORT = 8123;
const includeWebkit = !!process.env.CI;

export default defineConfig({
  testDir: './tests/browser/specs',
  outputDir: './tests/browser/.artifacts/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // This host has only 2 physical CPUs; several tests exercise real
  // canvas/WASM/ZIP work through the actual worker runtime (directive §9),
  // and running too many headless browser instances in parallel starves
  // that work of CPU rather than exercising a genuine app defect (directive
  // §59/§60: determinism over hidden flakiness).
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: './tests/browser/.artifacts/results.json' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `php artisan serve --host=127.0.0.1 --port=${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    // Full functional certification: every spec except the dedicated mobile
    // layout suite (which needs mobile emulation, not desktop viewports).
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: '**/mobile-viewport.spec.ts' },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: '**/mobile-viewport.spec.ts' },
    ...(includeWebkit
      ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: '**/mobile-viewport.spec.ts' }]
      : []),

    // Dedicated mobile viewport/layout suite only (directive §11-§14).
    {
      name: 'mobile-narrow-320',
      testMatch: '**/mobile-viewport.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobile-iphone-class',
      testMatch: '**/mobile-viewport.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'mobile-android-class',
      testMatch: '**/mobile-viewport.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-tablet-class',
      testMatch: '**/mobile-viewport.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 810, height: 1080 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
