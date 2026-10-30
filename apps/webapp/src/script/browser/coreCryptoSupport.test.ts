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

import {CoreCryptoBrowserEnvironment, getMissingCoreCryptoBrowserFeatures, isCoreCryptoUsed} from './coreCryptoSupport';

const supportedEnvironment: CoreCryptoBrowserEnvironment = {
  webAssembly: {Suspending: noop, promising: noop},
  storageManager: {getDirectory: noop},
  workerConstructor: noop,
};

const chromeUserAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const desktopAppUserAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Wire/3.40.0 Chrome/138.0.0.0 Electron/37.2.0 Safari/537.36';

describe('getMissingCoreCryptoBrowserFeatures', () => {
  it('reports nothing when every feature is available', () => {
    expect(getMissingCoreCryptoBrowserFeatures(supportedEnvironment)).toEqual([]);
  });

  it('reports JS Promise Integration when WebAssembly cannot suspend', () => {
    expect(getMissingCoreCryptoBrowserFeatures({...supportedEnvironment, webAssembly: {promising: noop}})).toEqual([
      'JS Promise Integration',
    ]);
    expect(getMissingCoreCryptoBrowserFeatures({...supportedEnvironment, webAssembly: {Suspending: noop}})).toEqual([
      'JS Promise Integration',
    ]);
  });

  it('reports the Origin Private File System when storage is unavailable, as in insecure contexts', () => {
    expect(getMissingCoreCryptoBrowserFeatures({...supportedEnvironment, storageManager: undefined})).toEqual([
      'Origin Private File System',
    ]);
  });

  it('reports Web Workers when workers are unavailable', () => {
    expect(getMissingCoreCryptoBrowserFeatures({...supportedEnvironment, workerConstructor: undefined})).toEqual([
      'Web Workers',
    ]);
  });

  it('treats non-function members as missing', () => {
    expect(
      getMissingCoreCryptoBrowserFeatures({
        webAssembly: {Suspending: true, promising: true},
        storageManager: {getDirectory: 'getDirectory'},
        workerConstructor: {},
      }),
    ).toEqual(['JS Promise Integration', 'Origin Private File System', 'Web Workers']);
  });

  it('reports every feature when nothing is available', () => {
    expect(
      getMissingCoreCryptoBrowserFeatures({webAssembly: undefined, storageManager: null, workerConstructor: undefined}),
    ).toEqual(['JS Promise Integration', 'Origin Private File System', 'Web Workers']);
  });
});

describe('isCoreCryptoUsed', () => {
  it('uses CoreCrypto in browsers', () => {
    expect(isCoreCryptoUsed({userAgent: chromeUserAgent, hasSystemCrypto: false})).toBe(true);
  });

  it('uses CoreCrypto in desktop apps that provide system crypto', () => {
    expect(isCoreCryptoUsed({userAgent: desktopAppUserAgent, hasSystemCrypto: true})).toBe(true);
  });

  it('does not use CoreCrypto in old desktop apps without system crypto', () => {
    expect(isCoreCryptoUsed({userAgent: desktopAppUserAgent, hasSystemCrypto: false})).toBe(false);
  });
});
