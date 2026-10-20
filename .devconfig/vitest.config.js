// Vitest configuration file.
// This file defines how Vitest should discover, run and report tests in this project.
// It uses "projects" to split tests into different environments (Node, Simulated DOM and Real browser).

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig({
	// Relative project root location
	root: projectRoot,

	test: {
		// Test projects
		// Each project is an isolated test suite with its own environment,
		// include patterns and (optionally) browser settings. This allows
		// running different kinds of tests in the most appropriate environment.
		projects: [
			// * 1. Unit tests (Node environment)
			// Runs tests that do not need a DOM or a real browser.
			// Typical use: pure logic, utilities, data transformations, etc.
			{
				test: {
					// Human-readable name for this project.
					name: 'unit',

					// Glob pattern specifying which files belong to this project.
					// Only files matching this pattern will be run as unit tests.
					include: ['tests/unit/**/*.unit.test.js'],

					// Run tests in a plain Node environment (no DOM APIs).
					environment: 'node'
				}
			},

			// * 2. DOM tests (happy-dom environment)
			// Runs tests that need DOM APIs (document, window, elements, etc.)
			// but do not require a real browser.
			// Typical use: components, DOM manipulation, event handling, etc.
			{
				test: {
					name: 'dom',
					include: ['tests/dom/**/*.dom.test.js'],

					// Use happy-dom as a lightweight DOM implementation.
					// It simulates a browser environment without launching a real browser.
					environment: 'happy-dom'
				}
			},

			// * 3. Browser tests (Playwright + Chromium)
			// Runs tests in a real browser using Playwright as the provider.
			// Typical use: integration tests, UI behavior, real rendering, etc.
			{
				test: {
					name: 'browser',
					include: ['tests/browser/**/*.browser.test.js'],

					// Browser-specific configuration for this project.
					browser: {
						// Enable Browser Mode for this project.
						// Tests will actually run inside a browser instance.
						enabled: true,

						// Use Playwright as the browser provider.
						provider: playwright(),

						// Browsers in which the tests will run.
						instances: [
							{ browser: 'chromium' },
							{ browser: 'firefox' },
							{ browser: 'webkit' }
						]
					}
				}
			}
		],

		// Code coverage
		// Measures which parts of the source code are actually executed during the test run.
		// While test reports tell you which tests passed or failed,
		// coverage tells you how much of your code those tests exercised.
		coverage: {
			// Use Istanbul's instrumented coverage collection.
			// Unlike v8, it supports Browser Mode with multiple instances.
			provider: 'istanbul',

			// Glob patterns for source files included in the report.
			include: ['**/*.js'],

			// Glob patterns for files excluded from the report.
			exclude: [
				'node_modules/**',
				'.vscode/**',
				'.devconfig/**',
				'tests/**',
				'test-reports/**',
				'packs/**'
			],

			// Formats in which the coverage report will be generated:
			// - "text": summary in the terminal.
			// - "json": machine-readable report.
			// - "html": browsable HTML report.
			reporter: ['text', 'json', 'html'],

			// Directory where coverage reports will be written.
			reportsDirectory: './test-reports/vitest/coverages/'
		},

		// Test reporters and output files
		// Reporters control how test results are displayed and saved.
		reporters: [
			// Human-readable, detailed output in the terminal.
			'verbose',

			// Machine-readable JSON report (useful for CI or custom tooling).
			[
				'json',
				{
					outputFile: './test-reports/vitest/reports/report.json'
				}
			],

			// Browsable HTML report.
			[
				'html',
				{
					outputDir: './test-reports/vitest/reports/'
				}
			]
		]
	}
});
