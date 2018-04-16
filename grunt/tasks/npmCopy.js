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

'use strict';

const chalk = require('chalk');
const path = require('path');

module.exports = grunt =>
  grunt.registerTask('npmCopy', () => {
    const distPath = grunt.config('dir.app.ext');

    const npmModules = {
      '@wireapp/cbor': ['dist/cbor.bundle.js', 'dist/cbor.bundle.js.map'],
      '@wireapp/cryptobox': ['dist/cryptobox.bundle.js', 'dist/cryptobox.bundle.js.map'],
      '@wireapp/lru-cache': ['dist/lru-cache.bundle.js', 'dist/lru-cache.bundle.js.map'],
      '@wireapp/proteus': ['dist/proteus.bundle.js', 'dist/proteus.bundle.js.map'],
      '@wireapp/store-engine': ['dist/store-engine.bundle.js', 'dist/store-engine.bundle.js.map'],
      'dexie-batch': ['dexie-batch.js'],
      streamsaver: ['StreamSaver.js', 'sw.js'],
    };

    Object.keys(npmModules).forEach(module => {
      const moduleFiles = npmModules[module];
      moduleFiles.forEach(file => {
        const from = path.join('node_modules', module, file);
        const to = path.join(distPath, 'js', module, file);
        grunt.file.copy(from, to);
        grunt.log.writeln(chalk`Copied file from "{blue ${from}}" to "{blue ${to}}".`);
      });
    });

    grunt.log.ok(chalk`Copied npm components from "{blue node_modules}" to "{blue ${distPath}}".`);
  });
