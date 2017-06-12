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

// https://github.com/alanshaw/grunt-include-replace

module.exports = {
//##############################################################################
// Local deployment related
//##############################################################################
  dist_index: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.dist %>',
    expand: true,
    options: {
      includesDir: '<%= dir.app.page %>/template',
      globals: {
        dest: '_dist',
      },
      prefix: '#',
    },
    src: 'index.html',
  },

  dist_auth: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.dist %>/auth',
    expand: true,
    options: {
      includesDir: '<%= dir.app.page %>/template',
      globals: {
        dest: '_dist',
      },
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'auth.html',
  },

  dist_demo: {
    cwd: '<%= dir.app.demo %>',
    dest: '<%= dir.dist %>/demo',
    expand: true,
    options: {
      includesDir: '<%= dir.app.demo %>/template',
      globals: {
        dest: '_dist',
      },
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'demo.html',
  },


//##############################################################################
// Edge/Staging deployment related
//##############################################################################
  deploy_index: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>',
    expand: true,
    options: {
      includesDir: '<%= dir.app.page %>/template',
      globals: {
        dest: '_deploy',
      },
      prefix: '#',
    },
    src: 'index.html',
  },

  deploy_auth: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>/auth',
    expand: true,
    options: {
      includesDir: '<%= dir.app.page %>/template',
      globals: {
        dest: '_deploy',
      },
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
      includesDir: '<%= dir.app.demo %>/template',
      globals: {
        dest: '_deploy',
      },
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'demo.html',
  },

//##############################################################################
// Production deployment related
//##############################################################################
  prod_index: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>',
    expand: true,
    options: {
      includesDir: '<%= dir.app.page %>/template',
      globals: {
        dest: '_prod',
      },
      prefix: '#',
    },
    src: 'index.html',
  },

  prod_auth: {
    cwd: '<%= dir.app.page %>',
    dest: '<%= dir.deploy %>/auth',
    expand: true,
    options: {
      includesDir: '<%= dir.app.page %>/template',
      globals: {
        dest: '_prod',
      },
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
      includesDir: '<%= dir.app.demo %>/template',
      globals: {
        dest: '_prod',
      },
      prefix: '#',
    },
    rename(dest, src) {
      return `${dest}/index.html`;
    },
    src: 'demo.html',
  },
};
