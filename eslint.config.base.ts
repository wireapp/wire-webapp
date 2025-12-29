/*
 * Wire
 * Shared ESLint base configuration (ESLint 9+)
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

const base = compat.extends('@wireapp/eslint-config');

/**
 * Shared configuration factory for all Wire projects
 */
export function createBaseConfig(options: {
  projectRoot: string;
  tsconfigPath?: string;
  additionalIgnores?: string[];
}): Linter.Config[] {
  const {projectRoot, tsconfigPath, additionalIgnores = []} = options;

  const ignores = [
    '.git/',
    'docs/',
    'bin/',
    '**/node_modules/',
    'resource/',
    '**/__mocks__/**',
    '**/setupTests.*',
    '**/*.config.*',
    '**/*.test.*',
    '**/*.spec.*',
    '*.js',
    ...additionalIgnores,
  ];

  return [
    {ignores},
    ...base,
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
          // Enable type-aware linting for TypeScript sources
          project: tsconfigPath || path.join(projectRoot, 'tsconfig.json'),
          tsconfigRootDir: projectRoot,
          EXPERIMENTAL_useProjectService: {
            allowDefaultProjectForFiles: ['*.ts', '*.tsx'],
          },
        },
        globals: {
          ...globals.browser,
          ...globals.node,
          React: 'readonly',
          JSX: 'readonly',
          amplify: 'readonly',
          globalThis: 'readonly',
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
      },
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: tsconfigPath || path.join(projectRoot, 'tsconfig.json'),
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
          tsconfigRootDir: projectRoot,
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
}
