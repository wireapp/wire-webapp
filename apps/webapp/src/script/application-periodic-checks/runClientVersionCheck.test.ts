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

import {KyInstance} from 'ky';

import {
  reloadClientVersionCheckAction,
  successfulClientVersionCheckHttpStatusCode,
  upgradeRequiredHttpStatusCode,
} from './clientVersionCheckResponseSchema';
import {runClientVersionCheck} from './runClientVersionCheck';

describe('runClientVersionCheck', () => {
  it('requests the client version check route', async () => {
    const clientVersion = '2026.02.12.17.51.00';
    const setDoesApplicationNeedForceReload = jest.fn();
    const kyInstance = {
      get: jest.fn(() => {
        return Promise.resolve({
          status: successfulClientVersionCheckHttpStatusCode,
          json: jest.fn(),
        } as unknown as Response);
      }),
    } as unknown as KyInstance;

    await runClientVersionCheck({ky: kyInstance, clientVersion, setDoesApplicationNeedForceReload});

    expect(kyInstance.get).toHaveBeenCalledTimes(1);
    expect(kyInstance.get).toHaveBeenCalledWith('/client-version-check', {
      headers: {
        'Wire-Client-Version': clientVersion,
      },
      throwHttpErrors: false,
    });
    expect(setDoesApplicationNeedForceReload).toHaveBeenCalledTimes(1);
    expect(setDoesApplicationNeedForceReload).toHaveBeenNthCalledWith(1, false);
  });

  it('sets force reload status to true when backend requires upgrade', async () => {
    const setDoesApplicationNeedForceReload = jest.fn();
    const kyInstance = {
      get: jest.fn(() => {
        return Promise.resolve({
          status: upgradeRequiredHttpStatusCode,
          json: jest.fn(() => {
            return Promise.resolve({action: reloadClientVersionCheckAction});
          }),
        } as unknown as Response);
      }),
    } as unknown as KyInstance;

    await runClientVersionCheck({
      ky: kyInstance,
      clientVersion: '2026.02.12.17.51.00',
      setDoesApplicationNeedForceReload,
    });

    expect(setDoesApplicationNeedForceReload).toHaveBeenCalledTimes(1);
    expect(setDoesApplicationNeedForceReload).toHaveBeenCalledWith(true);
  });
});
