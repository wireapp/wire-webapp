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

const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'dist/types.d.ts');
const regex = /^(declare class )/gm;

fs.readFile(file, 'utf8', (err, content) => {
  if (err !== null) {
    throw err;
  }
  if (content.match(regex)) {
    fs.writeFile(file, content.replace(regex, 'export $1'), error => {
      if (error !== null) {
        throw error;
      }
    });
  }
});
