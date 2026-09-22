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

const path = require('path');

const productionConfig = require('./webpack.config');

const publicBuildPath = path.resolve(__dirname, 'src/script/publicBuild');

module.exports = {
  ...productionConfig,
  cache: {
    ...productionConfig.cache,
    buildDependencies: {
      ...productionConfig.cache.buildDependencies,
      config: [...productionConfig.cache.buildDependencies.config, __filename],
    },
    name: 'production-public',
  },
  output: {
    ...productionConfig.output,
    clean: true,
  },
  resolve: {
    ...productionConfig.resolve,
    alias: {
      './createDataDogLogsApplicationObservability$': path.resolve(
        publicBuildPath,
        'noopDataDogLogsApplicationObservability.ts',
      ),
      '@datadog/browser-logs$': path.resolve(publicBuildPath, 'noopDataDogBrowserLogs.ts'),
      '@datadog/browser-rum$': path.resolve(publicBuildPath, 'noopDataDogBrowserRum.ts'),
      'Util/dataDog$': path.resolve(publicBuildPath, 'noopDataDog.ts'),
      ...productionConfig.resolve.alias,
    },
    fallback: {
      ...productionConfig.resolve.fallback,
    },
    modules: [...productionConfig.resolve.modules],
  },
};
