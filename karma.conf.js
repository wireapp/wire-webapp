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
const rootWebpackConfig = require('./webpack.config.common.js');
const webpack = require('webpack');
const {SRC_PATH} = require('./locations');

const testCode = 'src/script/**/*.test.ts';

function getSpecs(specList) {
  if (specList) {
    const list = specList.split(',');
    const legacySpecs = list.map(specPath => `test/unit_tests/${specPath}Spec.js`);
    const specs = list.map(specPath => `src/script/${specPath}.test.ts`);
    return specs.concat(legacySpecs);
  }
  return ['test/unit_tests/**/*.js'].concat(testCode);
}

/**
 * @param {boolean} noLegacy - Prevents loading global dependencies which slow down the load time
 * @returns {Array} - The files to load in Karma before running the tests
 */
function getIncludedFiles(noLegacy) {
  const commonFiles = [
    {included: false, nocache: false, pattern: path.resolve(SRC_PATH, 'ext/audio/*.mp3'), served: true},
    {included: false, nocache: true, pattern: path.resolve(SRC_PATH, 'worker/*.js'), served: true},
    'node_modules/sinon/pkg/sinon.js',
    'test/api/environment.js',
    'test/api/payloads.js',
  ];
  return noLegacy ? commonFiles : commonFiles.concat('test/api/TestFactory.js');
}

module.exports = function(config) {
  config.set({
    autoWatch: false,
    basePath: './',
    browserNoActivityTimeout: 120000,
    browsers: ['ChromeNoSandbox'],
    client: {
      jasmine: {
        random: false,
      },
    },
    colors: true,
    concurrency: Infinity,
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
    customLaunchers: {
      ChromeNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
      },
    },
    exclude: [],
    files: getIncludedFiles(config.nolegacy).concat(getSpecs(config.specs)),
    frameworks: ['jasmine'],
    logLevel: config.LOG_ERROR,
    port: 9876,
    preprocessors: {
      'test/api/TestFactory.js': ['webpack'],
      'test/unit_tests/**/*.js': ['webpack'],
      [testCode]: ['webpack'],
    },
    proxies: {
      '/audio/': '/base/audio/',
      '/ext/js': '/base/node_modules/',
      '/worker/': '/base/src/worker/',
    },
    reporters: ['progress', 'coverage-istanbul'],
    singleRun: true,
    webpack: {
      externals: {
        'fs-extra': '{}',
        worker_threads: '{}',
      },
      mode: 'development',
      module: {
        rules: [
          {
            exclude: /node_modules/,
            include: [path.resolve('src/script/'), path.resolve('test/helper/')],
            loader: 'babel-loader',
            test: /\.[tj]sx?$/,
          },
          {
            loader: 'svg-inline-loader?removeSVGTagAttrs=false',
            test: /\.svg$/,
          },
          {
            enforce: 'post',
            exclude: [/node_modules|\.test\.[tj]sx?$/, path.resolve('src/script/view_model/')],
            include: [path.resolve('src/script/')],
            test: /\.[tj]s$/,
            use: {
              loader: 'istanbul-instrumenter-loader',
              options: {esModules: true},
            },
          },
        ],
      },
      node: {
        fs: 'empty',
        path: 'empty',
      },
      plugins: [
        new webpack.ProvidePlugin({
          $: 'jquery',
          _: 'underscore',
          jQuery: 'jquery',
          ko: 'knockout',
        }),
      ],
      resolve: {
        alias: Object.assign({}, rootWebpackConfig.resolve.alias, {
          src: path.resolve(__dirname, 'src'),
        }),
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.svg'],
      },
    },
    webpackMiddleware: {
      logLevel: 'error',
      stats: 'errors-only',
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
