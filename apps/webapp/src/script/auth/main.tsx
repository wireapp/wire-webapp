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

import {createClock} from '@enormora/clock/clock';
import type {Clock} from '@enormora/clock/clock';
import {isNull} from '@sindresorhus/is';
// Polyfill "Object.entries" & "Object.values"
import 'core-js/full/object';
import 'core-js/full/reflect';

// eslint-disable-next-line import/order
import {FunctionComponent} from 'react';

import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {initializeDataDog} from 'Util/dataDog';
import {translate} from 'Util/localizerUtil';
import type {Translate} from 'Util/localizerUtil';
import {enableLogging} from 'Util/loggerUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import './configureEnvironment';
import {configureStore} from './configureStore';
import {actionRoot} from './module/action';
import {Root} from './page/root';

import {Config} from '../Config';
import {retireLegacyServiceWorker} from '../lifecycle/retireLegacyServiceWorker';
import {updateApiVersion} from '../lifecycle/updateRemoteConfigs';
import {setAppLocale} from '../localization/Localizer';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';

type AuthAppProps = {clock: Clock; translate: Translate};

retireLegacyServiceWorker({
  serviceWorkerContainer: Maybe.of(navigator.serviceWorker),
  cacheStorage: Maybe.of(window.caches),
  origin: window.location.origin,
}).catch((error: unknown) => {
  console.warn('Legacy service worker cleanup failed; continuing application startup.', error);
});

exposeWrapperGlobals();

const mainId = 'main';

const clock = createClock();
const apiClient = new APIClient({clock});
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

const config = Config.getConfig();

async function runApp(): Promise<void> {
  const {domain} = await updateApiVersion();
  await initializeDataDog(config, {domain: domain});
  render(Root);
  setAppLocale();
}

enableLogging(config);

const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();

if (enforceDesktopApplication) {
  const unSupportedPageUrl = `${window.location.origin}/unsupported`;
  window.location.replace(unSupportedPageUrl);
}

void runApp();
