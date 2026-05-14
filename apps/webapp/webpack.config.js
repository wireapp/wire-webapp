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
const WorkboxPlugin = require('workbox-webpack-plugin');

const commonConfig = require('./webpack.config.common');

const ROOT_PATH = path.resolve(__dirname, '../..');
const SRC_PATH = path.resolve(__dirname, 'src');
const dist = path.resolve(ROOT_PATH, 'apps/server/dist/static');

module.exports = {
  ...commonConfig,
  mode: 'production',
  optimization: {
    ...commonConfig.optimization,
    minimize: true,
  },
  plugins: [
    ...commonConfig.plugins,
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: `"production"`,
      },
    }),
    new WorkboxPlugin.InjectManifest({
      /* 100 MB covers the large JS bundles so they are included in the precache manifest */
      maximumFileSizeToCacheInBytes: 100 * 1024 * 1024,
      /* wasm and tflite are large binary ML assets fetched at runtime, not precached */
      exclude: [/\.wasm$/, /\.tflite$/],
      swDest: path.resolve(dist, 'sw.js'),
      swSrc: path.resolve(SRC_PATH, 'sw.js'),
    }),
  ],
};
