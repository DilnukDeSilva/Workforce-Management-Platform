// ESLint finds likely bugs (unused variables, undefined names, unreachable code).
// Formatting is Prettier's job, so eslint-config-prettier switches off any style rules
// that would fight it. The client uses oxlint instead (it came with the Vite template).
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // Express error handlers need all four arguments even if `next` is unused.
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^next$|^_' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  prettier,
];
