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
const path = require('path');

const srcFolder = '../';
const distFolder = '../dist/';
const npmModulesFolder = '../../node_modules/';

const assetFolders = ['.ebextensions/', 'robots/', 'templates/', 'certificate'];

assetFolders.forEach(assetFolder => {
  fs.copySync(path.resolve(__dirname, srcFolder, assetFolder), path.resolve(__dirname, distFolder, assetFolder));
});

// copy countly.min.js and the official countly boomerang plugin
fs.copySync(
  path.resolve(__dirname, npmModulesFolder, 'countly-sdk-web/lib/countly.min.js'),
  path.resolve(__dirname, distFolder, 'libs/countly/countly.min.js'),
);
fs.copySync(
  path.resolve(__dirname, npmModulesFolder, 'countly-sdk-web/plugin/boomerang'),
  path.resolve(__dirname, distFolder, 'libs/countly'),
);
