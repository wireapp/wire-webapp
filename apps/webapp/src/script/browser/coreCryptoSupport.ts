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

export type CoreCryptoCapabilities = {
  readonly supportsJspi: boolean;
  readonly supportsOpfs: boolean;
  readonly supportsWebWorkers: boolean;
  readonly coreCryptoEnabled: boolean;
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

/** Evaluate requirements without probing the browser or importing CoreCrypto. */
export function getCoreCryptoSupport({
  supportsJspi,
  supportsOpfs,
  supportsWebWorkers,
  coreCryptoEnabled,
}: CoreCryptoCapabilities): CoreCryptoSupport {
  const missingFeatures: CoreCryptoBrowserFeature[] = [];
  // JSPI is required even with MLS disabled: the application statically imports the bindings.
  if (!supportsJspi) {
    missingFeatures.push('JS Promise Integration');
  }
  if (coreCryptoEnabled && !supportsOpfs) {
    missingFeatures.push('Origin Private File System');
  }
  if (coreCryptoEnabled && !supportsWebWorkers) {
    missingFeatures.push('Web Workers');
  }
  return {missingFeatures};
}
