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

import {createClock} from '@enormora/clock/clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
// eslint-disable-next-line import/order
import 'core-js/full/reflect';

// eslint-disable-next-line import/order
import {ClientType} from '@wireapp/api-client/lib/client/';

import {createRoot} from 'react-dom/client';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {AppContainer} from 'Components/appContainer/appContainer';
import {doSimpleRedirect} from 'Repositories/LifeCycleRepository/LifeCycleRepository';
import {StorageKey} from 'Repositories/storage';
import {translate} from 'Util/localizerUtil';
import {getLogger} from 'Util/logger';
import {enableLogging} from 'Util/loggerUtil';
import {loadValue} from 'Util/storageUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import {createApplicationServices} from './createApplicationServices';

import {SIGN_OUT_REASON} from '../auth/signOutReason';
import {Config} from '../Config';
import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';
import {createIncrementalHttpRetryBackoffReset} from '../lifecycle/createIncrementalHttpRetryBackoffReset';
import {createFetchLatestBuildMetadata} from '../lifecycle/newVersionHandler';
import {createApplicationObservabilityFromConfig} from '../observability/createApplicationObservabilityFromConfig';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';
const clock = createClock();
const applicationBootstrapStartedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds;

document.addEventListener('DOMContentLoaded', async () => {
  const domContentLoadedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds;
  const config = Config.getConfig();
  const fetchLatestBuildMetadata = createFetchLatestBuildMetadata({
    fetchBuildMetadata: globalThis.fetch.bind(globalThis),
  });
  function isOnline(): boolean {
    return globalThis.navigator.onLine;
  }

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
  const fireAndForgetInvokerLogger = getLogger('FireAndForgetInvoker');
  const applicationServices = createApplicationServices({
    createApplicationObservability() {
      return createApplicationObservabilityFromConfig(config);
    },
    clock,
    createFireAndForgetInvoker: () => {
      return createFireAndForgetInvoker({
        reportError(error) {
          fireAndForgetInvokerLogger.error('failed to execute fire-and-forget action', error);
        },
      });
    },
  });
  const {isFeatureToggleEnabled} = startupFeatureToggles;
  const {applicationObservability, fireAndForgetInvoker} = applicationServices;
  const apiClient = new APIClient({clock: applicationServices.clock});
  const core = new Core(apiClient);
  const cleanupIncrementalHttpRetryBackoffReset = createIncrementalHttpRetryBackoffReset({
    apiClient,
    visibilityState: () => {
      return document.visibilityState;
    },
    isElectron: () => {
      return Runtime.isElectron();
    },
    subscribeToApplicationSignal: (signalName, listener) => {
      document.addEventListener(signalName, listener);
    },
    subscribeToRuntimeSignal: (signalName, listener) => {
      globalThis.addEventListener(signalName, listener);
    },
    unsubscribeFromApplicationSignal: (signalName, listener) => {
      document.removeEventListener(signalName, listener);
    },
    unsubscribeFromRuntimeSignal: (signalName, listener) => {
      globalThis.removeEventListener(signalName, listener);
    },
  });

  container.registerInstance(APIClient, apiClient);
  container.registerInstance(Core, core);
  globalThis.addEventListener('unload', cleanupIncrementalHttpRetryBackoffReset);

  createRoot(appContainer).render(
    <AppContainer
      config={config}
      clientType={shouldPersist ? ClientType.PERMANENT : ClientType.TEMPORARY}
      applicationObservability={applicationObservability}
      applicationBootstrapStartedAtMonotonicMicroseconds={applicationBootstrapStartedAtMonotonicMicroseconds}
      domContentLoadedAtMonotonicMicroseconds={domContentLoadedAtMonotonicMicroseconds}
      fireAndForgetInvoker={fireAndForgetInvoker}
      fetchLatestBuildMetadata={fetchLatestBuildMetadata}
      isOnline={isOnline}
      isFeatureToggleEnabled={isFeatureToggleEnabled}
      clock={applicationServices.clock}
      translate={translate}
    />,
  );
});
