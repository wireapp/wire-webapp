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

import {Config, ConfigOptions} from 'karma';
import * as jasmineConfig from './jasmine.json';
import webpackConfig from './webpack.config';

module.exports = (config: Config): void => {
  const options: ConfigOptions = {
    autoWatch: false,
    basePath: jasmineConfig.spec_dir,
    browserNoActivityTimeout: 90000,
    browsers: ['ChromeNoSandbox'],
    client: {
      useIframe: false,
    },
    colors: true,
    concurrency: Infinity,
    customLaunchers: {
      ChromeNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },
    files: ['**/*.ts', {pattern: '**/*.js', watched: true, served: true, included: false}],
    frameworks: ['jasmine'],
    logLevel: config.LOG_INFO,
    port: 9876,
    preprocessors: {
      '**/*.ts': ['webpack'],
    },
    reporters: ['progress'],
    singleRun: true,
    webpack: webpackConfig,
    webpackMiddleware: {
      stats: 'errors-only',
    },
  };

  config.set(options);
};
