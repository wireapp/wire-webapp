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

/* eslint-disable header/header */

import {readFileSync, writeJSON} from 'fs-extra';

import path from 'path';

import {LicenseCollector} from './LicenseCollector';

const repositories = readFileSync('repositories.txt', 'utf8').split('\n').filter(Boolean);

let filter: string[] = [];

try {
  filter = readFileSync('filter.txt', 'utf8').split('\n').filter(Boolean);
} catch (error) {}

const outputFile = path.resolve('licenses.json');

(async () => {
  const licenses = await new LicenseCollector({devDependencies: false, filter, repositories}).collect();
  if (licenses.length) {
    await writeJSON(outputFile, licenses, {spaces: 2});
    console.info(`Saved licenses to "${outputFile}".`);
  } else {
    console.info('No licenses collected.');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
