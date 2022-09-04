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

import 'core-js/es7/reflect';

import {createRoot} from 'react-dom/client';
import {Runtime} from '@wireapp/commons';
import {ClientType} from '@wireapp/api-client/src/client/';
import {container} from 'tsyringe';
import {enableLogging} from 'Util/LoggerUtil';
import {loadValue} from 'Util/StorageUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {Config} from '../Config';
import {APIClient} from '../service/APIClientSingleton';
import {Core} from '../service/CoreSingleton';
import {StorageKey} from '../storage';
import {App, doRedirect} from './app';
import {AppContainer} from './components/AppContainer';

document.addEventListener('DOMContentLoaded', async () => {
  const appContainer = document.getElementById('wire-app');
  if (!appContainer) {
    throw new Error('container for application does not exist in the DOM');
  }

  const apiClient = container.resolve(APIClient);
  await apiClient.useVersion(Config.getConfig().SUPPORTED_API_VERSIONS);
  const core = container.resolve(Core);

  enableLogging(Config.getConfig().FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();

  const enforceDesktopApplication =
    Config.getConfig().FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();
  if (enforceDesktopApplication) {
    doRedirect(SIGN_OUT_REASON.APP_INIT);
  }

  const shouldPersist = loadValue<boolean>(StorageKey.AUTH.PERSIST);
  if (shouldPersist === undefined) {
    return doRedirect(SIGN_OUT_REASON.NOT_SIGNED_IN);
  }

  const app = new App(core, apiClient);
  window.wire.app = app;
  createRoot(appContainer).render(
    <AppContainer app={app} clientType={shouldPersist ? ClientType.PERMANENT : ClientType.TEMPORARY} />,
  );
});
