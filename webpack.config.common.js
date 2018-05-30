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

// https://github.com/babel/babel-loader/issues/149
const babelSettings = {
  extends: path.join(__dirname, '/.babelrc'),
};

const dist = 'aws/static/';
const srcScript = 'app/script/auth/';

module.exports = {
  devtool: 'source-map',
  entry: {
    script: path.resolve(__dirname, srcScript, 'main.js'),
  },
  externals: {
    'fs-extra': '{}',
  },
  mode: 'production',
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.jsx?$/,
        use: [
          {
            loader: `babel-loader?${JSON.stringify(babelSettings)}`,
          },
        ],
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
          name: 'vendor',
          priority: 1,
          test: /node_modules/,
        },
      },
    },
  },
  output: {
    filename: 'min/[name].js',
    path: path.resolve(__dirname, dist),
    publicPath: '/',
  },
  plugins: [new webpack.IgnorePlugin(/^.\/locale$/, /moment$/)],
  resolve: {
    extensions: ['.js', '.jsx'],
    modules: [path.resolve(srcScript), 'node_modules'],
  },
};
