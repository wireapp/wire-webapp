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

// https://github.com/alanshaw/grunt-include-replace

module.exports = {
  prod_auth: {
    cwd: '<%= dir.src.page %>',
    dest: '<%= dir.dist.static %>/auth',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.src.page %>/template',
      prefix: '#',
    },
    rename: dest => `${dest}/index.html`,
    src: 'auth.html',
  },

  prod_demo: {
    cwd: '<%= dir.src.demo %>',
    dest: '<%= dir.dist.static %>/demo',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.src.demo %>/template',
      prefix: '#',
    },
    rename: dest => `${dest}/index.html`,
    src: 'demo.html',
  },

  prod_index: {
    cwd: '<%= dir.src.page %>',
    dest: '<%= dir.dist.static %>',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.src.page %>/template',
      prefix: '#',
    },
    src: 'index.html',
  },
};
