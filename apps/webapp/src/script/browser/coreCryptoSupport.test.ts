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

import {
  type CoreCryptoBrowserEnvironment,
  getMissingCoreCryptoBrowserFeatures,
  isCoreCryptoEnabled,
  redirectIfCoreCryptoUnsupported,
} from './coreCryptoSupport';

const supportedEnvironment: CoreCryptoBrowserEnvironment = {
  webAssembly: {Suspending: noop, promising: noop},
  storageManager: {getDirectory: noop},
  workerConstructor: noop,
};

describe('getMissingCoreCryptoBrowserFeatures', () => {
  it('accepts an environment with JSPI, OPFS, and Web Workers', () => {
    expect(getMissingCoreCryptoBrowserFeatures(supportedEnvironment)).toEqual([]);
  });

  it.each([
    {
      environment: {...supportedEnvironment, webAssembly: {promising: noop}},
      missingFeature: 'JS Promise Integration',
    },
    {
      environment: {...supportedEnvironment, storageManager: undefined},
      missingFeature: 'Origin Private File System',
    },
    {
      environment: {...supportedEnvironment, workerConstructor: undefined},
      missingFeature: 'Web Workers',
    },
  ] as const)('reports $missingFeature when it is unavailable', ({environment, missingFeature}) => {
    expect(getMissingCoreCryptoBrowserFeatures(environment)).toEqual([missingFeature]);
  });

  it('requires both JSPI functions and rejects non-function feature members', () => {
    expect(
      getMissingCoreCryptoBrowserFeatures({
        webAssembly: {Suspending: true, promising: true},
        storageManager: {getDirectory: 'getDirectory'},
        workerConstructor: {},
      }),
    ).toEqual(['JS Promise Integration', 'Origin Private File System', 'Web Workers']);
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

describe('redirectIfCoreCryptoUnsupported', () => {
  it('does not redirect an old desktop client when CoreCrypto remains disabled', () => {
    const onUnsupported = jest.fn();

    const redirected = redirectIfCoreCryptoUnsupported({
      coreCryptoEnabled: false,
      environment: {},
      onUnsupported,
    });

    expect(redirected).toBe(false);
    expect(onUnsupported).not.toHaveBeenCalled();
  });

  it('does not redirect when every required feature is available', () => {
    const onUnsupported = jest.fn();

    const redirected = redirectIfCoreCryptoUnsupported({
      coreCryptoEnabled: true,
      environment: supportedEnvironment,
      onUnsupported,
    });

    expect(redirected).toBe(false);
    expect(onUnsupported).not.toHaveBeenCalled();
  });

  it('reports missing features and redirects when CoreCrypto is enabled', () => {
    const onUnsupported = jest.fn();

    const redirected = redirectIfCoreCryptoUnsupported({
      coreCryptoEnabled: true,
      environment: {},
      onUnsupported,
    });

    expect(redirected).toBe(true);
    expect(onUnsupported).toHaveBeenCalledWith(
      'This browser cannot run CoreCrypto because it lacks: JS Promise Integration, Origin Private File System, Web Workers.',
    );
  });
});
