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

const webpack = require('webpack');
const path = require('path');
const prodConfig = require('./webpack.config');
const commonConfig = require('./webpack.config.common');

module.exports = {
  ...prodConfig,
  devtool: 'inline-source-map',
  entry: {...prodConfig.entry, test: path.resolve(__dirname, 'test/index.test.js')},
  externals: {
    ...prodConfig.externals,
    // These will help enable enzyme to work properly
    cheerio: 'window',
    'react/addons': true,
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
  },
  mode: 'development',
  module: {
    rules: [
      ...prodConfig.module.rules,
      {
        exclude: /node_modules/,
        include: [path.resolve('test/helper')],
        loader: 'babel-loader',
        test: /\.[tj]sx?$/,
      },
      {
        enforce: 'post',
        exclude: [/node_modules/, /\.test\.[tj]sx?/, path.resolve('src/script/view_model/')],
        include: [path.resolve('src/script/')],
        test: /\.[tj]sx?$/,
        use: {
          loader: 'istanbul-instrumenter-loader',
          options: {esModules: true},
        },
      },
    ],
  },
  plugins: [
    ...commonConfig.plugins,
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: `"test"`,
      },
    }),
  ],
  resolve: {
    ...prodConfig.resolve,
    alias: {...prodConfig.resolve.alias, src: path.resolve(__dirname, 'src')},
  },
};
