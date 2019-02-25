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
const {SRC_PATH} = require('./locations');

const rootWebpackConfig = require('./webpack.config.common.js');

function getSpecs(specList) {
  if (specList) {
    return specList.split(',').map(specPath => `test/unit_tests/${specPath}Spec.js`);
  }
  return ['test/unit_tests/**/*.js'];
}

/**
 * Returns the files to load in Karma before running the tests.
 * If the 'nolegacy' param is given, it will skip all the globals import
 *
 * @param {boolean} noLegacy - Prevents loading globals dependencies which slows down the load time
 * @returns {Array} - The files to load in Karma
 */
function getIncludedFiles(noLegacy) {
  const commonFiles = [
    {included: false, nocache: false, pattern: path.resolve(SRC_PATH, 'ext/audio/*.mp3'), served: true},
    {included: false, nocache: true, pattern: path.resolve(SRC_PATH, 'worker/*.js'), served: true},
    'node_modules/sinon/pkg/sinon.js',
    'test/api/environment.js',
    'test/api/payloads.js',
  ];
  return noLegacy ? commonFiles : commonFiles.concat([`${SRC_PATH}/script/main/globals.js`, 'test/api/TestFactory.js']);
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
    files: getIncludedFiles(config.nolegacy).concat(getSpecs(config.specs)),

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
      [`${SRC_PATH}/script/main/globals.js`]: ['webpack', 'sourcemap'],
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
      module: {
        rules: [
          {
            exclude: /node_modules/,
            include: path.resolve('src/script/'),
            loader: 'babel-loader',
            test: /\.[tj]sx?$/,
          },
          {
            loader: 'svg-inline-loader?removeSVGTagAttrs=false',
            test: /\.svg$/,
          },
          {
            exclude: [path.resolve('node_modules/'), path.resolve('src/script/view_model/')],
            include: [path.resolve('src/script/')],
            test: /\.js$/,
            use: {
              loader: 'istanbul-instrumenter-loader',
              query: {
                esModules: true,
              },
            },
          },
        ],
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
          src: path.resolve(__dirname, 'src'),
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
    reporters: ['progress', 'coverage-istanbul'],

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
    coverageIstanbulReporter: {
      dir: path.resolve('docs/coverage/'),
      fixWebpackSourcePaths: true,
      'report-config': {
        html: {subdir: 'html'},
      },
      reports: ['html', 'lcovonly'],
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
  });

  if (process.env.TRAVIS) {
    config.set({
      port: 9877,
      reporters: ['spec', 'coverage-istanbul'],
      specReporter: {suppressPassed: true},
    });
  }
};
