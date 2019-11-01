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
const webpack = require('webpack');
const {ROOT_PATH, DIST_PATH, SRC_PATH} = require('./locations');

const dist = path.resolve(DIST_PATH, 'static');
const auth = path.resolve(SRC_PATH, 'script', 'auth');
const srcScript = path.resolve(SRC_PATH, 'script');

module.exports = {
  devtool: 'source-map',
  entry: {
    app: path.resolve(srcScript, 'main/app.js'),
    auth: path.resolve(auth, 'main.tsx'),
    login: path.resolve(srcScript, 'main/login.js'),
  },
  externals: {
    'fs-extra': '{}',
    worker_threads: '{}',
  },
  mode: 'production',
  module: {
    rules: [
      {
        exclude: /node_modules/,
        include: srcScript,
        loader: 'babel-loader',
        test: /\.[tj]sx?$/,
      },
      {
        loader: 'svg-inline-loader?removeSVGTagAttrs=false',
        test: /\.svg$/,
      },
    ],
  },
  node: {
    fs: 'empty',
    path: 'empty',
  },

  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        dexie: {
          chunks: 'initial',
          enforce: true,
          name: 'dexie',
          priority: 2,
          test: /dexie/,
        },
        vendor: {
          chunks: 'initial',
          minChunks: 2,
          name: 'vendor',
          priority: 1,
          test: /node_modules/,
        },
      },
    },
  },
  output: {
    chunkFilename: 'min/[name].js',
    filename: 'min/[name].js',
    path: dist,
    publicPath: '/',
  },
  plugins: [
    new webpack.IgnorePlugin(/^.\/locale$/, /moment$/),
    new webpack.ProvidePlugin({
      $: 'jquery',
      _: 'underscore',
      jQuery: 'jquery',
      ko: 'knockout',
    }),
  ],
  resolve: {
    alias: {
      Components: path.resolve(srcScript, 'components'),
      Resource: path.resolve(ROOT_PATH, 'resource'),
      Util: path.resolve(srcScript, 'util'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.svg'],
    modules: [auth, 'node_modules'],
  },
};
