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
const {copyTelemetryAsset} = require('../../../tools/serverPackaging/telemetryAssets.ts');

const srcFolder = '../';
const serverOutputDirectory = path.resolve(
  process.env.WIRE_WEBAPP_SERVER_OUTPUT_PATH ?? path.resolve(__dirname, '../dist'),
);

const assetFolders = ['.ebextensions/', 'robots/', 'templates/', 'certificate'];

assetFolders.forEach(assetFolder => {
  fs.copySync(path.resolve(__dirname, srcFolder, assetFolder), path.resolve(serverOutputDirectory, assetFolder));
});

copyTelemetryAsset(serverOutputDirectory);

if (process.argv.includes('--bundle')) {
  const countryDatabasePath = path.resolve(path.dirname(require.resolve('geolite2')), 'dbs/GeoLite2-Country.mmdb');
  fs.copySync(countryDatabasePath, path.resolve(serverOutputDirectory, 'dbs/GeoLite2-Country.mmdb'));
}
