// Shared ESLint flat-config pieces used by this app.
import js from '@eslint/js';

export const baseIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
];

export const baseRules = {
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'prefer-const': 'error',
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
};

/** Base config for plain JavaScript (ES modules). */
export const javascriptBase = [
  { ignores: baseIgnores },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }, rules: baseRules },
];
