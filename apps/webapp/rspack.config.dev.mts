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
 */

import {ReactRefreshRspackPlugin} from '@rspack/plugin-react-refresh';
import type {Configuration} from '@rspack/core';
import {isPlainObject} from '@sindresorhus/is';

import {fileURLToPath} from 'node:url';

import {createRspackConfiguration} from './rspack.config.mts';

const rspackConfiguration = createRspackConfiguration('development');
const developmentCache = rspackConfiguration.cache;

if (isPlainObject(developmentCache) === false || developmentCache.type !== 'persistent') {
  throw new Error('The Rspack development configuration requires the persistent cache settings.');
}

export default {
  ...rspackConfiguration,
  cache: {
    ...developmentCache,
    buildDependencies: [...(developmentCache.buildDependencies ?? []), fileURLToPath(import.meta.url)],
    name: 'development',
  },
  devServer: {
    allowedHosts: 'auto',
    client: {
      overlay: {
        errors: true,
        runtimeErrors: true,
        warnings: false,
      },
    },
    devMiddleware: {
      index: true,
      writeToDisk: false,
    },
    historyApiFallback: false,
    hot: true,
    liveReload: true,
    static: false,
  },
  plugins: [...(rspackConfiguration.plugins ?? []), new ReactRefreshRspackPlugin()],
} satisfies Configuration;
