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
const CopyWebpackPlugin = require('copy-webpack-plugin');

const dist = 'server/dist/static/';
const srcScript = 'app/script/auth/';
const appSrc = 'app/script/';

module.exports = {
  devtool: 'source-map',
  entry: {
    app: path.resolve(__dirname, appSrc, 'main/app.js'),
    auth: path.resolve(__dirname, srcScript, 'main.tsx'),
    login: path.resolve(__dirname, appSrc, 'main/login.js'),
  },
  externals: {
    'fs-extra': '{}',
  },
  mode: 'production',
  module: {
    rules: [
      {
        exclude: /node_modules/,
        include: path.resolve(__dirname, srcScript),
        loader: 'babel-loader',
        test: /\.[tj]sx?$/,
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
        },
      },
    },
  },
  output: {
    filename: 'min/[name].js',
    path: path.resolve(__dirname, dist),
    publicPath: '/',
  },
  plugins: [
    new webpack.IgnorePlugin(/^.\/locale$/, /moment$/),
    new CopyWebpackPlugin([{from: './node_modules/@wireapp/protocol-messaging/proto/messages.proto', to: 'proto'}]),
    new webpack.ProvidePlugin({
      $: 'jquery',
      _: 'underscore',
      jQuery: 'jquery',
      ko: 'knockout',
    }),
  ],
  resolve: {
    alias: {
      components: path.resolve(__dirname, `${appSrc}/components/`),
      // override phoneformat export, because the 'main' file is not exporting anything
      'phoneformat.js': path.resolve(__dirname, 'node_modules/phoneformat.js/dist/phone-format-global.js'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    modules: [path.resolve(srcScript), 'node_modules'],
  },
};
