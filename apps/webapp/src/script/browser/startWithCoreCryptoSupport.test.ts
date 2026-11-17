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

import type {CoreCryptoSupport} from './coreCryptoSupport';
import {startWithCoreCryptoSupport} from './startWithCoreCryptoSupport';

describe('startWithCoreCryptoSupport', () => {
  it('waits for detection and starts with the detected capabilities without loading the upgrade UI', async () => {
    const probe = Promise.withResolvers<CoreCryptoSupport>();
    const support: CoreCryptoSupport = {missingFeatures: []};
    const start = jest.fn(async () => {
      return undefined;
    });
    const showUnsupported = jest.fn(async () => {
      throw new Error('Upgrade UI must not be loaded');
    });
    const starting = startWithCoreCryptoSupport({
      detectSupport: () => {
        return probe.promise;
      },
      start,
      showUnsupported,
    });
    expect(start).not.toHaveBeenCalled();
    expect(showUnsupported).not.toHaveBeenCalled();
    probe.resolve(support);
    await starting;
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(support);
    expect(showUnsupported).not.toHaveBeenCalled();
  });

  it('shows unsupported capabilities without importing the application and waits for the upgrade UI', async () => {
    const support: CoreCryptoSupport = {missingFeatures: ['JS Promise Integration']};
    const shown = Promise.withResolvers<void>();
    const start = jest.fn(async () => {
      throw new Error('CoreCrypto must not be imported');
    });
    const showUnsupported = jest.fn(() => {
      return shown.promise;
    });
    let completed = false;
    const starting = startWithCoreCryptoSupport({
      detectSupport: async () => {
        return support;
      },
      start,
      showUnsupported,
    }).then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(showUnsupported).toHaveBeenCalledTimes(1);
    expect(showUnsupported).toHaveBeenCalledWith(support);
    expect(start).not.toHaveBeenCalled();
    expect(completed).toBe(false);
    shown.resolve();
    await starting;
    expect(completed).toBe(true);
  });

  it('does not start the application when detection fails', async () => {
    const error = new Error('Detection failed');
    const start = jest.fn();
    const showUnsupported = jest.fn();
    await expect(
      startWithCoreCryptoSupport({
        detectSupport: async () => {
          throw error;
        },
        start,
        showUnsupported,
      }),
    ).rejects.toBe(error);
    expect(start).not.toHaveBeenCalled();
    expect(showUnsupported).not.toHaveBeenCalled();
  });
});
