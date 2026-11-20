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
import {isFunction, isNull, isUndefined} from '@sindresorhus/is';
import 'core-js/full/reflect';

import {ClientType} from '../apiClient/client/clientType';

import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {configureLogging} from '../logger/getLogger';
import {Runtime} from '../commons/util/Runtime';

import {createApplicationServices} from './createApplicationServices';
import {createAccountIdentifier} from '../logger/createAccountIdentifier';
import {createAuthenticatedAccountBinding} from '../logger/createAuthenticatedAccountBinding';
import {logRuntimeIdentity, logStartupRuntimeIdentity} from '../logger/logRuntimeIdentity';
import {createAccountLogCleanup} from '../logger/createAccountLogCleanup';
import {waitForDocumentContentLoaded} from './waitForDocumentContentLoaded';

import {SIGN_OUT_REASON} from '../auth/signOutReason';
import {AppContainer} from '../components/appContainer/appContainer';
import {FileFullscreenModal} from '../components/FileFullscreenModal/FileFullscreenModal';
import {
  ChatPdfModalToken,
  type ChatPdfModalComponent,
} from '../components/messagesList/message/contentMessage/asset/fileAsset/chatPdfModal';
import type {CoreCryptoSupport} from '../browser/coreCryptoSupport';
import {initializeDesktopLogOutput} from '../browser/initializeDesktopLogOutput';
import {selectBrowserLogSaveFilePicker} from '../browser/selectBrowserLogSaveFilePicker';
import {initializeRuntimeErrorDiagnostics} from '../browser/initializeRuntimeErrorDiagnostics';
import {renderWithCoreCryptoSupport} from '../browser/renderWithCoreCryptoSupport';
import {Config} from '../Config';
import {initializeStartupFeatureToggleUrl} from '../featureToggles/initializeStartupFeatureToggleUrl';
import {StartupFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';
import {createBrowserLogDownload} from '../logger/createBrowserLogDownload';
import {createBrowserLogZipArchive} from '../logger/createBrowserLogZipArchive';
import {createIncrementalHttpRetryBackoffReset} from '../lifecycle/createIncrementalHttpRetryBackoffReset';
import {createFetchLatestBuildMetadata} from '../lifecycle/newVersionHandler';
import {retireLegacyServiceWorker} from '../lifecycle/retireLegacyServiceWorker';
import {createApplicationObservabilityFromConfig} from '../observability/createApplicationObservabilityFromConfig';
import {doSimpleRedirect} from '../repositories/LifeCycleRepository/LifeCycleRepository';
import {StorageKey} from '../repositories/storage';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';
import {translate} from '../util/localizerUtil';
import {getStorage} from '../util/localStorage';
import {getLogger} from '../util/logger';
import {initializeLogging, type StartupLoggingOptions} from '../logger/initializeLogging';
import {createBrowserLogPersistence, createLogWorkerConnection} from '../logger/createBrowserLogPersistence';
import {loadValue} from '../util/storageUtil';
import {exposeWrapperGlobals} from '../util/wrapper';

type StartApplicationOptions = {
  readonly defaultEnabledFeatureToggleNames: readonly StartupFeatureToggleName[];
  readonly support: CoreCryptoSupport;
  readonly logging: StartupLoggingOptions;
};

export async function startApplication(options: StartApplicationOptions): Promise<void> {
  const {defaultEnabledFeatureToggleNames, support, logging} = options;
  container.registerInstance<ChatPdfModalComponent>(ChatPdfModalToken, FileFullscreenModal);

  initializeStartupFeatureToggleUrl({
    url: new URL(window.location.href),
    defaultEnabledFeatureToggleNames,
    replaceUrl(url) {
      window.history.replaceState(window.history.state, '', url);
    },
  });

  const clock = createClock();
  const applicationBootstrapStartedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds;
  const config = Config.getConfig();
  const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(window.location.search);
  const isElectron = Runtime.isElectron();
  const isDesktopApp = Runtime.isDesktopApp();
  const browserLogSaveFilePicker = selectBrowserLogSaveFilePicker({isElectron, browserWindow: window});
  const browserLoggingAvailable = browserLogSaveFilePicker.isJust;
  const desktopLogOutput = initializeDesktopLogOutput(clock, startupFeatureToggles);
  function shouldWriteConsoleFallback(): boolean {
    return desktopLogOutput.isNothing || !desktopLogOutput.value.hasConfirmedDelivery();
  }

  const downloadApplicationLogs = createBrowserLogDownload({
    showSaveFilePicker: browserLogSaveFilePicker,
    clock,
    getDirectory() {
      return navigator.storage.getDirectory();
    },
    createArchive: createBrowserLogZipArchive,
  });
  const persistentLogging = initializeLogging({
    clock,
    consoleOutput: console,
    locationSearch: window.location.search,
    ...logging,
    shouldWriteConsoleFallback: isDesktopApp ? shouldWriteConsoleFallback : undefined,
    storage: Maybe.of(getStorage()),
    configureLogging,
    loggingEnabled: isElectron || browserLoggingAvailable,
    browserPersistenceEnabled: !isElectron && browserLoggingAvailable,
    desktopPersistenceOutput: desktopLogOutput.isJust ? desktopLogOutput.value.write : undefined,
    createPersistenceOutput() {
      return createBrowserLogPersistence({
        clock,
        lifecycle: {
          isHidden() {
            return document.visibilityState === 'hidden';
          },
          subscribeToVisibilityChanges(listener) {
            document.addEventListener('visibilitychange', listener);

            return function unsubscribe() {
              document.removeEventListener('visibilitychange', listener);
            };
          },
        },
        createWorker() {
          if (!isFunction(globalThis.Worker)) {
            return Maybe.nothing();
          }

          return Maybe.just(
            createLogWorkerConnection(
              new Worker(new URL('../logger/browserLogPersistenceWorker.ts', import.meta.url), {
                name: 'wire-browser-log-persistence',
              }),
            ),
          );
        },
      });
    },
  });
  initializeRuntimeErrorDiagnostics(window);
  const runtimeIdentity = {
    logger: getLogger('RuntimeIdentity'),
    origin: window.location.origin,
    version: config.VERSION,
    assetVersion: config.ASSET_VERSION,
  };
  logStartupRuntimeIdentity({
    logger: runtimeIdentity.logger,
    origin: runtimeIdentity.origin,
    version: runtimeIdentity.version,
    assetVersion: runtimeIdentity.assetVersion,
    clock,
    consoleOutput: console,
    isDesktopApp,
    hasDesktopLogPersistence: desktopLogOutput.isJust,
    locationSearch: window.location.search,
  });
  const fireAndForgetInvokerLogger = getLogger('FireAndForgetInvoker');
  const fireAndForgetInvoker = createFireAndForgetInvoker({
    reportError(error) {
      fireAndForgetInvokerLogger.error('failed to execute fire-and-forget action', {error});
    },
  });
  const persistentLoggingLogger = getLogger('BrowserLogPersistence');
  const cleanupAccountLogs = createAccountLogCleanup({
    isElectron,
    persistence: persistentLogging,
    hashQualifiedId(qualifiedId) {
      return createAccountIdentifier({qualifiedId, encoder: new TextEncoder(), crypto: globalThis.crypto.subtle});
    },
    async getDirectory() {
      return navigator.storage.getDirectory();
    },
    reportFailure() {
      persistentLoggingLogger.warn('Account browser log deletion incomplete');
    },
  });
  const onAuthenticatedAccount = createAuthenticatedAccountBinding({
    fireAndForgetInvoker,
    persistence: persistentLogging,
    onAccountBound() {
      logRuntimeIdentity(runtimeIdentity);
    },
    hashQualifiedId(qualifiedId) {
      return createAccountIdentifier({qualifiedId, encoder: new TextEncoder(), crypto: globalThis.crypto.subtle});
    },
    reportFailure() {
      persistentLoggingLogger.warn('Persistent browser logging disabled: authenticated account binding failed');
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
  const fetchLatestBuildMetadata = createFetchLatestBuildMetadata({
    fetchBuildMetadata: globalThis.fetch.bind(globalThis),
  });
  function isOnline(): boolean {
    return globalThis.navigator.onLine;
  }

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

  const applicationServices = createApplicationServices({
    createApplicationObservability() {
      return createApplicationObservabilityFromConfig(config);
    },
    clock,
    fireAndForgetInvoker,
  });
  const {isFeatureToggleEnabled} = startupFeatureToggles;
  const {applicationObservability} = applicationServices;
  const apiClient = new APIClient({
    clock: applicationServices.clock,
  });
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
    if (persistentLogging.isJust) {
      fireAndForgetInvoker.fireAndForget(persistentLogging.value.dispose);
    }
  }

  globalThis.addEventListener('unload', disposeApplicationResources);

  renderWithCoreCryptoSupport(
    appContainer,
    support,
    <AppContainer
      downloadApplicationLogs={downloadApplicationLogs}
      cleanupAccountLogs={cleanupAccountLogs}
      onAuthenticatedAccount={onAuthenticatedAccount}
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
