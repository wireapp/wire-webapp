/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

const rootJestConfiguration = require('../../jest.config.js');

module.exports = {
  displayName: 'api-client-lib',
  testEnvironment: 'node',
  clearMocks: true,
  cacheDirectory: '../../target/jest/cache',
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
    '^.+\\.(js|jsx)$': '@swc/jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(true-myth|p-timeout|p-cancelable|uuid|noop-esm|@sindresorhus/is)/)'],
  coverageDirectory: '../../target/coverage/libraries/api-client',
  coverageReporters: rootJestConfiguration.coverageReporters,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 40,
      lines: 53,
      statements: 53,
    },
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.[jt]s?(x)', '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  reporters: rootJestConfiguration.reporters,
};
