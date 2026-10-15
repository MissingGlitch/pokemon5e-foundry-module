// ESLint flat configuration file.
// This file defines how ESLint (and Prettier) should lint JavaScript files in this project.

import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

// Configuration objects are applied in order, so later configs can override earlier ones.
export default [
	// * 1. Official ESLint recommended rules for vanilla JavaScript (no frameworks)
	// Enables a set of rules that ESLint recommends for all JavaScript projects.
	// These rules help catch common errors and problematic patterns (e.g.,
	// using undeclared variables, reassigning constants, etc.).
	js.configs.recommended,

	// * 2. Prettier integration
	// Reports formatting issues detected by Prettier as ESLint errors and also
	// disables all ESLint default rules that would conflict with Prettier's formatting
	// so Prettier is the single source of truth for code style (spacing, quotes, etc.).
	prettierRecommended,

	// Project-specific custom configurations:
	// * 3. Foundry VTT environment settings
	{
		// ? Identifier name for this configuration object, useful for debugging and reporting.
		name: 'foundry-vtt-environment',

		// ? Options related to the JavaScript language and environment.
		languageOptions: {
			// Use the latest supported ECMAScript version.
			// This enables modern syntax (arrow functions, async/await,
			// optional chaining, etc.) and defines the available ES globals.
			ecmaVersion: 'latest',

			// Treat files as ES modules (uses import/export and top-level strict mode).
			// Other possible values: 'commonjs' (for Node with require/module.exports)
			// or 'script' (classic browser scripts without modules).
			sourceType: 'module',

			// Global variables that exist in the runtime but are not known by ESLint.
			// Declaring them prevents "no-undef" errors when they are used.
			globals: {
				// Foundry VTT global API and module environment.
				// These are provided by Foundry at runtime in the browser.
				// 'readonly' means the variable exists and should not be reassigned.
				game: 'readonly',
				Hooks: 'readonly',
				foundry: 'readonly',
				Handlebars: 'readonly',
				loadTemplates: 'readonly',
				ui: 'readonly',
				fromUuid: 'readonly',
				ChatMessage: 'readonly',
				Actor: 'readonly',
				Item: 'readonly',
				Roll: 'readonly',
				CONFIG: 'readonly',
				mergeObject: 'readonly',
				duplicate: 'readonly',
				canvas: 'readonly',
				token: 'readonly',
				macro: 'readonly'
			}
		},

		// ? Glob patterns specifying which files this configuration object applies to.
		// '**/*.js' means: all .js files in any directory or subdirectory.
		files: ['**/*.js'],

		// ? Glob patterns for files and directories that ESLint should ignore.
		// These will not be linted, even if they match the "files" pattern.
		ignores: [
			'**/*.json',
			'**/*.css',
			'**/*.md',
			'pnpm-lock.yaml',
			'node_modules/**'
		],

		// ? Custom ESLint rules for this configuration.
		// Here you can override or add rules on top of the recommended and Prettier configs.
		rules: {}
	}
];
