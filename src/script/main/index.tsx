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
import {enableLogging} from 'Util/LoggerUtil';
import {loadValue} from 'Util/StorageUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import {doRedirect} from './app';

import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {Config} from '../Config';
import {StorageKey} from '../storage';

document.addEventListener('DOMContentLoaded', async () => {
  const config = Config.getConfig();

  enableLogging(config.FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();

  const appContainer = document.getElementById('wire-app');

  if (!appContainer) {
    throw new Error('container for application does not exist in the DOM');
  }

  const enforceDesktopApplication = config.FEATURE.ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY && !Runtime.isDesktopApp();

  if (enforceDesktopApplication) {
    doRedirect(SIGN_OUT_REASON.APP_INIT);
  }

  const shouldPersist = loadValue<boolean>(StorageKey.AUTH.PERSIST);

  if (shouldPersist === undefined) {
    return doRedirect(SIGN_OUT_REASON.NOT_SIGNED_IN);
  }

  createRoot(appContainer).render(
    <AppContainer config={config} clientType={shouldPersist ? ClientType.PERMANENT : ClientType.TEMPORARY} />,
  );
});
