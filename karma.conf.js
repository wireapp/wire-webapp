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
const {SRC_PATH, ROOT_PATH} = require('./locations');

const dist = 'server/dist/static/min';
const test = 'test';

const preprocessors = {};
preprocessors['**/*.js'] = ['sourcemap'];

module.exports = function (config) {
  config.set({
    autoWatch: false,
    basePath: '',
    browserNoActivityTimeout: 20000,
    browsers: ['ChromeNoSandbox'],
    client: {
      jasmine: {
        random: false,
      },
      useIframe: false,
    },
    colors: true,
    concurrency: Infinity,
    coverageIstanbulReporter: {
      dir: path.resolve('docs/coverage/'),
      fixWebpackSourcePaths: true,
      'report-config': {
        html: {subdir: 'html'},
      },
      reports: ['html', 'lcovonly', 'clover'],
      thresholds: {
        emitWarning: false,
        global: {
          branches: 35,
          functions: 40,
          lines: 45,
          statements: 45,
        },
      },
    },
    customLaunchers: {
      ChromeNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
      },
    },
    files: [
      {included: false, nocache: false, pattern: path.resolve(ROOT_PATH, 'resource/audio/*.mp3'), served: true},
      {included: false, nocache: true, pattern: path.resolve(SRC_PATH, 'worker/*.js'), served: true},
      'node_modules/sinon/pkg/sinon.js',
      `${test}/api/environment.js`,
      `${test}/api/payloads.js`,
      `${test}/main.test.js`,
      `${dist}/runtime.js`,
      `${dist}/dexie.js`,
      `${dist}/vendor.js`,
      `${dist}/test.js`,
    ],
    frameworks: ['jasmine'],
    logLevel: config.LOG_ERROR,
    port: 9876,
    preprocessors,
    proxies: {
      '/audio/': '/base/audio/',
      '/ext/js/': '/base/node_modules/',
      '/worker/': '/base/src/worker/',
    },
    reporters: ['progress', 'coverage-istanbul'],
    singleRun: true,
  });
  if (process.env.TRAVIS) {
    config.set({
      port: 9877,
      reporters: ['spec', 'coverage-istanbul'],
      specReporter: {suppressPassed: true},
    });
  }
};
