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

const fs = require('fs-extra');
const less = require('less');
const path = require('path');
const {SRC_PATH, DIST_PATH} = require('../locations');

const src = path.resolve(SRC_PATH, 'style');
const dist = path.resolve(DIST_PATH, 'static/style');

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

function renderCSS(lessInput) {
  return less.render(lessInput, {sourceMap: {}});
}

async function processLessFiles(files) {
  try {
    for (const outputPath in files) {
      const lessInput = await read(files[outputPath]);
      const output = await renderCSS(lessInput);
      await write(outputPath, output.css);
      if (output.map) {
        await write(`${outputPath}.map`, output.map);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

process.chdir(src);
fs.mkdirpSync(dist);

processLessFiles({
  [`${dist}/default.css`]: `${src}/default.less`,
  [`${dist}/support.css`]: `${src}/support.less`,
});
