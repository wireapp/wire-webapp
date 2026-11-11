/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

const {copySync}: typeof import('fs-extra') = require('fs-extra');

const {resolve}: typeof import('node:path') = require('node:path');

function copyTelemetryAsset(serverOutputDirectory: string): void {
  const sourceFilePath = require.resolve('countly-sdk-web/lib/countly.min.js');
  const destinationFilePath = resolve(serverOutputDirectory, 'libs/wire/telemetry/embed.js');

  copySync(sourceFilePath, destinationFilePath);
}

export type TelemetryAssetFunctions = {
  readonly copyTelemetryAsset: typeof copyTelemetryAsset;
};

module.exports = {copyTelemetryAsset};
