#!/usr/bin/env node
/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

//@ts-check

const path = require('path');
const globby = require('globby');
const AdmZip = require('adm-zip');

const {
  directories: {output: buildDir},
  productName,
} = require('../electron-builder.config');

const buildDirResolved = path.resolve(__dirname, '..', buildDir);
const zipFile = path.join(buildDirResolved, `${productName}.zip`);
const buildFiles = globby.sync(`${productName}-*`, {
  cwd: buildDir,
  expandDirectories: false,
  followSymbolicLinks: false,
  onlyFiles: true,
});

if (!buildFiles.length) {
  console.error('No build files found.');
  process.exit(1);
}

const buildFile = path.join(buildDirResolved, buildFiles[0]);

const zip = new AdmZip();
zip.addLocalFile(buildFile);
zip.writeZip(zipFile);
