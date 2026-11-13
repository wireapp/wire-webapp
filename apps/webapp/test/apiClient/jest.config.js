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

const rootJestConfiguration = require('../../../../jest.config.js');

module.exports = {
  rootDir: '../..',
  roots: ['<rootDir>/src/script/apiClient'],
  displayName: 'api-client-lib',
  testEnvironment: 'node',
  clearMocks: true,
  cacheDirectory: '../../target/jest/cache',
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
    '^.+\\.(js|jsx)$': '@swc/jest',
  },
  moduleNameMapper: {
    '^@enormora/clock/deterministic-clock$': '<rootDir>/../../node_modules/@enormora/clock/deterministic-clock.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(true-myth|@enormora/clock|p-timeout|p-cancelable|uuid|noop-esm|@sindresorhus/is)/)',
  ],
  coverageDirectory: '../../target/coverage/apps/webapp/apiClient',
  coverageReporters: rootJestConfiguration.coverageReporters,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 40,
      lines: 53,
      statements: 53,
    },
  },
  testMatch: [
    '<rootDir>/src/script/apiClient/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/script/apiClient/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  reporters: rootJestConfiguration.reporters,
};
