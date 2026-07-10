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

const isContinuousIntegrationEnvironment = process.env.CI === 'true';

module.exports = {
  displayName: 'api-client-lib',
  testEnvironment: 'node',
  clearMocks: true,
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
    '^.+\\.(js|jsx)$': '@swc/jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(true-myth|p-timeout|p-cancelable|uuid|noop-esm)/)'],
  coverageDirectory: '../../coverage/libraries/api-client',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 40,
      lines: 53,
      statements: 53,
    },
  },
  coverageReporters: isContinuousIntegrationEnvironment ? ['html', 'lcov', 'text-summary'] : undefined,
  testMatch: ['<rootDir>/src/**/__tests__/**/*.[jt]s?(x)', '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  reporters: isContinuousIntegrationEnvironment ? ['github-actions', 'summary'] : ['default'],
};
