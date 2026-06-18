import type {Config} from 'jest';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: Config = {
  displayName: 'calling-grid-fixture',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', __dirname],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {syntax: 'typescript', tsx: true},
          transform: {react: {runtime: 'automatic'}},
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};

export default config;
