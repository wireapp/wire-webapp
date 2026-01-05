/*
 * Wire
 * Server ESLint configuration (ESLint 9+)
 */

import path from 'path';
import {createBaseConfig} from '../../eslint.config.base';
import type {Linter} from 'eslint';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = __dirname;

const config: Linter.Config[] = [
  ...createBaseConfig({
    projectRoot: path.join(__dirname, '../..'), // workspace root
    tsconfigPath: path.join(projectRoot, 'tsconfig.json'),
    additionalIgnores: ['apps/server/bin/', 'apps/server/dist/', 'apps/server/node_modules/'],
  }),
];

export default config;
