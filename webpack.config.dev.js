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

const commonConfig = require('./webpack.config.common');

const srcScript = 'src/script/';

module.exports = {
  ...commonConfig,
  devtool: 'eval-source-map',
  entry: {
    ...commonConfig.entry,
    app: ['webpack-hot-middleware/client?reload=true', path.resolve(__dirname, srcScript, 'main/index.tsx')],
  },
  mode: 'development',
  plugins: [...commonConfig.plugins, new webpack.HotModuleReplacementPlugin()],
  snapshot: {
    // This will make sure that changes in the node_modules will be detected and recompiled automatically (when using yalc for example)
    managedPaths: [],
  },
};
