#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

const path = require('path');
const {writeFileSync} = require('fs');
const {execSync} = require('child_process');

function generateVersion() {
  return new Date()
    .toISOString()
    .replace(/[T\-:]/g, '.')
    .replace(/\.\d+Z/, '');
}

function generateCommmitHash() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

writeFileSync(
  path.resolve(__dirname, '../dist/config/version.json'),
  JSON.stringify({version: generateVersion(), commit: generateCommmitHash()}),
);
