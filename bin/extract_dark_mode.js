#!/usr/bin/env node

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

const {CSSDiffReducer} = require('@pwnsdx/css-diff-reducer');
const fs = require('fs-extra');
const path = require('path');

const dist = path.resolve(__dirname, '../server/dist/static/style');
const DEFAULT_CSS = `${dist}/default.css`;
const DARK_MODE_CSS = `${dist}/dark.css`;

const read = pathToFile => {
  return new Promise((resolve, reject) => {
    return fs.readFile(pathToFile, {encoding: 'utf8', flag: 'r'}, (error, data) => {
      if (error) {
        return reject(error);
      }
      resolve(data);
    });
  });
};

const write = (pathToFile, data) => {
  return new Promise((resolve, reject) => {
    return fs.writeFile(pathToFile, data, {encoding: 'utf8'}, error => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
};

// Optimize dark mode stylesheet by using CSSDiffReducer
async function main() {
  const darkMode = new CSSDiffReducer(await read(DEFAULT_CSS), await read(DARK_MODE_CSS));
  await write(DARK_MODE_CSS, await darkMode.getDiff());
}

main();
