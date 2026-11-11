/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {Configuration} from '@rspack/core';

import {fileURLToPath} from 'node:url';

const configuration: Configuration = {
  mode: 'production',
  devtool: 'source-map',
  target: 'node26',
  context: fileURLToPath(new URL('.', import.meta.url)),
  entry: './index.ts',
  externalsPresets: {node: true},
  output: {
    path: fileURLToPath(new URL('./build/bundle', import.meta.url)),
    filename: 'index.js',
    clean: true,
    module: false,
  },
  node: {__dirname: false, __filename: false},
  resolve: {extensions: ['.ts', '.js', '.json']},
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}},
      },
    ],
  },
  optimization: {minimize: true},
  stats: {
    all: false,
    assets: true,
    modules: true,
    nestedModules: true,
    orphanModules: true,
    runtimeModules: true,
    modulesSpace: Infinity,
    groupModulesByAttributes: false,
    groupModulesByCacheStatus: false,
    groupModulesByExtension: false,
    groupModulesByLayer: false,
    groupModulesByPath: false,
    groupModulesByType: false,
    children: true,
    errors: true,
    warnings: true,
  },
};

export default configuration;
