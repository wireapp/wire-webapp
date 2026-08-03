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

import {isBuildMetadata, type BuildMetadata} from '@wireapp/config';

import {getLogger} from 'Util/logger';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

type OnNewAssetVersionAvailable = (serverAssetVersion: string) => void;

interface AssetVersionListener {
  currentAssetVersion: string;
  onNewAssetVersionAvailable: OnNewAssetVersionAvailable;
}

const logger = getLogger('newVersionHandler');
const buildMetadataUrl = '/version/';
const checkIntervalMilliseconds = TIME_IN_MILLIS.MINUTE * 15;

let assetVersionListeners: AssetVersionListener[] = [];
let assetVersionPollingInterval: number;

const fetchLatestBuildMetadata = async (): Promise<BuildMetadata> => {
  const response = await fetch(buildMetadataUrl);
  if (response.ok) {
    const responseBody: unknown = await response.json();

    if (isBuildMetadata(responseBody)) {
      return responseBody;
    }

    throw new Error(`Invalid build metadata returned by '${buildMetadataUrl}'`);
  }
  throw new Error(`Failed to fetch '${buildMetadataUrl}': ${response.statusText}`);
};

/**
 * Check all registered listeners for a different browser artifact.
 *
 * @param overrideCurrentAssetVersion will ignore the asset version set for the listener and use this one instead
 * @returns Promise that resolves when the check has been done
 */
export const checkVersion = async (overrideCurrentAssetVersion?: string): Promise<string | void> => {
  if (navigator.onLine !== true) {
    return;
  }

  let serverBuildMetadata: BuildMetadata;
  try {
    serverBuildMetadata = await fetchLatestBuildMetadata();
  } catch (error: unknown) {
    logger.info(`Could not check for a new webapp artifact: ${String(error)}`);
    return;
  }

  assetVersionListeners.forEach(({currentAssetVersion, onNewAssetVersionAvailable}) => {
    const localAssetVersion = overrideCurrentAssetVersion ?? currentAssetVersion;
    logger.info(
      `Checking current webapp artifact. Server '${serverBuildMetadata.assetVersion}' vs. local '${localAssetVersion}'`,
    );

    if (serverBuildMetadata.assetVersion !== localAssetVersion) {
      onNewAssetVersionAvailable(serverBuildMetadata.assetVersion);
    }
  });

  return serverBuildMetadata.assetVersion;
};

/**
 * Will register an interval that polls the server for the latest build metadata.
 * If a different browser artifact is detected, it calls the given callback.
 *
 * @param currentAssetVersion asset version of the browser artifact
 * @param onNewAssetVersionAvailable callback to be called when a different artifact is detected
 */
export const startNewVersionPolling = (
  currentAssetVersion: string,
  onNewAssetVersionAvailable: OnNewAssetVersionAvailable,
): void => {
  assetVersionListeners.push({currentAssetVersion, onNewAssetVersionAvailable});
  if (assetVersionListeners.length === 1) {
    // starts the interval when we have our first listener
    assetVersionPollingInterval = window.setInterval(() => {
      void checkVersion();
    }, checkIntervalMilliseconds);
  }
};

export const stopNewVersionPolling = (): void => {
  assetVersionListeners = [];
  window.clearInterval(assetVersionPollingInterval);
};
