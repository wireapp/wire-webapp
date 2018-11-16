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

module.exports = {
  deploy: {
    files: {
      'deploy/min/wire-vendor.min.js': ['deploy/min/wire-vendor.min.js'].concat('<%= scripts_minified.vendor %>'),
    },
  },
  dev: {
    files: {
      'deploy/min/wire-app.min.js': ['<%= scripts.app %>'].concat('<%= scripts_minified.app %>'),
      'deploy/min/wire-component.min.js': ['<%= scripts.component %>'].concat('<%= scripts_minified.component %>'),
      'deploy/min/wire-login.min.js': ['<%= scripts.login %>'].concat('<%= scripts_minified.login %>'),
      'deploy/min/wire-vendor.min.js': ['<%= scripts.vendor %>'].concat('<%= scripts_minified.vendor %>'),
    },
    options: {
      sourceMap: true,
    },
  },
};
