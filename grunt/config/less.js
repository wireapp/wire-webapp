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

'use strict';
// https://github.com/gruntjs/grunt-contrib-less

module.exports = {
  //##############################################################################
  // Production/Staging/Edge deployment related
  //##############################################################################
  deploy: {
    files: [
      {
        '<%= dir.deploy %>/style/auth.css': '<%= dir.app.style %>/auth/auth.less',
        '<%= dir.deploy %>/style/main.css': '<%= dir.app.style %>/main.less',
      },
    ],
    options: {
      compress: true,
      paths: '<%= dir.app_ %>',
    },
  },

  //##############################################################################
  // Local deployment related
  //##############################################################################
  dist: {
    files: [
      {
        '<%= dir.dist %>/style/auth.css': '<%= dir.app.style %>/auth/auth.less',
        '<%= dir.dist %>/style/main.css': '<%= dir.app.style %>/main.less',
      },
    ],
    options: {
      paths: '<%= dir.app_ %>',
    },
  },
};
