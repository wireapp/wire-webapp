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

module.exports = {
  options: {
    marks: [
      {
        color: 'red',
        name: 'FIX',
        pattern: /FIXME/,
      },
      {
        color: 'blue',
        name: 'NOTE',
        pattern: /NOTE/,
      },
      {
        color: 'blue',
        name: 'PENDING',
        pattern: /XXX/,
      },
      {
        color: 'yellow',
        name: 'TODO',
        pattern: /TODO/,
      },
      {
        color: 'red',
        name: 'XXX',
        pattern: /XXX/,
      },
      {
        color: 'red',
        name: 'Unsafe Knockout HTML binding',
        pattern: '"html:',
      },
      {
        color: 'red',
        name: 'Beginning of Git differences (<<<<<<<)',
        pattern: /<<<<<<</,
      },
      {
        color: 'red',
        name: 'Ending of Git differences (>>>>>>>)',
        pattern: />>>>>>>/,
      },
    ],
  },

  src: ['<%= dir.app.script %>/**/*.js', '<%= dir.app.style %>/**/*.less', '<%= dir.test_ %>/**/*.js'],
};
