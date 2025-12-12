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

// Polyfill "Object.entries" & "Object.values"
import 'core-js/full/object';
import 'core-js/full/reflect';

// eslint-disable-next-line import/order
import {FC} from 'react';

import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {initializeDataDog} from 'Util/DataDog';
import {enableLogging} from 'Util/LoggerUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import './configureEnvironment';
import {configureStore} from './configureStore';
import {actionRoot} from './module/action';
import {Root} from './page/Root';

import {Config} from '../Config';
import {updateApiVersion} from '../lifecycle/updateRemoteConfigs';
import {setAppLocale} from '../localization/Localizer';
import {APIClient} from '../service/APIClientSingleton';
import {Core} from '../service/CoreSingleton';

exposeWrapperGlobals();

const mainId = 'main';

const apiClient = container.resolve(APIClient);
const core = container.resolve(Core);

let localStorage;
try {
  localStorage = window.localStorage;
} catch (error) {}

const store = configureStore({
  actions: actionRoot,
  apiClient,
  core,
  getConfig: Config.getConfig,
  localStorage,
});

const render = (Component: FC): void => {
  const container = document.getElementById(mainId);
  if (!container) {
    throw new Error(`No container '${mainId}' found to render application`);
  }
  createRoot(container).render(
    <Provider store={store}>
      <Component />
    </Provider>,
  );
};

const config = Config.getConfig();

async function runApp() {
  const {domain} = await updateApiVersion();
  await initializeDataDog(config, {domain: domain});

  render(Root);
  setAppLocale();
  if (module.hot) {
    module.hot.accept('./page/Root', () => {
      render(require('./page/Root').Root);
    });
  }
}

enableLogging(config);

const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();

if (enforceDesktopApplication) {
  const unSupportedPageUrl = `${window.location.origin}/unsupported`;
  window.location.replace(unSupportedPageUrl);
}

runApp();
