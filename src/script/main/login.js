/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import $ from 'jquery';

import {enableLogging} from 'Util/LoggerUtil';

import {AuthViewModel} from '../view_model/AuthViewModel';
import {resolve, graph} from '../config/appResolver';
import {Config} from '../Config';
import {exposeWrapperGlobals} from 'Util/wrapper';
import {isTemporaryClientAndNonPersistent} from 'Util/util';
import {StorageKey, StorageService} from '../storage';
import {loadValue} from 'Util/StorageUtil';

$(async () => {
  enableLogging(Config.FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();
  if ($('.auth-page').length) {
    const backendClient = resolve(graph.BackendClient);
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });
    if (isTemporaryClientAndNonPersistent(loadValue(StorageKey.AUTH.PERSIST))) {
      const engine = await StorageService.getUnitializedEngine();
      new AuthViewModel(backendClient, engine);
    } else {
      new AuthViewModel(backendClient);
    }
  }
});
