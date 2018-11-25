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

const less = require('less');
const path = require('path');
const fs = require('fs-extra');
const DEFAULT_ENCODING = 'utf8';

function renderCSS(lessInput) {
  return less.render(lessInput, {sourceMap: {}});
}

async function processLessFiles(files) {
  try {
    for (const outputPath in files) {
      const lessInput = fs.readFileSync(files[outputPath], DEFAULT_ENCODING);
      const output = await renderCSS(lessInput);
      fs.writeFileSync(outputPath, output.css, DEFAULT_ENCODING);
      if (output.map) {
        fs.writeFileSync(`${outputPath}.map`, output.map, DEFAULT_ENCODING);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

const src = path.resolve(__dirname, '../app/style');
const dist = path.resolve(__dirname, '../deploy/style');

process.chdir(src);
fs.mkdirpSync(dist);

processLessFiles({
  [`${dist}/auth.css`]: `${src}/auth/auth.less`,
  [`${dist}/default.css`]: `${src}/default.less`,
  [`${dist}/dark.css`]: `${src}/dark.less`,
  [`${dist}/support.css`]: `${src}/support.less`,
});
