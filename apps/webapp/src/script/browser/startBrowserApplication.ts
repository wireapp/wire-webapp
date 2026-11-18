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

import {getCoreCryptoSupport, isCoreCryptoEnabled, type CoreCryptoSupport} from './coreCryptoSupport';
import {startWithCoreCryptoSupport} from './startWithCoreCryptoSupport';
import {supportsMLS} from './supportsMls';

import {Runtime} from '../commons/util/Runtime';
import {Config} from '../Config';

/** Compose the preflight without eagerly importing React, localization, or application modules. */
export async function startBrowserApplication(
  containerId: string,
  start: (support: CoreCryptoSupport) => Promise<void>,
): Promise<void> {
  await startWithCoreCryptoSupport({
    async detectSupport() {
      let supportsJspi: boolean;
      try {
        supportsJspi = await jspi();
      } catch (error) {
        console.error('JSPI feature detection failed', error);
        // Boundary policy: fail closed and show upgrade instructions if probing fails unexpectedly.
        supportsJspi = false;
      }
      return getCoreCryptoSupport({
        supportsJspi,
        supportsOpfs: isFunction(globalThis.navigator?.storage?.getDirectory),
        supportsWebWorkers: isFunction(globalThis.Worker),
        coreCryptoEnabled: isCoreCryptoEnabled({
          supportsMls: supportsMLS(),
          useCoreCryptoOverride: Config.getConfig().FEATURE.USE_CORE_CRYPTO,
        }),
      });
    },
    start,
    async showUnsupported(support) {
      console.error(
        `Wire startup blocked: missing required browser capabilities: ${support.missingFeatures.join(', ')}.`,
      );
      const {showCoreCryptoUpgrade} = await import('./showCoreCryptoUpgrade');
      showCoreCryptoUpgrade({containerId, support, isDesktopApp: Runtime.isDesktopApp()});
    },
  });
}
