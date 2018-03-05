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

const commonConfig = require('./webpack.config.common');
const path = require('path');
const webpack = require('webpack');

const srcScript = 'app/script/auth/';
const serve = 'app/';

class ProgressBar {
  constructor(maxValue, itemLength, emptyItem = '▁', filledItem = '▆') {
    this.maxValue = maxValue;
    this.itemLength = itemLength;
    this.chunks = [];
    for (let i = 0; i < itemLength; i++) {
      this.chunks[i] = emptyItem;
    }
  }

  tick(value, msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`${msg} ${value}%${value === this.maxValue ? '\n' : ''}`);
  }
}

const progress = new ProgressBar(100, 20);

module.exports = Object.assign(commonConfig, {
  devServer: {
    clientLogLevel: 'warning',
    compress: true,
    contentBase: path.resolve(__dirname, serve),
    historyApiFallback: true,
    hotOnly: true,
    open: true,
    openPage: 'page/auth.html',
    overlay: true,
    publicPath: '/',
    stats: {
      chunks: false,
    },
  },
  entry: Object.assign(commonConfig.entry, {
    script: ['react-hot-loader/patch', path.resolve(__dirname, srcScript, 'main.js')],
  }),
  output: Object.assign(commonConfig.output, {
    path: path.resolve(__dirname, serve),
  }),
  plugins: [
    ...commonConfig.plugins,
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new webpack.ProgressPlugin((percentage, msg) => {
      percentage = parseInt(Math.round(percentage * Math.pow(10, 2)));
      progress.tick(percentage, msg);
    }),
  ],
});
