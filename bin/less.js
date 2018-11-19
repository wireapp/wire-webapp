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

const src = path.resolve(__dirname, '../app/style');
const dist = path.resolve(__dirname, '../deploy/style');

process.chdir(src);
fs.mkdirpSync(dist);

const files = {
  [`${dist}/auth.css`]: fs.readFileSync(`${src}/auth/auth.less`, 'utf8'),
  [`${dist}/main.css`]: fs.readFileSync(`${src}/main.less`, 'utf8'),
  [`${dist}/support.css`]: fs.readFileSync(`${src}/support.less`, 'utf8'),
};

Object.entries(files).forEach(([outputPath, lessInput]) => renderCSS(lessInput, outputPath));

function renderCSS(lessInput, outputPath) {
  less
    .render(lessInput, {sourceMap: {}})
    .then(output => {
      fs.writeFileSync(outputPath, output.css, 'utf8');
      if (output.map) {
        fs.writeFileSync(`${outputPath}.map`, output.map, 'utf8');
      }
    })
    .catch(error => console.error('error', error));
}
