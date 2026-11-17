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

import {isFunction} from '@sindresorhus/is';
import {jspi} from 'wasm-feature-detect';

export type CoreCryptoBrowserEnvironment = {
  readonly storageManager?: {readonly getDirectory?: unknown};
  readonly workerConstructor?: unknown;
};

export type CoreCryptoBrowserFeature = 'JS Promise Integration' | 'Origin Private File System' | 'Web Workers';

export type CoreCryptoSupport = {
  readonly missingFeatures: readonly CoreCryptoBrowserFeature[];
};

export const isCoreCryptoEnabled = ({
  supportsMls,
  useCoreCryptoOverride,
}: {
  supportsMls: boolean;
  useCoreCryptoOverride: boolean;
}): boolean => {
  return supportsMls || useCoreCryptoOverride;
};

/** Detect requirements without importing CoreCrypto: its bindings throw at module evaluation without JSPI. */
export async function detectCoreCryptoSupport({
  coreCryptoEnabled,
  detectJspi = jspi,
  environment = {
    storageManager: globalThis.navigator?.storage,
    workerConstructor: globalThis.Worker,
  },
}: {
  readonly coreCryptoEnabled: boolean;
  readonly detectJspi?: () => Promise<boolean>;
  readonly environment?: CoreCryptoBrowserEnvironment;
}): Promise<CoreCryptoSupport> {
  const missingFeatures: CoreCryptoBrowserFeature[] = [];
  // JSPI is required even with MLS disabled: the application statically imports the bindings.
  if (
    !(await detectJspi().catch(() => {
      return false;
    }))
  ) {
    missingFeatures.push('JS Promise Integration');
  }
  if (coreCryptoEnabled) {
    if (!isFunction(environment.storageManager?.getDirectory)) {
      missingFeatures.push('Origin Private File System');
    }
    if (!isFunction(environment.workerConstructor)) {
      missingFeatures.push('Web Workers');
    }
  }
  return {missingFeatures};
}
