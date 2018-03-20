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

import BackendError from './BackendError';
import * as ClientActionCreator from './creator/ClientActionCreator';
import {getLocalStorage, LocalStorageKey} from './LocalStorageAction';
import Runtime from '../../Runtime';
import * as Environment from '../../Environment';
import * as StringUtil from '../../util/stringUtil';

export function doGetAllClients() {
  return function(dispatch, getState, {apiClient}) {
    dispatch(ClientActionCreator.startGetAllClients());
    return Promise.resolve()
      .then(() => apiClient.client.api.getClients())
      .then(clients => dispatch(ClientActionCreator.successfulGetAllClients(clients)))
      .catch(error => {
        dispatch(ClientActionCreator.failedGetAllClients(error));
        throw BackendError.handle(error);
      });
  };
}

export function doRemoveClient(clientId: string, password: string) {
  return function(dispatch, getState, {apiClient}) {
    dispatch(ClientActionCreator.startRemoveClient());
    return Promise.resolve()
      .then(() => apiClient.client.api.deleteClient(clientId, password))
      .then(clients => dispatch(ClientActionCreator.successfulRemoveClient(clientId)))
      .catch(error => {
        dispatch(ClientActionCreator.failedRemoveClient(error));
        throw BackendError.handle(error);
      });
  };
}

export function doCreateClient(password: string) {
  return function(dispatch, getState, {core}) {
    dispatch(ClientActionCreator.startCreateClient());
    return Promise.resolve()
      .then(() => dispatch(getLocalStorage(LocalStorageKey.AUTH.PERSIST)))
      .then(persist =>
        core.registerClient(
          {
            password,
            persist: !!persist,
          },
          generateClientPayload(!!persist)
        )
      )
      .then(clients => dispatch(ClientActionCreator.successfulCreateClient()))
      .catch(error => {
        dispatch(ClientActionCreator.failedCreateClient(error));
        throw BackendError.handle(error);
      });
  };
}

export function generateClientPayload(persist) {
  const runtime = new Runtime();

  const deviceLabel = `${runtime.getOSFamily()}${runtime.getOS().version ? ` ${runtime.getOS().version}` : ''}`;
  let deviceModel = StringUtil.capitalize(runtime.getBrowserName());

  if (runtime.isElectron()) {
    if (runtime.isMacOS()) {
      deviceModel = 'Wire macOS';
    } else if (runtime.isWindows()) {
      deviceModel = 'Wire Windows';
    } else {
      deviceModel = 'Wire Linux';
    }
    if (!Environment.isEnvironment(Environment.PRODUCTION)) {
      deviceModel = `${deviceModel} (Internal)`;
    }
  } else if (!persist) {
    deviceModel = `${deviceModel} (Temporary)`;
  }

  return {
    class: 'desktop',
    label: deviceLabel,
    model: deviceModel,
  };
}
