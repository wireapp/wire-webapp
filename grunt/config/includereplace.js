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

// https://github.com/alanshaw/grunt-include-replace

module.exports = {
  //##############################################################################
  // Edge/Staging deployment related
  //##############################################################################
  deploy_auth: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>/auth',
    expand: true,
    options: {
      globals: {
        dest: '_deploy',
      },
      includesDir: '<%= dir.app.page %>/template',
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'auth.html',
  },

  deploy_demo: {
    cwd: '<%= dir.app.demo %>',
    dest: '<%= dir.deploy %>/demo',
    expand: true,
    options: {
      globals: {
        dest: '_deploy',
      },
      includesDir: '<%= dir.app.demo %>/template',
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'demo.html',
  },

  deploy_index: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>',
    expand: true,
    options: {
      globals: {
        dest: '_deploy',
      },
      includesDir: '<%= dir.app.page %>/template',
      prefix: '#',
    },
    src: 'index.html',
  },

  deploy_login: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>/login',
    expand: true,
    options: {
      globals: {
        dest: '_deploy',
      },
      includesDir: '<%= dir.app.page %>/template',
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'login.html',
  },

  //##############################################################################
  // Production deployment related
  //##############################################################################
  prod_auth: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>/auth',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.app.page %>/template',
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'auth.html',
  },

  prod_demo: {
    cwd: '<%= dir.app.demo %>',
    dest: '<%= dir.deploy %>/demo',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.app.demo %>/template',
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'demo.html',
  },

  prod_index: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.app.page %>/template',
      prefix: '#',
    },
    src: 'index.html',
  },

  prod_login: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>/login',
    expand: true,
    options: {
      globals: {
        dest: '_prod',
      },
      includesDir: '<%= dir.app.page %>/template',
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'login.html',
  },
};
