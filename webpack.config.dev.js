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

module.exports = Object.assign(commonConfig, {
  devServer: {
    clientLogLevel: 'warning',
    compress: true,
    contentBase: path.resolve(__dirname, serve),
    historyApiFallback: true,
    host: '0.0.0.0',
    hotOnly: true,
    open: true,
    openPage: 'page/auth.html',
    overlay: true,
    port: '8080',
    proxy: {
      '/app': {pathRewrite: {'^/app': ''}, target: 'http://192.168.10.224:8888'},
      '/audio': 'http://192.168.10.224:8888',
      '/style': 'http://192.168.10.224:8888',
    },
    public: 'localhost:8080',
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
  plugins: [...commonConfig.plugins, new webpack.HotModuleReplacementPlugin(), new webpack.NamedModulesPlugin()],
});
