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

import {rspack} from '@rspack/core';
import type {Configuration} from '@rspack/core';
import {isPlainObject} from '@sindresorhus/is';

import path from 'node:path';
import {fileURLToPath} from 'node:url';

import rspackConfiguration from './rspack.config.mts';

const configFilePath = fileURLToPath(import.meta.url);
const configDirectoryPath = path.dirname(configFilePath);
const publicBuildPath = path.resolve(configDirectoryPath, 'src/script/publicBuild');
const dataDogModulePath = path.resolve(configDirectoryPath, 'src/script/util/dataDog.ts');
const escapedDataDogModulePath = dataDogModulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rspackCache = rspackConfiguration.cache;
const rspackEntrypoints = rspackConfiguration.entry;

if (typeof rspackCache !== 'object' || rspackCache.type !== 'persistent') {
  throw new Error('The public Rspack configuration requires the internal persistent cache settings.');
}

if (!isPlainObject(rspackEntrypoints)) {
  throw new Error('The public Rspack configuration requires named entrypoints.');
}

export default {
  ...rspackConfiguration,
  entry: {
    ...rspackEntrypoints,
    app: path.resolve(configDirectoryPath, 'src/script/main/releaseEntrypoint.tsx'),
  },
  cache: {
    ...rspackCache,
    buildDependencies: [...(rspackCache.buildDependencies ?? []), configFilePath],
    name: 'production-public',
  },
  output: {
    ...rspackConfiguration.output,
    clean: true,
  },
  resolve: {
    ...rspackConfiguration.resolve,
    alias: {
      './createDataDogLogsApplicationObservability$': path.resolve(
        publicBuildPath,
        'noopDataDogLogsApplicationObservability.ts',
      ),
      '@datadog/browser-logs$': path.resolve(publicBuildPath, 'noopDataDogBrowserLogs.ts'),
      '@datadog/browser-rum$': path.resolve(publicBuildPath, 'noopDataDogBrowserRum.ts'),
      ...rspackConfiguration.resolve?.alias,
    },
  },
  plugins: [
    ...(rspackConfiguration.plugins ?? []),
    new rspack.NormalModuleReplacementPlugin(
      new RegExp(`^${escapedDataDogModulePath}$`),
      path.resolve(publicBuildPath, 'noopDataDog.ts'),
    ),
  ],
} satisfies Configuration;
