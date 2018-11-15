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

// https://github.com/gruntjs/grunt-contrib-copy

module.exports = {
  //##############################################################################
  // Amazon Web Services related
  //##############################################################################
  aws: {
    cwd: '<%= dir.deploy %>',
    dest: '<%= dir.aws.static %>',
    expand: true,
    src: '**/*',
  },
  //##############################################################################
  // Prod/Staging/Edge deployment related
  //##############################################################################
  deploy: {
    cwd: '<%= dir.app_ %>',
    dest: '<%= dir.deploy %>',
    expand: true,
    src: [
      'ext/image/**/*',
      'ext/js/**/*',
      'ext/proto/**/*',
      'audio/**/*',
      'image/**/*',
      'font/**/*',
      'style/*.css',
      'script/**/*.js',
      'worker/*',
      '*.js',
    ],
  },

  deploy_audio: {
    cwd: '<%= dir.app_ %>/ext/audio/wire-audio-files',
    dest: '<%= dir.deploy %>/audio',
    expand: true,
    src: '*',
  },

  deploy_favicon: {
    cwd: '<%= dir.deploy %>/image',
    dest: '<%= dir.deploy %>',
    expand: true,
    src: 'favicon.ico',
  },
  //##############################################################################
  // Local deployment related
  //##############################################################################
  frontend: {
    files: [
      {
        cwd: 'node_modules',
        dest: '<%= dir.app.ext %>/js/',
        expand: true,
        src: [
          '@wireapp/cbor/dist/cbor.bundle.js',
          '@wireapp/cbor/dist/cbor.bundle.js.map',
          '@wireapp/cryptobox/dist/cryptobox.bundle.js',
          '@wireapp/cryptobox/dist/cryptobox.bundle.js.map',
          '@wireapp/lru-cache/dist/lru-cache.bundle.js',
          '@wireapp/lru-cache/dist/lru-cache.bundle.js.map',
          '@wireapp/priority-queue/dist/priority-queue.bundle.js',
          '@wireapp/priority-queue/dist/priority-queue.bundle.js.map',
          '@wireapp/proteus/dist/proteus.bundle.js',
          '@wireapp/proteus/dist/proteus.bundle.js.map',
          '@wireapp/store-engine/dist/store-engine.bundle.js',
          '@wireapp/store-engine/dist/store-engine.bundle.js.map',
          'dexie-batch/dist/dexie-batch.js',
          'dexie-batch/dist/dexie-batch.js.map',
          'jszip/dist/jszip.js',
          'long/dist/long.js',
          'simplebar/dist/simplebar.min.js',
        ],
      },
      {
        cwd: 'node_modules',
        dest: '<%= dir.app.ext %>/css/',
        expand: true,
        src: ['simplebar/dist/simplebar.min.css'],
      },
    ],
  },
};
