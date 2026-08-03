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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {type BuildMetadata} from '@wireapp/config';
import {task, type Task} from 'true-myth';

import {
  checkForNewVersion,
  createFetchLatestBuildMetadata,
  type CheckForNewVersionOptions,
  type FetchLatestBuildMetadata,
  startNewVersionPolling,
} from './newVersionHandler';

const mainBuildMetadata: BuildMetadata = {
  version: 'main',
  assetVersion: 'main-aaaaaaa',
  commit: 'aaaaaaa1234567890',
  builtAt: '2026-08-03T10:00:00.000Z',
};

function createCheckOptions(overrides: Partial<CheckForNewVersionOptions> = {}): CheckForNewVersionOptions {
  function reportBrowserOnlineStatus(): boolean {
    return true;
  }

  function fetchMainBuildMetadata(): Task<BuildMetadata, Error> {
    return task.resolve(mainBuildMetadata);
  }

  return {
    localAssetVersion: mainBuildMetadata.assetVersion,
    isOnline: reportBrowserOnlineStatus,
    fetchLatestBuildMetadata: fetchMainBuildMetadata,
    onNewVersionAvailable: jest.fn(),
    ...overrides,
  };
}

function createResponseWithBody(responseBody: unknown): Response {
  return {
    ok: true,
    statusText: 'OK',
    json: async (): Promise<unknown> => {
      return responseBody;
    },
  } as Response;
}

describe('checkForNewVersion', () => {
  it('does not fetch or invoke the callback while offline', async function (): Promise<void> {
    let fetchCallCount = 0;
    function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
      fetchCallCount += 1;
      return task.resolve(mainBuildMetadata);
    }

    const onNewVersionAvailable = jest.fn();
    const checkOptions = createCheckOptions({
      isOnline: () => {
        return false;
      },
      fetchLatestBuildMetadata,
      onNewVersionAvailable,
    });

    await checkForNewVersion(checkOptions);

    expect(fetchCallCount).toBe(0);
    expect(onNewVersionAvailable).not.toHaveBeenCalled();
  });

  it('does not invoke the callback for the same asset version', async function (): Promise<void> {
    const onNewVersionAvailable = jest.fn();

    await checkForNewVersion(createCheckOptions({onNewVersionAvailable}));

    expect(onNewVersionAvailable).not.toHaveBeenCalled();
  });

  it('invokes the callback once for a different asset version', async function (): Promise<void> {
    const serverBuildMetadata: BuildMetadata = {
      ...mainBuildMetadata,
      assetVersion: 'main-bbbbbbb',
      commit: 'bbbbbbb1234567890',
    };
    const onNewVersionAvailable = jest.fn();
    function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
      return task.resolve(serverBuildMetadata);
    }

    await checkForNewVersion(
      createCheckOptions({
        fetchLatestBuildMetadata,
        onNewVersionAvailable,
      }),
    );

    expect(onNewVersionAvailable).toHaveBeenCalledTimes(1);
    expect(onNewVersionAvailable).toHaveBeenCalledWith(serverBuildMetadata.assetVersion);
  });

  it('detects a lexically lower replacement by comparing asset identity only', async function (): Promise<void> {
    const serverBuildMetadata: BuildMetadata = {
      ...mainBuildMetadata,
      assetVersion: 'main-1111111',
      commit: '11111111234567890',
    };
    const onNewVersionAvailable = jest.fn();
    function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
      return task.resolve(serverBuildMetadata);
    }

    await checkForNewVersion(
      createCheckOptions({
        localAssetVersion: 'main-fffffff',
        fetchLatestBuildMetadata,
        onNewVersionAvailable,
      }),
    );

    expect(onNewVersionAvailable).toHaveBeenCalledWith(serverBuildMetadata.assetVersion);
  });

  it('detects a different artifact for the same logical release', async function (): Promise<void> {
    const serverBuildMetadata: BuildMetadata = {
      version: '2026-08-03.1',
      assetVersion: '2026-08-03.1-bbbbbbb',
      commit: 'bbbbbbb1234567890',
      builtAt: '2026-08-03T11:00:00.000Z',
    };
    const onNewVersionAvailable = jest.fn();
    function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
      return task.resolve(serverBuildMetadata);
    }

    await checkForNewVersion(
      createCheckOptions({
        localAssetVersion: '2026-08-03.1-aaaaaaa',
        fetchLatestBuildMetadata,
        onNewVersionAvailable,
      }),
    );

    expect(onNewVersionAvailable).toHaveBeenCalledWith(serverBuildMetadata.assetVersion);
  });

  it('does not treat a different build time as a different artifact', async function (): Promise<void> {
    const serverBuildMetadata: BuildMetadata = {
      ...mainBuildMetadata,
      builtAt: '2026-08-03T11:00:00.000Z',
    };
    const onNewVersionAvailable = jest.fn();
    function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
      return task.resolve(serverBuildMetadata);
    }

    await checkForNewVersion(
      createCheckOptions({
        fetchLatestBuildMetadata,
        onNewVersionAvailable,
      }),
    );

    expect(onNewVersionAvailable).not.toHaveBeenCalled();
  });

  it('handles an expected request failure without rejecting', async function (): Promise<void> {
    const requestFailure = new Error('network failure');
    const onNewVersionAvailable = jest.fn();
    function fetchLatestBuildMetadata(): Task<BuildMetadata, Error> {
      return task.reject(requestFailure);
    }

    await expect(
      checkForNewVersion(
        createCheckOptions({
          fetchLatestBuildMetadata,
          onNewVersionAvailable,
        }),
      ),
    ).resolves.toBeUndefined();
    expect(onNewVersionAvailable).not.toHaveBeenCalled();
  });

  it('handles invalid server metadata without rejecting', async function (): Promise<void> {
    const fetchLatestBuildMetadata = createFetchLatestBuildMetadata({
      fetchBuildMetadata: async (): Promise<Response> => {
        return createResponseWithBody({version: 'main'});
      },
    });
    const onNewVersionAvailable = jest.fn();

    await expect(
      checkForNewVersion(
        createCheckOptions({
          fetchLatestBuildMetadata,
          onNewVersionAvailable,
        }),
      ),
    ).resolves.toBeUndefined();
    expect(onNewVersionAvailable).not.toHaveBeenCalled();
  });
});

describe('startNewVersionPolling', () => {
  it('performs the first check after one complete interval', function (): void {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const pollingIntervalMilliseconds = 1_234;
    const runUpdateCheck = jest.fn();
    const cleanupNewVersionPolling = startNewVersionPolling({
      wallClock: deterministicWallClock,
      pollingIntervalMilliseconds,
      runUpdateCheck,
    });

    expect(runUpdateCheck).not.toHaveBeenCalled();
    deterministicWallClock.advanceByMilliseconds(pollingIntervalMilliseconds - 1);
    expect(runUpdateCheck).not.toHaveBeenCalled();
    deterministicWallClock.advanceByMilliseconds(1);
    expect(runUpdateCheck).toHaveBeenCalledTimes(1);

    cleanupNewVersionPolling();
  });

  it('runs once per completed interval', function (): void {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const pollingIntervalMilliseconds = 567;
    const runUpdateCheck = jest.fn();
    const cleanupNewVersionPolling = startNewVersionPolling({
      wallClock: deterministicWallClock,
      pollingIntervalMilliseconds,
      runUpdateCheck,
    });

    deterministicWallClock.advanceByMilliseconds(pollingIntervalMilliseconds * 3);

    expect(runUpdateCheck).toHaveBeenCalledTimes(3);
    cleanupNewVersionPolling();
  });

  it('stops running checks after cleanup', function (): void {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const pollingIntervalMilliseconds = 567;
    const runUpdateCheck = jest.fn();
    const cleanupNewVersionPolling = startNewVersionPolling({
      wallClock: deterministicWallClock,
      pollingIntervalMilliseconds,
      runUpdateCheck,
    });

    deterministicWallClock.advanceByMilliseconds(pollingIntervalMilliseconds);
    cleanupNewVersionPolling();
    deterministicWallClock.advanceByMilliseconds(pollingIntervalMilliseconds * 2);

    expect(runUpdateCheck).toHaveBeenCalledTimes(1);
  });

  it('keeps independent polling instances separate', function (): void {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const firstPollingCallback = jest.fn();
    const secondPollingCallback = jest.fn();
    const firstCleanup = startNewVersionPolling({
      wallClock: deterministicWallClock,
      pollingIntervalMilliseconds: 100,
      runUpdateCheck: firstPollingCallback,
    });
    const secondCleanup = startNewVersionPolling({
      wallClock: deterministicWallClock,
      pollingIntervalMilliseconds: 250,
      runUpdateCheck: secondPollingCallback,
    });

    deterministicWallClock.advanceByMilliseconds(250);
    firstCleanup();
    deterministicWallClock.advanceByMilliseconds(250);

    expect(firstPollingCallback).toHaveBeenCalledTimes(2);
    expect(secondPollingCallback).toHaveBeenCalledTimes(2);
    secondCleanup();
  });
});
