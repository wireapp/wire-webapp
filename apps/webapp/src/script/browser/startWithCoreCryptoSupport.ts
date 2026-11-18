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

import {isEmptyArray} from '@sindresorhus/is';

import type {CoreCryptoSupport} from './coreCryptoSupport';

type CoreCryptoStartupDependencies = {
  readonly detectSupport: () => Promise<CoreCryptoSupport>;
  readonly start: (support: CoreCryptoSupport) => Promise<void>;
  readonly showUnsupported: (support: CoreCryptoSupport) => Promise<void>;
};

/** Keep application imports inside start: CoreCrypto throws during module evaluation without JSPI. */
export async function startWithCoreCryptoSupport({
  detectSupport,
  start,
  showUnsupported,
}: CoreCryptoStartupDependencies): Promise<void> {
  const support = await detectSupport();
  if (isEmptyArray(support.missingFeatures)) {
    await start(support);
    return;
  }
  await showUnsupported(support);
}
