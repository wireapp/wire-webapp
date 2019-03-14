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

import TimeUtil from 'utils/TimeUtil';
import Logger from 'utils/Logger';

const logger = Logger('LifecycleRepository');
const VERSION_URL = '/version/';
const CHECK_INTERVAL = TimeUtil.UNITS_IN_MILLIS.HOUR * 3;

const fetchLatestVersion = async () => {
  const response = await fetch(VERSION_URL);
  if (response.ok) {
    const {version} = await response.json();
    return version;
  }
  throw new Error(`Failed to fetch '${VERSION_URL}': ${response.statusText}`);
};

const checkVersion = async (currentVersion, onNewVersionAvailable) => {
  if (navigator.onLine) {
    const serverVersion = await fetchLatestVersion();
    logger.info(`Checking current webapp version. Server '${serverVersion}' vs. local '${currentVersion}'`);

    const isOutdatedVersion = serverVersion > currentVersion;
    return isOutdatedVersion && onNewVersionAvailable(serverVersion);
  }
};

/**
 * Will register an interval that will poll the server for the latest version of the app.
 * If a new version is detected, will then call the given callback.
 *
 * @param {type} currentVersion - current version of the app
 * @param {type} onNewVersionAvailable - callback to be called when a new version is detected
 * @returns {void} - nothing
 */
export function startNewVersionPolling(currentVersion, onNewVersionAvailable) {
  window.setInterval(() => checkVersion(currentVersion, onNewVersionAvailable), CHECK_INTERVAL);
}
