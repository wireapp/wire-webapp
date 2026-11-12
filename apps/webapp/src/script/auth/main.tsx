/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {FunctionComponent} from 'react';

import {createClock} from '@enormora/clock/clock';
import type {Clock} from '@enormora/clock/clock';
import {isNull} from '@sindresorhus/is';
// Polyfill "Object.entries" & "Object.values"
import 'core-js/full/object';
import 'core-js/full/reflect';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import './configureEnvironment';
import {configureStore} from './configureStore';
import {actionRoot} from './module/action';
import {Root} from './page/root';

import {
  getCurrentCoreCryptoBrowserEnvironment,
  isCoreCryptoEnabled,
  redirectIfCoreCryptoUnsupported,
} from '../browser/coreCryptoSupport';
import {Runtime} from '../commons/util/Runtime';
import {Config} from '../Config';
import {retireLegacyServiceWorker} from '../lifecycle/retireLegacyServiceWorker';
import {updateApiVersion} from '../lifecycle/updateRemoteConfigs';
import {setAppLocale} from '../localization/Localizer';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';
import {initializeDataDog} from '../util/dataDog';
import {translate} from '../util/localizerUtil';
import type {Translate} from '../util/localizerUtil';
import {enableLogging} from '../util/loggerUtil';
import {supportsMLS} from '../util/util';
import {exposeWrapperGlobals} from '../util/wrapper';

type AuthAppProps = {clock: Clock; translate: Translate};

retireLegacyServiceWorker({
  serviceWorkerContainer: Maybe.of(navigator.serviceWorker),
  cacheStorage: Maybe.of(window.caches),
  origin: window.location.origin,
}).catch((error: unknown) => {
  console.warn('Legacy service worker cleanup failed; continuing application startup.', error);
});

const mainId = 'main';

const startAuthApp = (): void => {
  exposeWrapperGlobals();
  const config = Config.getConfig();
  enableLogging(config);

  const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();
  if (enforceDesktopApplication) {
    window.location.replace(`${window.location.origin}/unsupported`);
    return;
  }

  const coreCryptoEnabled = isCoreCryptoEnabled({
    supportsMls: supportsMLS(),
    useCoreCryptoOverride: config.FEATURE.USE_CORE_CRYPTO,
  });
  const redirectedForCoreCryptoSupport = redirectIfCoreCryptoUnsupported({
    coreCryptoEnabled,
    environment: getCurrentCoreCryptoBrowserEnvironment(),
    onUnsupported(message) {
      console.error(message);
      window.location.replace(`${window.location.origin}/unsupported`);
    },
  });
  if (redirectedForCoreCryptoSupport) {
    return;
  }

  const clock = createClock();
  const apiClient = new APIClient({clock});
  function disposeAuthenticationClient(): void {
    apiClient.dispose();
  }

  globalThis.addEventListener('unload', disposeAuthenticationClient);
  container.registerInstance(APIClient, apiClient);
  const core = container.resolve(Core);

  let localStorage;
  try {
    localStorage = window.localStorage;
  } catch {
    // ignore error
  }

  const store = configureStore({
    clock,
    actions: actionRoot,
    apiClient,
    core,
    getConfig: Config.getConfig,
    localStorage,
  });

  const render = (Component: FunctionComponent<AuthAppProps>): void => {
    const container = document.getElementById(mainId);
    if (isNull(container)) {
      throw new Error(`No container '${mainId}' found to render application`);
    }
    createRoot(container).render(
      <Provider store={store}>
        <Component translate={translate} clock={clock} />
      </Provider>,
    );
  };

  const runApp = async (): Promise<void> => {
    const {domain} = await updateApiVersion();
    await initializeDataDog(config, {domain});
    render(Root);
    setAppLocale();
  };

  void runApp();
};

startAuthApp();
