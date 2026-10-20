// Prettier configuration file.
// This file defines how Prettier should format code across this project.
// It ensures a consistent code style and integrates with ESLint for automated formatting.

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    useTabs: true,
    trailingComma: "none",
    printWidth: 80,
    bracketSpacing: true,
    endOfLine: "auto"
};

export default config;