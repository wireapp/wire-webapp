/*
 * Wire
 * Flat ESLint configuration (ESLint 9+)
 */

import path from 'path';
import {FlatCompat} from '@eslint/eslintrc';
// @ts-ignore - No types available for @emotion/eslint-plugin with ESLint 9
import emotionPlugin from '@emotion/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
// @ts-ignore - No types available for @tony.ganchev/eslint-plugin-header
import headerPlugin from '@tony.ganchev/eslint-plugin-header';
import globals from 'globals';
import type {Linter} from 'eslint';

const year = new Date().getFullYear();

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const ignores = [
  '.git/',
  'docs/',
  'bin/',
  '**/node_modules/',
  'apps/webapp/assets/',
  'resource/',
  'apps/webapp/resource/',
  'apps/webapp/test/',
  '**/__mocks__/**',
  '**/setupTests.*',
  '**/*.config.*',
  'apps/webapp/*.config.*',
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
  'apps/webapp/playwright-report/',
  'libraries/core/lib/',
  'libraries/api-client/lib/',
  'libraries/api-client/demo.ts',
  'libraries/core/.tmp/',
  'libraries/core/src/demo/',
  'libraries/core/src/test/',
  'libraries/config/lib/',
  '**/jest.setup.ts',
];

const base = compat.extends('@wireapp/eslint-config');
// Remove 'project' from parserOptions in all base configs to avoid conflict with projectService
const cleanedBase = base.map(cfg => {
  if (cfg.languageOptions?.parserOptions) {
    const parserOptions = cfg.languageOptions.parserOptions as Record<string, unknown>;
    const {project, ...rest} = parserOptions;
    return {
      ...cfg,
      languageOptions: {
        ...cfg.languageOptions,
        parserOptions: rest,
      },
    };
  }
  return cfg;
});
const config: Linter.Config[] = [
  {ignores},
  ...cleanedBase,
  {
    // Adjust legacy bits from extended config
    rules: {
      'no-unsanitized/DOM': 'off', // deprecated config variant; rely on recommended defaults instead
      'valid-jsdoc': 'off', // rule removed in ESLint 9
      'header/header': 'off', // disable existing header rule to use our own
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Enable type-aware linting for TypeScript sources with project references support
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
        amplify: 'readonly',
        NodeJS: 'readonly',
      },
    },
    // @ts-ignore - Plugin type compatibility issues with ESLint 9 flat config
    plugins: {
      '@emotion': emotionPlugin,
      import: importPlugin,
      'react-hooks': reactHooksPlugin,
      'header-tony': headerPlugin,
    },
    rules: {
      '@emotion/pkg-renaming': 'error',
      '@emotion/no-vanilla': 'error',
      '@emotion/import-from-emotion': 'error',
      '@emotion/styled-import': 'error',
      'header-tony/header': [
        'error',
        'block',
        [
          '',
          ' * Wire',
          {
            pattern: ' \\* Copyright \\(C\\) \\d{4} Wire Swiss GmbH',
            template: ` * Copyright (C) ${year} Wire Swiss GmbH`,
          },
          ' *',
          ' * This program is free software: you can redistribute it and/or modify',
          ' * it under the terms of the GNU General Public License as published by',
          ' * the Free Software Foundation, either version 3 of the License, or',
          ' * (at your option) any later version.',
          ' *',
          ' * This program is distributed in the hope that it will be useful,',
          ' * but WITHOUT ANY WARRANTY; without even the implied warranty of',
          ' * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the',
          ' * GNU General Public License for more details.',
          ' *',
          ' * You should have received a copy of the GNU General Public License',
          ' * along with this program. If not, see http://www.gnu.org/licenses/.',
          ' *',
          ' ',
        ],
        2,
      ],
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
      'no-empty': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
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
