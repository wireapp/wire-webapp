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

const spawn = require('cross-spawn');

const commonConfig = require('./webpack.config.common');

const srcScript = 'src/script/';

const updateTranslationTypesPlugin = {
  apply: compiler => {
    compiler.hooks.watchRun.tapAsync('TranslationWatcher', (compiler, callback) => {
      const changedFiles = Array.from(compiler.modifiedFiles || new Set());
      const translationsFilePath = path.resolve(__dirname, 'src/i18n/en-US.json');

      if (!changedFiles.includes(translationsFilePath)) {
        return callback();
      }

      console.log('Translations file changed. Generating types...');

      const process = spawn('yarn', ['run', 'translate:generate-types'], {
        stdio: 'inherit',
      });

      process.on('close', code => {
        if (code !== 0) {
          console.error(`Translation type generation failed with code ${code}`);
        }
        callback();
      });
    });
  },
};
module.exports = {
  ...commonConfig,
  devtool: 'eval-source-map',
  entry: {
    ...commonConfig.entry,
    app: ['webpack-hot-middleware/client?reload=true', path.resolve(__dirname, srcScript, 'main/index.tsx')],
    auth: ['webpack-hot-middleware/client', path.resolve(__dirname, srcScript, 'auth/main.tsx')],
  },
  mode: 'development',
  plugins: [...commonConfig.plugins, new webpack.HotModuleReplacementPlugin(), updateTranslationTypesPlugin],
  snapshot: {
    // Watch @wireapp packages in node_modules and local monorepo dependencies
    managedPaths: [
      // Allow watching @wireapp packages (for yalc or local development)
      /^(.+?[\\/]node_modules[\\/](?!@wireapp))/,
    ],
    // Ensure local monorepo dependencies are watched
    immutablePaths: [],
  },
};
