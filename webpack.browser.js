/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

let repositoryName = pkg.repository.url.substr(pkg.repository.url.lastIndexOf('/') + 1);
repositoryName = repositoryName.substr(0, repositoryName.indexOf('.git'));

const camelCasedRepositoryName = repositoryName.replace(/-([a-z])/g, glob => glob[1].toUpperCase());

module.exports = {
  entry: {
    client: `${__dirname}/dist/commonjs/Client.js`,
  },
  externals: {
    dexie: 'Dexie',
    'fs-extra': '{}',
  },
  output: {
    filename: `${repositoryName}.min.js`,
    library: `${camelCasedRepositoryName}`,
    path: `${__dirname}/dist`,
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({output: {comments: false}}),
    new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`),
  ],
  target: 'web',
};
