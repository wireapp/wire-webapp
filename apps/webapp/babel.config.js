/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

const presetEnvConfig = {
  debug: false,
  modules: false,
};

module.exports = {
  env: {
    test: {
      plugins: ['babel-plugin-transform-import-meta'],
      presets: [
        ['@babel/preset-typescript', {onlyRemoveTypeImports: false}],
        ['@babel/preset-env', {...presetEnvConfig, modules: 'commonjs'}],
      ],
    },
  },
  plugins: [
    ['@babel/plugin-proposal-decorators', {version: 'legacy'}],
    ['babel-plugin-polyfill-corejs3', {method: 'usage-global', version: '3', proposals: false}],
  ],
  presets: [
    ['@babel/preset-typescript', {onlyRemoveTypeImports: false}],
    ['@babel/preset-env', presetEnvConfig],
  ],
  overrides: [
    {
      test: /\.(?:jsx?|tsx)$/,
      presets: [['@babel/preset-react', {importSource: '@emotion/react', runtime: 'automatic'}]],
    },
  ],
};
