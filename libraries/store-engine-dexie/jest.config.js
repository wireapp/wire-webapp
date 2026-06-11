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

const {TextDecoder, TextEncoder} = require('util');

module.exports = {
  displayName: 'store-engine-dexie-lib',
  testEnvironment: 'node',
  clearMocks: true,
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
    '^.+\\.(js|jsx)$': '@swc/jest',
  },
  moduleNameMapper: {
    '^@wireapp/store-engine/lib/test/(.*)$': '<rootDir>/../store-engine/src/test/$1',
    '^@wireapp/store-engine$': '<rootDir>/../store-engine/src/index',
    '^dexie$': require.resolve('dexie'),
  },
  setupFiles: ['./jest.setup.js'],
  globals: {
    TextDecoder,
    TextEncoder,
  },
  coverageDirectory: '../../coverage/libraries/store-engine-dexie',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/spec/**/*.[jt]s?(x)',
  ],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
};
