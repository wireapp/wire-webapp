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

const rootJestConfiguration = require('../../jest.config.js');

module.exports = {
  displayName: 'server',
  preset: '../../jest.preset.js',
  collectCoverageFrom: [
    '*.{js,ts}',
    'routes/**/*.{js,ts}',
    'util/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/*.test.{js,ts}',
    '!jest.config.js',
    '!dist/**',
    '!bin/**',
  ],
  cacheDirectory: '../../target/jest/cache',
  coverageDirectory: '../../target/coverage/apps/server',
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 13,
      lines: 18,
      statements: 18,
    },
  },
  coverageReporters: rootJestConfiguration.coverageReporters,
  passWithNoTests: true,
  moduleDirectories: ['node_modules', __dirname],
  moduleNameMapper: {
    '^@enormora/objectory$': '<rootDir>/../../node_modules/@enormora/objectory/main.js',
  },
  reporters: rootJestConfiguration.reporters,
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/dist'],
  transformIgnorePatterns: ['/node_modules/(?!(true-myth|@sindresorhus/is|@enormora/objectory)/)'],
};
