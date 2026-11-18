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

import {
  getCoreCryptoSupport,
  isCoreCryptoEnabled,
  type CoreCryptoCapabilities,
  type CoreCryptoBrowserFeature,
} from './coreCryptoSupport';

type SupportScenario = {
  readonly name: string;
  readonly capabilities: CoreCryptoCapabilities;
  readonly missingFeatures: readonly CoreCryptoBrowserFeature[];
};

const scenarios: readonly SupportScenario[] = [
  {
    name: 'supports all requirements',
    capabilities: {supportsJspi: true, supportsOpfs: true, supportsWebWorkers: true, coreCryptoEnabled: true},
    missingFeatures: [],
  },
  {
    name: 'requires JSPI when CoreCrypto is enabled',
    capabilities: {supportsJspi: false, supportsOpfs: true, supportsWebWorkers: true, coreCryptoEnabled: true},
    missingFeatures: ['JS Promise Integration'],
  },
  {
    name: 'requires OPFS when CoreCrypto is enabled',
    capabilities: {supportsJspi: true, supportsOpfs: false, supportsWebWorkers: true, coreCryptoEnabled: true},
    missingFeatures: ['Origin Private File System'],
  },
  {
    name: 'requires workers when CoreCrypto is enabled',
    capabilities: {supportsJspi: true, supportsOpfs: true, supportsWebWorkers: false, coreCryptoEnabled: true},
    missingFeatures: ['Web Workers'],
  },
  {
    name: 'reports all missing requirements together',
    capabilities: {supportsJspi: false, supportsOpfs: false, supportsWebWorkers: false, coreCryptoEnabled: true},
    missingFeatures: ['JS Promise Integration', 'Origin Private File System', 'Web Workers'],
  },
  {
    name: 'does not require OPFS or workers when CoreCrypto is disabled',
    capabilities: {supportsJspi: true, supportsOpfs: false, supportsWebWorkers: false, coreCryptoEnabled: false},
    missingFeatures: [],
  },
  {
    name: 'still requires JSPI when CoreCrypto is disabled because the bindings are imported',
    capabilities: {supportsJspi: false, supportsOpfs: false, supportsWebWorkers: false, coreCryptoEnabled: false},
    missingFeatures: ['JS Promise Integration'],
  },
];

describe('getCoreCryptoSupport', () => {
  it.each(scenarios)('$name', ({capabilities, missingFeatures}) => {
    expect(getCoreCryptoSupport(capabilities)).toEqual({missingFeatures});
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
