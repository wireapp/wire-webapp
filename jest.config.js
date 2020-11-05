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

module.exports = {
  collectCoverageFrom: ['src/script/**/*.{ts,tsx}', '!src/script/util/test/**/*.*'],
  coverageThreshold: {
    global: {
      statements: 45,
    },
  },
  moduleDirectories: ['node_modules', './'],
  // Must be in sync with tsconfig.json >> paths
  moduleNameMapper: {
    'Components/(.*)': '<rootDir>/src/script/components/$1',
    'I18n/(.*)': '<rootDir>/src/i18n/$1',
    'Resource/(.*)': '<rootDir>/resource/$1',
    'Util/(.*)': '<rootDir>/src/script/util/$1',
  },
  preset: 'ts-jest/presets/js-with-ts',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  testEnvironment: './src/script/util/test/env/JSDomEnvironment.js',
  testEnvironmentOptions: {
    resources: 'usable', // For <img>.src the package `canvas` is needed as well
  },
  testPathIgnorePatterns: [
    '<rootDir>/test/index.test.js',
    '<rootDir>/test/main.test.js',
    '<rootDir>/server',
    '<rootDir>/webpack.config.test.js',
  ],
  testRegex: '(test|Spec)\\.[tj]sx?$',
};
