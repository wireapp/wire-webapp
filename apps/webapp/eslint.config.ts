/*
 * Wire
 * Webapp ESLint configuration (ESLint 9+)
 */

import path from 'path';
import {createBaseConfig} from '../../eslint.config.base';
import type {Linter} from 'eslint';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = __dirname;

const config: Linter.Config[] = [
  ...createBaseConfig({
    projectRoot: path.join(__dirname, '../..'), // workspace root
    tsconfigPath: path.join(projectRoot, 'tsconfig.eslint.json'),
    additionalIgnores: [
      'apps/webapp/assets/',
      'apps/webapp/resource/',
      'apps/webapp/test/',
      'apps/webapp/src/sw.js',
      'apps/webapp/src/ext/',
      'apps/webapp/src/script/localization/**/webapp*.js',
      'apps/webapp/src/worker/',
      'apps/webapp/src/script/components/Icon.tsx',
      'apps/webapp/src/types/i18n.d.ts',
      'apps/webapp/playwright-report/',
    ],
  }),
];

export default config;
