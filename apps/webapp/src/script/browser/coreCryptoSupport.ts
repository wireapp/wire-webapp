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

type JspiWebAssembly = {
  readonly Suspending?: unknown;
  readonly promising?: unknown;
};

type OpfsStorageManager = {
  readonly getDirectory?: unknown;
};

export type CoreCryptoBrowserEnvironment = {
  readonly webAssembly?: JspiWebAssembly;
  readonly storageManager?: OpfsStorageManager;
  readonly workerConstructor?: unknown;
};

export type CoreCryptoBrowserFeature = 'JS Promise Integration' | 'Origin Private File System' | 'Web Workers';

export const isCoreCryptoEnabled = ({
  supportsMls,
  useCoreCryptoOverride,
}: {
  supportsMls: boolean;
  useCoreCryptoOverride: boolean;
}): boolean => {
  return supportsMls || useCoreCryptoOverride;
};

/**
 * CoreCrypto 11 stores SQLite in OPFS. Its synchronous file access runs in a
 * worker, while JS Promise Integration lets WASM wait for that worker without
 * blocking the browser's main thread.
 */
export const getMissingCoreCryptoBrowserFeatures = ({
  webAssembly,
  storageManager,
  workerConstructor,
}: CoreCryptoBrowserEnvironment): readonly CoreCryptoBrowserFeature[] => {
  const missingFeatures: CoreCryptoBrowserFeature[] = [];

  if (typeof webAssembly?.Suspending !== 'function' || typeof webAssembly.promising !== 'function') {
    missingFeatures.push('JS Promise Integration');
  }
  if (typeof storageManager?.getDirectory !== 'function') {
    missingFeatures.push('Origin Private File System');
  }
  if (typeof workerConstructor !== 'function') {
    missingFeatures.push('Web Workers');
  }

  return missingFeatures;
};

export const getCurrentCoreCryptoBrowserEnvironment = (): CoreCryptoBrowserEnvironment => {
  return {
    webAssembly: globalThis.WebAssembly as unknown as JspiWebAssembly,
    storageManager: globalThis.navigator.storage as OpfsStorageManager,
    workerConstructor: globalThis.Worker,
  };
};

export const redirectIfCoreCryptoUnsupported = ({
  coreCryptoEnabled,
  environment,
  onUnsupported,
}: {
  coreCryptoEnabled: boolean;
  environment: CoreCryptoBrowserEnvironment;
  onUnsupported: (message: string) => void;
}): boolean => {
  if (!coreCryptoEnabled) {
    return false;
  }

  const missingFeatures = getMissingCoreCryptoBrowserFeatures(environment);
  if (missingFeatures.length === 0) {
    return false;
  }

  onUnsupported(`This browser cannot run CoreCrypto because it lacks: ${missingFeatures.join(', ')}.`);
  return true;
};
