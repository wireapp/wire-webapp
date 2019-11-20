/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

const dist = 'server/dist/static/min';
const test = 'test';

const preprocessors = {};
preprocessors['**/*.js'] = ['sourcemap'];

module.exports = function(config) {
  config.set({
    autoWatch: false,
    basePath: '',
    browserNoActivityTimeout: 20000,
    browsers: ['ChromeNoSandbox'],
    client: {
      useIframe: false,
    },
    colors: true,
    concurrency: Infinity,
    coverageIstanbulReporter: {
      dir: path.resolve('docs/auth-coverage/'),
      fixWebpackSourcePaths: true,
      'report-config': {
        html: {subdir: 'html'},
      },
      reports: ['html', 'lcovonly'],
      thresholds: {
        emitWarning: false,
        global: {
          branches: 35,
          functions: 39,
          lines: 44,
          statements: 44,
        },
      },
    },
    customLaunchers: {
      ChromeNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },
    files: [
      `${test}/api/environment.js`,
      `${test}/main.test.js`,
      `${dist}/runtime.js`,
      `${dist}/dexie.js`,
      `${dist}/vendor.js`,
      `${dist}/test.js`,
    ],
    frameworks: ['jasmine'],
    logLevel: config.LOG_INFO,
    port: 9876,
    preprocessors,
    reporters: ['progress', 'coverage-istanbul'],
    singleRun: true,
  });
};
