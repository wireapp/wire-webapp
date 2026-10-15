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

'use strict';

const browserTargets = require('browserslist')();

const path = require('node:path');

const workspaceRootPath = path.resolve(__dirname, '../..');
const fixtureSourceDirectoryPath = path.resolve(__dirname, 'fixtures');
const emittedSourceDirectoryPath = path.resolve(
  workspaceRootPath,
  'dist/build-experiments/tsc-emitted/compiled/tools/buildExperiments/fixtures',
);
const experimentArchitecture = process.env.WIRE_BUILD_EXPERIMENT_ARCHITECTURE;

if (experimentArchitecture !== 'tsc-emitted' && experimentArchitecture !== 'swc') {
  throw new Error('Set WIRE_BUILD_EXPERIMENT_ARCHITECTURE to tsc-emitted or swc');
}

const usesSwc = experimentArchitecture === 'swc';
const entrySourceDirectoryPath = usesSwc ? fixtureSourceDirectoryPath : emittedSourceDirectoryPath;
const rspackCacheDirectoryPath = path.resolve(workspaceRootPath, 'dist/build-experiments/rspack-cache');
const outputDirectoryPath = path.resolve(workspaceRootPath, `dist/build-experiments/${experimentArchitecture}/bundle`);

module.exports = {
  mode: 'production',
  context: workspaceRootPath,
  devtool: 'source-map',
  entry: {
    app: path.resolve(entrySourceDirectoryPath, usesSwc ? 'main.tsx' : 'main.js'),
    auth: path.resolve(entrySourceDirectoryPath, usesSwc ? 'auth.tsx' : 'auth.js'),
    checkBrowser: path.resolve(entrySourceDirectoryPath, usesSwc ? 'checkBrowser.ts' : 'checkBrowser.js'),
  },
  externals: {
    'fs-extra': '{}',
    worker_threads: '{}',
  },
  output: {
    clean: true,
    chunkFilename: '[name].js',
    filename: '[name].js',
    path: outputDirectoryPath,
    publicPath: '/min/',
  },
  cache: {
    type: 'persistent',
    name: `build-experiment-${experimentArchitecture}`,
    storage: {
      type: 'filesystem',
      directory: rspackCacheDirectoryPath,
    },
  },
  resolve: {
    alias: {
      Components: path.resolve(entrySourceDirectoryPath, 'components'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    modules: [path.resolve(workspaceRootPath, 'node_modules')],
    fallback: {
      crypto: false,
      fs: false,
      os: require.resolve('os-browserify'),
      path: require.resolve('path-browserify'),
    },
  },
  module: {
    rules: usesSwc
      ? [
          {
            test: /\.(?:[cm]?js|jsx|tsx?)$/u,
            include: fixtureSourceDirectoryPath,
            use: {
              loader: 'builtin:swc-loader',
              options: {
                detectSyntax: 'auto',
                isModule: 'unknown',
                sourceMaps: true,
                env: {
                  mode: 'usage',
                  coreJs: '3.50.0',
                  targets: browserTargets,
                },
                jsc: {
                  parser: {
                    decorators: true,
                  },
                  transform: {
                    legacyDecorator: true,
                    decoratorMetadata: false,
                    react: {
                      runtime: 'automatic',
                      importSource: '@emotion/react',
                    },
                  },
                },
                rspackExperiments: {
                  emotion: {
                    sourceMap: true,
                    autoLabel: 'dev-only',
                    labelFormat: '[local]',
                  },
                },
              },
            },
          },
        ]
      : [],
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
    },
  },
};
