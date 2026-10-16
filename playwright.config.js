// playwright.config.js
// Configuration for Playwright Test, used only for end-to-end (E2E) tests.
// This is separate from vitest.config.js:
// - Vitest runs unit, DOM and browser-component tests.
// - Playwright Test runs full end-to-end tests against a running application.

import { defineConfig, devices } from '@playwright/test';

// todo: Y saber qué rayos es eso de lo de CI (¿github actions?)
// y si debemos dejarlo para luego o preocuparnos por ello ahora mismo.

export default defineConfig({
	// Folder that contains the E2E test files.
	testDir: './tests/e2e/',

	// Only files with this pattern are considered Playwright tests.
	testMatch: '**/*.e2e.test.js',

	// Where HTML, JSON and other test reports are stored.
	outputDir: './test-reports/playwright/artifacts/',

	// Reporters: terminal list plus a browsable HTML report.
	reporter: [
		['list'],
		[
			'html',
			{
				outputFolder: './test-reports/playwright/reports/',
				open: 'never'
			}
		]
	],

	// Global settings applied to every test.
	use: {
		// Base URL used by page.goto('/...') in tests.
		baseURL: 'http://localhost:30000',

		// Take a screenshot only when a test fails.
		screenshot: 'only-on-failure',

		// Record a trace only when retrying a failed test.
		trace: 'on-first-retry'
	},

	// Browser projects: Each entry defines a browser/device combination.
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],

	// Run test files in parallel.
	fullyParallel: false,

	// Maximum number of concurrent worker processes used to run tests.
	workers: 1

	// ! Esto será necesario para las github actions, creo, ni idea.
	// Fail the build on the first failed test in CI.
	// forbidOnly: !!process.env.CI,

	// Retry failed tests only in CI.
	// retries: process.env.CI ? 2 : 0,

	// Number of parallel workers locally.
	// workers: process.env.CI ? 1 : undefined,
});
