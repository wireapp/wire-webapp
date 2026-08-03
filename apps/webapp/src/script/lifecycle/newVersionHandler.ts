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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import {isError} from '@sindresorhus/is';
import {task, type Task} from 'true-myth';

import {isBuildMetadata, type BuildMetadata} from '@wireapp/config';

import {getLogger} from 'Util/logger';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

const logger = getLogger('newVersionHandler');
const buildMetadataUrl = '/version/';

export const NEW_VERSION_POLLING_INTERVAL_MILLISECONDS = TIME_IN_MILLIS.MINUTE * 15;

export type FetchLatestBuildMetadata = () => Task<BuildMetadata, Error>;

export type CheckForNewVersionOptions = {
  readonly localAssetVersion: string;
  readonly isOnline: () => boolean;
  readonly fetchLatestBuildMetadata: FetchLatestBuildMetadata;
  readonly onNewVersionAvailable: (serverAssetVersion: string) => void;
};

export type CreateFetchLatestBuildMetadataOptions = {
  readonly fetchBuildMetadata: typeof globalThis.fetch;
};

export type StartNewVersionPollingOptions = {
  readonly wallClock: WallClock;
  readonly pollingIntervalMilliseconds: number;
  readonly runUpdateCheck: () => void;
};

export type CreateNewVersionPollingCallbackOptions = CheckForNewVersionOptions & {
  readonly invokeAsynchronously: (asyncOperation: () => Promise<unknown>) => void;
};

function normalizeFetchError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }

  return new Error(String(error));
}

/**
 * Creates the browser boundary that retrieves and validates the server build metadata.
 */
export function createFetchLatestBuildMetadata(
  options: CreateFetchLatestBuildMetadataOptions,
): FetchLatestBuildMetadata {
  const {fetchBuildMetadata} = options;

  return function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
    return task.tryOrElse(normalizeFetchError, async (): Promise<BuildMetadata> => {
      const response = await fetchBuildMetadata(buildMetadataUrl);
      if (response.ok) {
        const responseBody: unknown = await response.json();

        if (isBuildMetadata(responseBody)) {
          return responseBody;
        }

        throw new Error(`Invalid build metadata returned by '${buildMetadataUrl}'`);
      }

      throw new Error(`Failed to fetch '${buildMetadataUrl}': ${response.statusText}`);
    });
  };
}

/**
 * Performs one update check without owning browser APIs or scheduling state.
 */
export async function checkForNewVersion(options: CheckForNewVersionOptions): Promise<string | void> {
  const {localAssetVersion, isOnline, fetchLatestBuildMetadata, onNewVersionAvailable} = options;

  if (isOnline() === false) {
    return;
  }

  const latestServerAssetVersion = await fetchLatestBuildMetadata().match({
    Resolved: (serverBuildMetadata): string | undefined => {
      logger.info(
        `Checking current webapp artifact. Server '${serverBuildMetadata.assetVersion}' vs. local '${localAssetVersion}'`,
      );

      if (serverBuildMetadata.assetVersion !== localAssetVersion) {
        onNewVersionAvailable(serverBuildMetadata.assetVersion);
      }

      return serverBuildMetadata.assetVersion;
    },
    Rejected: (error): string | undefined => {
      logger.info(`Could not check for a new webapp artifact: ${String(error)}`);
      return undefined;
    },
  });

  return latestServerAssetVersion;
}

/**
 * Creates the synchronous scheduler callback that invokes one asynchronous update check safely.
 */
export function createNewVersionPollingCallback(options: CreateNewVersionPollingCallbackOptions): () => void {
  const {localAssetVersion, isOnline, fetchLatestBuildMetadata, onNewVersionAvailable, invokeAsynchronously} = options;

  return function runNewVersionCheck(): void {
    invokeAsynchronously(async () => {
      await checkForNewVersion({
        localAssetVersion,
        isOnline,
        fetchLatestBuildMetadata,
        onNewVersionAvailable,
      });
    });
  };
}

/**
 * Starts delayed polling for update checks and returns cleanup for this polling instance.
 */
export function startNewVersionPolling(options: StartNewVersionPollingOptions): () => void {
  const {wallClock, pollingIntervalMilliseconds, runUpdateCheck} = options;
  const intervalIdentifier = wallClock.setInterval(runUpdateCheck, pollingIntervalMilliseconds);

  return function cleanupNewVersionPolling(): void {
    wallClock.clearInterval(intervalIdentifier);
  };
}
