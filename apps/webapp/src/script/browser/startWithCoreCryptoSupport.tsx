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

import {isNull} from '@sindresorhus/is';
import {createRoot} from 'react-dom/client';

import {detectCoreCryptoSupport, isCoreCryptoEnabled, type CoreCryptoSupport} from './coreCryptoSupport';
import {CoreCryptoSupportContext} from './coreCryptoSupportContext';
import {CoreCryptoUpgradeModal} from './coreCryptoUpgradeModal';

import {Runtime} from '../commons/util/Runtime';
import {Config} from '../Config';
import {setAppLocale} from '../localization/Localizer';
import {translate, type Translate} from '../util/localizerUtil';
import {supportsMLS} from '../util/util';

type CoreCryptoStartupDependencies = {
  readonly detectSupport: () => Promise<CoreCryptoSupport>;
  readonly isDesktopApp: () => boolean;
  readonly initializeLocale: () => void;
  readonly translate: Translate;
};

const defaultDependencies: CoreCryptoStartupDependencies = {
  detectSupport() {
    return detectCoreCryptoSupport({
      coreCryptoEnabled: isCoreCryptoEnabled({
        supportsMls: supportsMLS(),
        useCoreCryptoOverride: Config.getConfig().FEATURE.USE_CORE_CRYPTO,
      }),
    });
  },
  isDesktopApp: Runtime.isDesktopApp,
  initializeLocale: setAppLocale,
  translate,
};

/** Keep application imports inside start: CoreCrypto throws during module evaluation without JSPI. */
export async function startWithCoreCryptoSupport(
  containerId: string,
  start: () => Promise<void>,
  dependencies: CoreCryptoStartupDependencies = defaultDependencies,
): Promise<void> {
  const support = await dependencies.detectSupport();
  if (support.missingFeatures.length === 0) {
    await start();
    return;
  }

  const appContainer = document.getElementById(containerId);
  if (isNull(appContainer)) {
    throw new Error(`No container '${containerId}' found to render upgrade instructions`);
  }
  dependencies.initializeLocale();
  createRoot(appContainer).render(
    <CoreCryptoSupportContext.Provider
      value={{support, isDesktopApp: dependencies.isDesktopApp(), translate: dependencies.translate}}
    >
      <CoreCryptoUpgradeModal />
    </CoreCryptoSupportContext.Provider>,
  );
}
