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

import {checkVersion, startNewVersionPolling, stopNewVersionPolling} from 'src/script/lifecycle/newVersionHandler';
import 'src/script/util/test/mock/fetchMock';

const mainBuildMetadata = {
  version: 'main-aaaaaaa',
  assetVersion: 'main-aaaaaaa',
  commit: 'aaaaaaa1234567890',
  builtAt: '2026-08-03T10:00:00.000Z',
};

function setBrowserOnlineStatus(isOnline) {
  Object.defineProperty(navigator, 'onLine', {configurable: true, value: isOnline});
}

function setVersionResponse(buildMetadata, status = 200) {
  window.fetch.mockResolvedValue(new Response(JSON.stringify(buildMetadata), {status}));
}

describe('newVersionHandler', () => {
  beforeEach(() => {
    setBrowserOnlineStatus(true);
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopNewVersionPolling();
    jest.useRealTimers();
  });

  describe('startNewVersionPolling', () => {
    it('starts an interval when called', () => {
      spyOn(window, 'setInterval').and.returnValue(undefined);

      startNewVersionPolling(mainBuildMetadata.assetVersion, () => {});

      expect(window.setInterval).toHaveBeenCalled();
    });

    it('polls the server every 15 minutes', () => {
      jest.useFakeTimers();
      setVersionResponse(mainBuildMetadata);

      startNewVersionPolling(mainBuildMetadata.assetVersion, () => {});

      jest.advanceTimersByTime(30 * 60 * 1000);

      expect(window.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkVersion', () => {
    it('does not invoke the callback when local and server asset versions match', async () => {
      const onNewAssetVersionAvailable = jest.fn();
      setVersionResponse(mainBuildMetadata);
      startNewVersionPolling(mainBuildMetadata.assetVersion, onNewAssetVersionAvailable);

      await checkVersion();

      expect(onNewAssetVersionAvailable).not.toHaveBeenCalled();
    });

    it.each([
      {
        localAssetVersion: 'main-aaaaaaa',
        serverAssetVersion: 'main-bbbbbbb',
      },
      {
        localAssetVersion: 'main-fffffff',
        serverAssetVersion: 'main-1111111',
      },
    ])('invokes the callback whenever the asset versions differ', async testCase => {
      const onNewAssetVersionAvailable = jest.fn();
      setVersionResponse({
        ...mainBuildMetadata,
        version: testCase.serverAssetVersion,
        assetVersion: testCase.serverAssetVersion,
        commit: testCase.serverAssetVersion.slice(-7),
      });
      startNewVersionPolling(testCase.localAssetVersion, onNewAssetVersionAvailable);

      await checkVersion();

      expect(onNewAssetVersionAvailable).toHaveBeenCalledWith(testCase.serverAssetVersion);
    });

    it('detects a different Beta artifact when the logical release version is unchanged', async () => {
      const serverBuildMetadata = {
        version: '2026-08-03.1',
        assetVersion: '2026-08-03.1-bbbbbbb',
        commit: 'bbbbbbb1234567890',
        builtAt: '2026-08-03T11:00:00.000Z',
      };
      const onNewAssetVersionAvailable = jest.fn();
      setVersionResponse(serverBuildMetadata);
      startNewVersionPolling('2026-08-03.1-aaaaaaa', onNewAssetVersionAvailable);

      await checkVersion();

      expect(onNewAssetVersionAvailable).toHaveBeenCalledWith(serverBuildMetadata.assetVersion);
    });

    it('does not treat a different build time as a different artifact', async () => {
      const serverBuildMetadata = {
        ...mainBuildMetadata,
        builtAt: '2026-08-03T11:00:00.000Z',
      };
      const onNewAssetVersionAvailable = jest.fn();
      setVersionResponse(serverBuildMetadata);
      startNewVersionPolling(mainBuildMetadata.assetVersion, onNewAssetVersionAvailable);

      await checkVersion();

      expect(onNewAssetVersionAvailable).not.toHaveBeenCalled();
    });

    it('ignores a malformed /version/ response', async () => {
      const onNewAssetVersionAvailable = jest.fn();
      window.fetch.mockResolvedValue(new Response(JSON.stringify({version: 'main-bbbbbbb'})));
      startNewVersionPolling(mainBuildMetadata.assetVersion, onNewAssetVersionAvailable);

      await expect(checkVersion()).resolves.toBeUndefined();
      expect(onNewAssetVersionAvailable).not.toHaveBeenCalled();
    });

    it('ignores a failed /version/ response', async () => {
      const onNewAssetVersionAvailable = jest.fn();
      window.fetch.mockResolvedValue({ok: false, statusText: 'Service Unavailable'});
      startNewVersionPolling(mainBuildMetadata.assetVersion, onNewAssetVersionAvailable);

      await expect(checkVersion()).resolves.toBeUndefined();
      expect(onNewAssetVersionAvailable).not.toHaveBeenCalled();
    });

    it('ignores a request failure', async () => {
      const onNewAssetVersionAvailable = jest.fn();
      window.fetch.mockRejectedValue(new Error('network failure'));
      startNewVersionPolling(mainBuildMetadata.assetVersion, onNewAssetVersionAvailable);

      await expect(checkVersion()).resolves.toBeUndefined();
      expect(onNewAssetVersionAvailable).not.toHaveBeenCalled();
    });

    it('does not request or invoke the callback while the browser is offline', async () => {
      const onNewAssetVersionAvailable = jest.fn();
      setBrowserOnlineStatus(false);
      startNewVersionPolling('main-aaaaaaa', onNewAssetVersionAvailable);

      await checkVersion();

      expect(window.fetch).not.toHaveBeenCalled();
      expect(onNewAssetVersionAvailable).not.toHaveBeenCalled();
    });
  });
});
