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
import {isNull, isUndefined} from '@sindresorhus/is';
import 'core-js/full/reflect';

import {ClientType} from '@wireapp/api-client/lib/client/';

import {createRoot} from 'react-dom/client';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';

import {createApplicationServices} from './createApplicationServices';
import {waitForDocumentContentLoaded} from './waitForDocumentContentLoaded';

import {SIGN_OUT_REASON} from '../auth/signOutReason';
import {AppContainer} from '../components/appContainer/appContainer';
import {Config} from '../Config';
import {initializeStartupFeatureToggleUrl} from '../featureToggles/initializeStartupFeatureToggleUrl';
import {StartupFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';
import {createIncrementalHttpRetryBackoffReset} from '../lifecycle/createIncrementalHttpRetryBackoffReset';
import {createFetchLatestBuildMetadata} from '../lifecycle/newVersionHandler';
import {retireLegacyServiceWorker} from '../lifecycle/retireLegacyServiceWorker';
import {createApplicationObservabilityFromConfig} from '../observability/createApplicationObservabilityFromConfig';
import {doSimpleRedirect} from '../repositories/LifeCycleRepository/LifeCycleRepository';
import {StorageKey} from '../repositories/storage';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';
import {translate} from '../util/localizerUtil';
import {getLogger} from '../util/logger';
import {enableLogging} from '../util/loggerUtil';
import {loadValue} from '../util/storageUtil';
import {exposeWrapperGlobals} from '../util/wrapper';

export async function startApplication(
  defaultEnabledFeatureToggleNames: readonly StartupFeatureToggleName[],
): Promise<void> {
  initializeStartupFeatureToggleUrl({
    url: new URL(window.location.href),
    defaultEnabledFeatureToggleNames,
    replaceUrl(url) {
      window.history.replaceState(window.history.state, '', url);
    },
  });

  const clock = createClock();
  const applicationBootstrapStartedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds;
  const fireAndForgetInvokerLogger = getLogger('FireAndForgetInvoker');
  const fireAndForgetInvoker = createFireAndForgetInvoker({
    reportError(error) {
      fireAndForgetInvokerLogger.error('failed to execute fire-and-forget action', error);
    },
  });
  const documentContentLoaded = waitForDocumentContentLoaded({
    readDocumentReadyState() {
      return document.readyState;
    },
    readMonotonicMicroseconds() {
      return clock.currentMonotonicMicroseconds;
    },
    subscribeToDocumentContentLoaded(listener) {
      document.addEventListener('DOMContentLoaded', listener, {once: true});
    },
  });

  fireAndForgetInvoker.fireAndForget(() => {
    return retireLegacyServiceWorker({
      serviceWorkerContainer: Maybe.of(navigator.serviceWorker),
      cacheStorage: Maybe.of(window.caches),
      origin: window.location.origin,
    });
  });

  const domContentLoadedAtMonotonicMicroseconds = await documentContentLoaded;
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

  if (isNull(appContainer)) {
    throw new Error('container for application does not exist in the DOM');
  }

  const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();

  if (enforceDesktopApplication) {
    const unSupportedPageUrl = `${window.location.origin}/unsupported`;
    window.location.replace(unSupportedPageUrl);
    return;
  }

  const shouldPersist = loadValue<boolean>(StorageKey.AUTH.PERSIST);

  if (isUndefined(shouldPersist)) {
    return doSimpleRedirect(SIGN_OUT_REASON.NOT_SIGNED_IN);
  }

  const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(globalThis.location.search);
  const applicationServices = createApplicationServices({
    createApplicationObservability() {
      return createApplicationObservabilityFromConfig(config);
    },
    clock,
    fireAndForgetInvoker,
  });
  const {isFeatureToggleEnabled} = startupFeatureToggles;
  const {applicationObservability} = applicationServices;
  const apiClient = new APIClient({clock: applicationServices.clock});
  const core = new Core(apiClient);
  const cleanupIncrementalHttpRetryBackoffReset = createIncrementalHttpRetryBackoffReset({
    apiClient,
    visibilityState() {
      return document.visibilityState;
    },
    isElectron() {
      return Runtime.isElectron();
    },
    subscribeToApplicationSignal(signalName, listener) {
      document.addEventListener(signalName, listener);
    },
    subscribeToRuntimeSignal(signalName, listener) {
      globalThis.addEventListener(signalName, listener);
    },
    unsubscribeFromApplicationSignal(signalName, listener) {
      document.removeEventListener(signalName, listener);
    },
    unsubscribeFromRuntimeSignal(signalName, listener) {
      globalThis.removeEventListener(signalName, listener);
    },
  });

  container.registerInstance(APIClient, apiClient);
  container.registerInstance(Core, core);
  function disposeApplicationResources(): void {
    using disposableApiClient = apiClient;
    cleanupIncrementalHttpRetryBackoffReset();
  }

  globalThis.addEventListener('unload', disposeApplicationResources);

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
}
