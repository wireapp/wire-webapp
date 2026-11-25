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
 */

import {Maybe, Result} from 'true-myth';

import type {ApplicationLogDownload} from './applicationLogDownload';
import {selectApplicationLogDownload} from './selectApplicationLogDownload';

describe('application log download selection', () => {
  it('selects the native export capability in Desktop', async () => {
    const nativeDownload = jest.fn(async () => {
      return 'saved' as const;
    });
    const readDesktopCapability = jest.fn(() => {
      return {version: 1 as const, download: nativeDownload};
    });
    const browserDownload = jest.fn<ReturnType<ApplicationLogDownload>, []>();
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.just(browserDownload),
      readDesktopCapability,
    });

    expect(readDesktopCapability).toHaveBeenCalledTimes(1);
    expect(selectedDownload.isJust).toBe(true);
    const download = selectedDownload.unwrapOrElse(() => {
      throw new Error('Expected Desktop to expose log export');
    });
    await expect(download()).resolves.toEqual(Result.ok('saved'));
    expect(nativeDownload).toHaveBeenCalledTimes(1);
    expect(browserDownload).not.toHaveBeenCalled();
  });

  it('does not read the Desktop capability in a browser', () => {
    const browserDownload = jest.fn<ReturnType<ApplicationLogDownload>, []>();
    const readDesktopCapability = jest.fn(() => {
      throw new Error('Desktop capability must not be read in a browser');
    });

    const selectedDownload = selectApplicationLogDownload({
      isElectron: false,
      browserDownload: Maybe.just(browserDownload),
      readDesktopCapability,
    });

    expect(selectedDownload).toEqual(Maybe.just(browserDownload));
    expect(readDesktopCapability).not.toHaveBeenCalled();
  });

  it.each([undefined, null, {}, {version: 2, download: jest.fn()}, {version: 1, download: 'not callable'}])(
    'hides the Desktop settings action for an invalid capability: %p',
    capability => {
      const browserDownload = jest.fn<ReturnType<ApplicationLogDownload>, []>();
      const selectedDownload = selectApplicationLogDownload({
        isElectron: true,
        browserDownload: Maybe.just(browserDownload),
        readDesktopCapability() {
          return capability;
        },
      });

      expect(selectedDownload).toEqual(Maybe.nothing());
    },
  );

  it('rejects unsupported versions before reading the download getter', () => {
    const readDownload = jest.fn();
    const desktopCapability = Object.defineProperty({version: 2}, 'download', {get: readDownload});
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        return desktopCapability;
      },
    });

    expect(selectedDownload).toEqual(Maybe.nothing());
    expect(readDownload).not.toHaveBeenCalled();
  });

  it('hides the Desktop settings action when reading the capability throws', () => {
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        throw new Error('Capability access denied');
      },
    });

    expect(selectedDownload).toEqual(Maybe.nothing());
  });

  it.each([
    Object.setPrototypeOf({download: jest.fn()}, {version: 1}),
    Object.setPrototypeOf({version: 1}, {download: jest.fn()}),
  ])('hides the Desktop settings action when a capability field is inherited', capability => {
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        return capability;
      },
    });

    expect(selectedDownload).toEqual(Maybe.nothing());
  });

  it('hides the Desktop settings action when the capability download getter throws', () => {
    const desktopCapability = Object.defineProperty({version: 1}, 'download', {
      get() {
        throw new Error('Capability download access denied');
      },
    });
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        return desktopCapability;
      },
    });

    expect(selectedDownload).toEqual(Maybe.nothing());
  });

  it('reads the capability download getter once and preserves its receiver', async () => {
    let downloadGetterReadCount = 0;
    const desktopCapabilityReceiver = {version: 1 as const};
    const nativeDownload = jest.fn(function (this: typeof desktopCapabilityReceiver): Promise<'saved'> {
      expect(this).toBe(desktopCapabilityReceiver);

      return Promise.resolve('saved');
    });
    Object.defineProperty(desktopCapabilityReceiver, 'download', {
      get() {
        downloadGetterReadCount += 1;

        return nativeDownload;
      },
    });
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        return desktopCapabilityReceiver;
      },
    });
    const download = selectedDownload.unwrapOrElse(() => {
      throw new Error('Expected Desktop to expose log export');
    });

    expect(downloadGetterReadCount).toBe(1);
    await expect(download()).resolves.toEqual(Result.ok('saved'));
    expect(downloadGetterReadCount).toBe(1);
    expect(nativeDownload).toHaveBeenCalledTimes(1);
  });

  it.each(['saved', 'cancelled'] as const)('preserves native outcome %s', async outcome => {
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        return {
          version: 1 as const,
          async download() {
            return outcome;
          },
        };
      },
    });
    const download = selectedDownload.unwrapOrElse(() => {
      throw new Error('Expected Desktop to expose log export');
    });

    await expect(download()).resolves.toEqual(Result.ok(outcome));
  });

  it.each([undefined, 'unexpected', 'failed'])(
    'maps malformed or failed native replies to failure: %p',
    async outcome => {
      const selectedDownload = selectApplicationLogDownload({
        isElectron: true,
        browserDownload: Maybe.nothing(),
        readDesktopCapability() {
          return {
            version: 1 as const,
            async download() {
              return outcome;
            },
          };
        },
      });
      const download = selectedDownload.unwrapOrElse(() => {
        throw new Error('Expected Desktop to expose log export');
      });

      await expect(download()).resolves.toEqual(Result.err('failed'));
    },
  );

  it('maps rejected native replies to failure', async () => {
    const selectedDownload = selectApplicationLogDownload({
      isElectron: true,
      browserDownload: Maybe.nothing(),
      readDesktopCapability() {
        return {
          version: 1 as const,
          async download() {
            throw new Error('IPC rejected');
          },
        };
      },
    });
    const download = selectedDownload.unwrapOrElse(() => {
      throw new Error('Expected Desktop to expose log export');
    });

    await expect(download()).resolves.toEqual(Result.err('failed'));
  });
});
