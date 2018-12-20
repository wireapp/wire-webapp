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

// https://github.com/gruntjs/grunt-contrib-copy

module.exports = {
  dist: {
    cwd: '<%= dir.app_ %>',
    dest: '<%= dir.dist.static %>',
    expand: true,
    src: ['audio/**/*', 'image/**/*', 'font/**/*', 'worker/*', 'sw.js'],
  },

  dist_audio: {
    cwd: '<%= dir.app_ %>/ext/audio/wire-audio-files',
    dest: '<%= dir.dist.static %>/audio',
    expand: true,
    src: '*',
  },

  dist_favicon: {
    cwd: '<%= dir.dist.static %>/image',
    dest: '<%= dir.dist.static %>',
    expand: true,
    src: 'favicon.ico',
  },
};
