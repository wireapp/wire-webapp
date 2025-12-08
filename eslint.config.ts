/*
 * Wire
 * Flat ESLint configuration (ESLint 9+)
 */

import path from 'path';
import {FlatCompat} from '@eslint/eslintrc';
import emotionPlugin from '@emotion/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import type {Linter} from 'eslint';

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const ignores = [
  '.git/',
  'docs/',
  'bin/',
  '**/node_modules/',
  'assets/',
  'apps/webapp/assets/',
  'resource/',
  'apps/webapp/resource/',
  'apps/webapp/test/',
  'apps/webapp/test/e2e_tests/',
  '**/__mocks__/**',
  '**/setupTests.*',
  '**/*.config.*',
  'apps/webapp/webpack.config.*',
  'apps/webapp/babel.config.*',
  'apps/webapp/jest.config.*',
  'apps/webapp/playwright.config.*',
  'apps/webapp/src/sw.js',
  'apps/server/bin/',
  'apps/server/dist/',
  'apps/server/node_modules/',
  'apps/webapp/src/ext/',
  'apps/webapp/src/script/localization/**/webapp*.js',
  'apps/webapp/src/worker/',
  'apps/webapp/src/script/components/Icon.tsx',
  '**/*.test.*',
  '**/*.spec.*',
  '*.js',
  'apps/webapp/src/types/i18n.d.ts',
];

const base = compat.extends('@wireapp/eslint-config');

const config: Linter.Config[] = [
  {ignores},
  ...base,
  {
    // Adjust legacy bits from extended config
    rules: {
      'header/header': 'off', // header rule config not compatible with flat config parser
      'no-unsanitized/DOM': 'off', // deprecated config variant; rely on recommended defaults instead
      'valid-jsdoc': 'off', // rule removed in ESLint 9
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Enable type-aware linting for TypeScript sources
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
        amplify: 'readonly',
      },
    },
    plugins: {
      '@emotion': emotionPlugin,
      import: importPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      '@emotion/pkg-renaming': 'error',
      '@emotion/no-vanilla': 'error',
      '@emotion/import-from-emotion': 'error',
      '@emotion/styled-import': 'error',
      'id-length': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^(_?err(or)?|error)$',
          varsIgnorePattern: '^(_?err(or)?|error)$',
        },
      ],
      '@typescript-eslint/typedef': 'off',
      'no-dupe-class-members': 'off',
      'no-unsanitized/property': 'off',
      'prefer-promise-reject-errors': 'off',
      'jest/no-jasmine-globals': 'off',
      'jsx-a11y/media-has-caption': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            path.join(__dirname, 'tsconfig.eslint.json'),
            path.join(__dirname, 'apps/webapp/tsconfig.json'),
            path.join(__dirname, 'apps/server/tsconfig.json'),
          ],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parser: require('espree'),
      parserOptions: {
        project: null,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Disable TS-only rules on JS mocks/shims
      '@typescript-eslint/require-array-sort-compare': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts', '**/test/**/*', '**/mocks/**/*'],
    rules: {
      'no-magic-numbers': 'off',
      'id-length': 'off',
    },
  },
];

export default config;
