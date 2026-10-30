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

/*
 * This file is bundled into `checkBrowser.js`, which runs before the application.
 * Keep its imports minimal so that the browser check stays small.
 */

export type CoreCryptoBrowserEnvironment = {
  /** `globalThis.WebAssembly` */
  readonly webAssembly: unknown;
  /** `navigator.storage`, which is only available in secure contexts */
  readonly storageManager: unknown;
  /** `globalThis.Worker` */
  readonly workerConstructor: unknown;
};

export type CoreCryptoBrowserFeature = 'JS Promise Integration' | 'Origin Private File System' | 'Web Workers';

const hasMethod = (target: unknown, methodName: string): boolean => {
  return typeof target === 'object' && target !== null && typeof Reflect.get(target, methodName) === 'function';
};

/**
 * Lists the browser features CoreCrypto needs that the given environment lacks.
 *
 * CoreCrypto keeps its keystore in SQLite on the Origin Private File System. Synchronous OPFS access is
 * only possible in a worker, and CoreCrypto waits on that worker via JS Promise Integration (JSPI).
 */
export const getMissingCoreCryptoBrowserFeatures = ({
  webAssembly,
  storageManager,
  workerConstructor,
}: CoreCryptoBrowserEnvironment): readonly CoreCryptoBrowserFeature[] => {
  const missingFeatures: CoreCryptoBrowserFeature[] = [];

  if (!hasMethod(webAssembly, 'Suspending') || !hasMethod(webAssembly, 'promising')) {
    missingFeatures.push('JS Promise Integration');
  }
  if (!hasMethod(storageManager, 'getDirectory')) {
    missingFeatures.push('Origin Private File System');
  }
  if (typeof workerConstructor !== 'function') {
    missingFeatures.push('Web Workers');
  }

  return missingFeatures;
};

export type CoreCryptoUsageEnvironment = {
  readonly userAgent: string;
  readonly hasSystemCrypto: boolean;
};

/**
 * Whether the application will run CoreCrypto in this environment.
 *
 * Mirrors `supportsMLS` in `Util/util`: old desktop clients without system crypto run without CoreCrypto.
 * Those clients can still force CoreCrypto on with the `USE_CORE_CRYPTO` feature flag, which this check
 * cannot read without pulling the application config into the browser check.
 */
export const isCoreCryptoUsed = ({userAgent, hasSystemCrypto}: CoreCryptoUsageEnvironment): boolean => {
  const lowerCaseUserAgent = userAgent.toLowerCase();
  const isDesktopApp = lowerCaseUserAgent.includes('electron') && lowerCaseUserAgent.includes('wire');
  return !isDesktopApp || hasSystemCrypto;
};
