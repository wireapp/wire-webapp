/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

const pkg = require('./package.json');
const webpack = require('webpack');

const projectName = pkg.name.replace('@wireapp/', '');

module.exports = {
  devtool: 'source-map',
  entry: {
    [projectName]: `${__dirname}/${pkg.main}`,
    [`${projectName}.test`]: `${__dirname}/src/main/index.test.browser.js`,
  },
  externals: {
    'fs-extra': '{}',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: require.resolve('@open-wc/webpack-import-meta-loader'),
      },
    ],
  },
  mode: 'production',
  node: {
    fs: 'empty',
    path: 'empty',
  },
  output: {
    filename: '[name].bundle.js',
    library: projectName,
    path: `${__dirname}/dist`,
  },
  plugins: [
    new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`),
    /* All wasm files will be ignored from webpack and copied over to the destination folder, they don't need any webpack processing */
    new webpack.IgnorePlugin({resourceRegExp: /.*\.wasm/}),
  ],
};
