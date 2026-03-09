/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

// eslint-disable-next-line import/order
import 'core-js/full/reflect';

// eslint-disable-next-line import/order
import {ClientType} from '@wireapp/api-client/lib/client/';

import {createRoot} from 'react-dom/client';

import {Runtime} from '@wireapp/commons';

import {AppContainer} from 'Components/AppContainer/AppContainer';
import {doSimpleRedirect} from 'Repositories/LifeCycleRepository/LifeCycleRepository';
import {StorageKey} from 'Repositories/storage';
import {enableLogging} from 'Util/LoggerUtil';
import {loadValue} from 'Util/StorageUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import {createApplicationServices} from './createApplicationServices';

import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {createWallClock} from '../clock/wallClock';
import {Config} from '../Config';
import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';
import {
  createBrowserWebSocketConnection,
  createManagedWebSocketConnection,
} from '../webSocketConnection/createManagedWebSocketConnection';
import {createNoopManagedWebSocketConnection} from '../webSocketConnection/createNoopManagedWebSocketConnection';

document.addEventListener('DOMContentLoaded', async () => {
  const config = Config.getConfig();

  enableLogging(config);
  exposeWrapperGlobals();

  const appContainer = document.getElementById('wire-app');

  if (!appContainer) {
    throw new Error('container for application does not exist in the DOM');
  }

  const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();

  if (enforceDesktopApplication) {
    const unSupportedPageUrl = `${window.location.origin}/unsupported`;
    window.location.replace(unSupportedPageUrl);
    return;
  }

  const shouldPersist = loadValue<boolean>(StorageKey.AUTH.PERSIST);

  if (shouldPersist === undefined) {
    return doSimpleRedirect(SIGN_OUT_REASON.NOT_SIGNED_IN);
  }

  const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(globalThis.location.search);
  const applicationServices = createApplicationServices({
    createWallClock,
    startupFeatureToggles,
    createEnabledManagedWebSocketConnection() {
      return createManagedWebSocketConnection({
        createWebSocketConnection: createBrowserWebSocketConnection,
      });
    },
    createDisabledManagedWebSocketConnection() {
      return createNoopManagedWebSocketConnection();
    },
  });
  const {isFeatureToggleEnabled} = startupFeatureToggles;
  const {wallClock, managedWebSocketConnection} = applicationServices;

  createRoot(appContainer).render(
    <AppContainer
      config={config}
      clientType={shouldPersist ? ClientType.PERMANENT : ClientType.TEMPORARY}
      isFeatureToggleEnabled={isFeatureToggleEnabled}
      managedWebSocketConnection={managedWebSocketConnection}
      wallClock={wallClock}
    />,
  );
});
