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

/* eslint-disable sort-keys */

const webpack = require('webpack');
const path = require('path');

const rootWebpackConfig = require('./webpack.config.common.js');

function getSpecs(specList) {
  if (specList) {
    return specList.split(',').map(specPath => `test/unit_tests/${specPath}Spec.js`);
  }
  return ['test/unit_tests/**/*.js'];
}

module.exports = function(config) {
  config.set({
    basePath: './',
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    client: {
      jasmine: {
        random: false,
      },
    },

    // list of files / patterns to load in the browser
    files: [
      {
        included: false,
        nocache: true,
        pattern: 'node_modules/@wireapp/protocol-messaging/proto/messages.proto',
        served: true,
      },
      {included: false, nocache: false, pattern: 'app/ext/audio/*.mp3', served: true},
      {included: false, nocache: true, pattern: 'app/worker/*.js', served: true},

      'node_modules/jasmine-ajax/lib/mock-ajax.js',
      'node_modules/sinon/pkg/sinon.js',
      'test/api/environment.js',
      'test/api/payloads.js',
      'test/api/SDP_payloads.js',
      'test/config.test.js',
      'app/script/main/globals.js',
      'test/api/OpenGraphMocks.js',
      'test/js/calling/CallRequestResponseMock.js',
      'test/api/TestFactory.js',
    ].concat(getSpecs(config.specs)),

    proxies: {
      '/audio/': '/base/audio/',
      '/ext/js': '/base/node_modules/',
      '/worker/': '/base/worker/',
    },

    // pre-process matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/unit_tests/**/*.js': ['webpack', 'sourcemap'],
      'test/api/TestFactory.js': ['webpack', 'sourcemap'],
      'app/script/main/globals.js': ['webpack', 'sourcemap'],
      // FIXME fails because of import statements 'app/script/**/*.js': ['coverage'],
    },

    webpack: {
      mode: 'development',
      node: {
        fs: 'empty',
        path: 'empty',
      },
      externals: {
        'fs-extra': '{}',
      },
      plugins: [
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
          _: 'underscore',
          ko: 'knockout',
        }),
      ],
      resolve: {
        alias: Object.assign({}, rootWebpackConfig.resolve.alias, {
          app: path.resolve(__dirname, 'app'),
        }),
      },
    },

    webpackMiddleware: {
      logLevel: 'error',
      stats: 'errors-only',
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['coverage', 'progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_ERROR,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeNoSandbox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,

    customLaunchers: {
      ChromeNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },

    coverageReporter: {
      reporters: [
        {
          dir: 'docs/coverage',
          type: 'html',
        },
        {
          dir: 'docs/coverage',
          file: 'coverage-summary.txt',
          type: 'text-summary',
        },
      ],
      check: {
        global: {
          statements: 40,
          branches: 25,
          functions: 20,
          lines: 40,
        },
        each: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
    },
  });

  if (process.env.TRAVIS) {
    config.set({
      port: 9877,
      reporters: ['dots', 'coverage'],
    });
  }
};
