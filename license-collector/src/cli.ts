#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import * as fs from 'fs-extra';
import * as path from 'path';

import {LicenseCollector} from './LicenseCollector';

const repositories = fs
  .readFileSync('repositories.txt', 'utf8')
  .split('\n')
  .filter(Boolean);

let filter: string[] = [];

try {
  filter = fs
    .readFileSync('filter.txt', 'utf8')
    .split('\n')
    .filter(Boolean);
} catch (error) {}

const outputFile = path.resolve('licenses.json');

new LicenseCollector({devDependencies: false, filter, repositories})
  .collect()
  .then(async licenses => {
    if (licenses.length) {
      await fs.writeJSON(outputFile, licenses, {spaces: 2});
      console.log(`Saved licenses to "${outputFile}".`);
    } else {
      console.log('No licenses collected.');
    }
  })
  .catch(console.error);
