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

import {getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

type OnNewVersionAvailableFn = (serverVersion: string) => void;

interface VersionListener {
  currentVersion: string;
  onNewVersionAvailable: OnNewVersionAvailableFn;
}

const logger = getLogger('newVersionHandler');
const VERSION_URL = '/version/';
const CHECK_INTERVAL = TIME_IN_MILLIS.HOUR * 3;

let newVersionListeners: VersionListener[] = [];
let pollInterval: number;

const fetchLatestVersion = async (): Promise<string> => {
  const response = await fetch(VERSION_URL);
  if (response.ok) {
    const {version} = await response.json();
    return version;
  }
  throw new Error(`Failed to fetch '${VERSION_URL}': ${response.statusText}`);
};

/**
 * Check all the registered version listeners if the server version is newer than the version they registered.
 *
 * @param overrideCurrentVersion will ignore the version set for the listener and use this one instead
 * @returns Promise that resolves when the check has been done
 */
export const checkVersion = async (overrideCurrentVersion: string): Promise<string | void> => {
  if (navigator.onLine) {
    const serverVersion = await fetchLatestVersion();
    newVersionListeners.forEach(({currentVersion, onNewVersionAvailable}) => {
      const baseVersion = overrideCurrentVersion || currentVersion;
      logger.info(`Checking current webapp version. Server '${serverVersion}' vs. local '${baseVersion}'`);

      const isOutdatedVersion = serverVersion > baseVersion;
      return isOutdatedVersion && onNewVersionAvailable(serverVersion);
    });
    return serverVersion;
  }
};

/**
 * Will register an interval that will poll the server for the latest version of the app.
 * If a new version is detected, will then call the given callback.
 *
 * @param currentVersion current version of the app
 * @param onNewVersionAvailable callback to be called when a new version is detected
 */
export const startNewVersionPolling = (
  currentVersion: string,
  onNewVersionAvailable: OnNewVersionAvailableFn,
): void => {
  newVersionListeners.push({currentVersion, onNewVersionAvailable});
  if (newVersionListeners.length === 1) {
    // starts the interval when we have our first listener
    pollInterval = window.setInterval(checkVersion, CHECK_INTERVAL);
  }
};

export const stopNewVersionPolling = (): void => {
  newVersionListeners = [];
  window.clearInterval(pollInterval);
};
