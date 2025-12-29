/*
 * Wire
 * Root ESLint configuration (ESLint 9+)
 *
 * This file delegates to project-specific configurations:
 * - apps/webapp/eslint.config.ts
 * - apps/server/eslint.config.ts
 * - libraries/Logger/eslint.config.ts
 *
 * Each project has its own configuration that extends the shared base.
 * To lint a specific project, run: nx lint <project-name>
 */

import type {Linter} from 'eslint';

const config: Linter.Config[] = [
  {
    // Global ignores for the entire workspace
    ignores: [
      '.git/',
      'docs/',
      'bin/',
      '**/node_modules/',
      '**/dist/',
      '**/lib/',
      '**/coverage/',
      'resource/',
      '**/__mocks__/**',
      '**/setupTests.*',
      '**/*.test.*',
      '**/*.spec.*',
    ],
  },
];

export default config;
