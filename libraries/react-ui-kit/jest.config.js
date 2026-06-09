/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

module.exports = {
  displayName: 'react-ui-kit-lib',
  testEnvironment: 'jsdom',
  runInBand: true,
  clearMocks: true,
  coverageDirectory: '../../coverage/libraries/react-ui-kit',
  testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['lib/'],
  coveragePathIgnorePatterns: ['lib/'],
  modulePathIgnorePatterns: ['lib/'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        sourceMaps: true,
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: false,
            dynamicImport: false,
          },
          transform: {
            react: {
              runtime: 'automatic',
              importSource: '@emotion/react',
            },
          },
        },
      },
    ],
  },
  snapshotSerializers: ['@emotion/jest/serializer'],
};
