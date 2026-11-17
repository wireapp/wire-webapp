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

import {noop} from 'noop-esm';

import {detectCoreCryptoSupport, isCoreCryptoEnabled} from './coreCryptoSupport';

const environment = {storageManager: {getDirectory: noop}, workerConstructor: noop};

describe('detectCoreCryptoSupport', () => {
  it('allows supported clients to start', async () => {
    await expect(
      detectCoreCryptoSupport({
        coreCryptoEnabled: true,
        environment,
        detectJspi: async () => {
          return true;
        },
      }),
    ).resolves.toEqual({missingFeatures: []});
  });

  it.each([true, false])(
    'requires JSPI even when CoreCrypto enabled is %s because its module is imported',
    async coreCryptoEnabled => {
      await expect(
        detectCoreCryptoSupport({
          coreCryptoEnabled,
          environment,
          detectJspi: async () => {
            return false;
          },
        }),
      ).resolves.toEqual({missingFeatures: ['JS Promise Integration']});
    },
  );

  it('treats a failed feature probe as unsupported', async () => {
    await expect(
      detectCoreCryptoSupport({
        coreCryptoEnabled: true,
        environment,
        detectJspi: async () => {
          throw new Error('No WASM');
        },
      }),
    ).resolves.toEqual({missingFeatures: ['JS Promise Integration']});
  });

  it('reports missing storage and workers for CoreCrypto', async () => {
    await expect(
      detectCoreCryptoSupport({
        coreCryptoEnabled: true,
        environment: {},
        detectJspi: async () => {
          return true;
        },
      }),
    ).resolves.toEqual({missingFeatures: ['Origin Private File System', 'Web Workers']});
  });

  it('does not require storage or workers when CoreCrypto is disabled', async () => {
    await expect(
      detectCoreCryptoSupport({
        coreCryptoEnabled: false,
        environment: {},
        detectJspi: async () => {
          return true;
        },
      }),
    ).resolves.toEqual({missingFeatures: []});
  });
});

describe('isCoreCryptoEnabled', () => {
  it.each([
    {supportsMls: true, useCoreCryptoOverride: false, expected: true},
    {supportsMls: false, useCoreCryptoOverride: false, expected: false},
    {supportsMls: false, useCoreCryptoOverride: true, expected: true},
  ])(
    'returns $expected for MLS support $supportsMls and override $useCoreCryptoOverride',
    ({supportsMls, useCoreCryptoOverride, expected}) => {
      expect(isCoreCryptoEnabled({supportsMls, useCoreCryptoOverride})).toBe(expected);
    },
  );
});
