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
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isFunction, isNull} from '@sindresorhus/is';
// Polyfill "Object.entries" & "Object.values"
import 'core-js/full/object';
import 'core-js/full/reflect';
import {Provider} from 'react-redux';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import './configureEnvironment';
import {configureStore} from './configureStore';
import {actionRoot} from './module/action';
import {Root} from './page/root';

import type {CoreCryptoSupport} from '../browser/coreCryptoSupport';
import {initializeDesktopLogOutput} from '../browser/initializeDesktopLogOutput';
import {initializeRuntimeErrorDiagnostics} from '../browser/initializeRuntimeErrorDiagnostics';
import {renderWithCoreCryptoSupport} from '../browser/renderWithCoreCryptoSupport';
import {selectBrowserLogSaveFilePicker} from '../browser/selectBrowserLogSaveFilePicker';
import {Runtime} from '../commons/util/runtime';
import {Config} from '../config';
import {retireLegacyServiceWorker} from '../lifecycle/retireLegacyServiceWorker';
import {updateApiVersion} from '../lifecycle/updateRemoteConfigs';
import {setAppLocale} from '../localization/localizer';
import {createBrowserLogPersistence, createLogWorkerConnection} from '../logger/createBrowserLogPersistence';
import {configureLogging} from '../logger/getLogger';
import {initializeLogging, type StartupLoggingOptions} from '../logger/initializeLogging';
import {logStartupRuntimeIdentity} from '../logger/logRuntimeIdentity';
import {APIClient} from '../service/apiClientSingleton';
import {Core} from '../service/coreSingleton';
import {initializeDataDog} from '../util/dataDog';
import {translate} from '../util/localizerUtil';
import type {Translate} from '../util/localizerUtil';
import {getStorage} from '../util/localStorage';
import {getLogger} from '../util/logger';
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

export function startAuthApp(support: CoreCryptoSupport, logging: StartupLoggingOptions): void {
  exposeWrapperGlobals();
  const config = Config.getConfig();
  const clock = createClock();
  const isElectron = Runtime.isElectron();
  const browserLogSaveFilePicker = selectBrowserLogSaveFilePicker({isElectron, browserWindow: window});
  const browserLoggingAvailable = browserLogSaveFilePicker.isJust;
  const loggingEnabled = isElectron || browserLoggingAvailable;
  const desktopLogOutput = initializeDesktopLogOutput(clock);
  const isDesktopApp = Runtime.isDesktopApp();
  function shouldWriteConsoleFallback(): boolean {
    return desktopLogOutput.isNothing || !desktopLogOutput.value.hasConfirmedDelivery();
  }

  const persistentLogging = initializeLogging({
    clock,
    consoleOutput: console,
    locationSearch: window.location.search,
    ...logging,
    shouldWriteConsoleFallback: isDesktopApp ? shouldWriteConsoleFallback : undefined,
    storage: Maybe.of(getStorage()),
    configureLogging,
    loggingEnabled,
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
  logStartupRuntimeIdentity({
    clock,
    consoleOutput: console,
    isDesktopApp,
    hasDesktopLogPersistence: desktopLogOutput.isJust,
    locationSearch: window.location.search,
    logger: getLogger('RuntimeIdentity'),
    origin: window.location.origin,
    version: config.VERSION,
    assetVersion: config.ASSET_VERSION,
  });
  const fireAndForgetInvokerLogger = getLogger('FireAndForgetInvoker');
  const fireAndForgetInvoker = createFireAndForgetInvoker({
    reportError(error) {
      fireAndForgetInvokerLogger.error('failed to execute fire-and-forget action', {error});
    },
  });
  const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();
  if (enforceDesktopApplication) {
    window.location.replace(`${window.location.origin}/unsupported`);
    return;
  }

  const apiClient = new APIClient({clock});
  function disposeAuthenticationClient(): void {
    apiClient.dispose();
    if (persistentLogging.isJust) {
      fireAndForgetInvoker.fireAndForget(persistentLogging.value.dispose);
    }
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
    thunkDependencies: {
      clock,
      actions: actionRoot,
      apiClient,
      core,
      getConfig: Config.getConfig,
      localStorage,
    },
    reduxLoggingEnabled: loggingEnabled,
  });

  const render = (Component: FunctionComponent<AuthAppProps>): void => {
    const container = document.getElementById(mainId);
    if (isNull(container)) {
      throw new Error(`No container '${mainId}' found to render application`);
    }

    renderWithCoreCryptoSupport(
      container,
      support,
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

  fireAndForgetInvoker.fireAndForget(runApp);
}
