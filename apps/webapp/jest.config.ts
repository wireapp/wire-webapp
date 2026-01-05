/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import type {Config} from 'jest';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.TZ = 'UTC';

const config: Config = {
  displayName: 'webapp',
  preset: '../../jest.preset.js',
  collectCoverageFrom: ['src/script/**/*.{ts,tsx}', '!src/script/util/test/**/*.*'],
  moduleDirectories: ['node_modules', __dirname],
  // Must be in sync with tsconfig.json >> paths
  moduleNameMapper: {
    'Components/(.*)': '<rootDir>/src/script/components/$1',
    'Hooks/(.*)': '<rootDir>/src/script/hooks/$1',
    'I18n/(.*)': '<rootDir>/src/i18n/$1',
    'Repositories/(.*)': '<rootDir>/src/script/repositories/$1',
    'Resource/(.*)': '<rootDir>/resource/$1',
    'Util/(.*)': '<rootDir>/src/script/util/$1',
    '^react(.*)$': '<rootDir>/../../node_modules/react$1',
    '.*\\.glsl': 'jest-transform-stub',
  },
  reporters: ['default'],
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testPathIgnorePatterns: ['<rootDir>/server', '<rootDir>/.yalc', '<rootDir>/test/e2e_tests'],
  testRunner: 'jest-jasmine2',
};

// eslint-disable-next-line import/no-default-export
export default config;
