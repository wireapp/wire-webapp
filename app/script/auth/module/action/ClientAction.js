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
import * as Runtime from '../../Runtime';
import * as Environment from '../../Environment';
import * as StringUtil from '../../util/stringUtil';
import * as NotificationAction from './NotificationAction';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';

export function doGetAllClients() {
  return function(dispatch, getState, {apiClient}) {
    dispatch(ClientActionCreator.startGetAllClients());
    return Promise.resolve()
      .then(() => apiClient.client.api.getClients())
      .then(clients => {
        dispatch(ClientActionCreator.successfulGetAllClients(clients));
        return clients;
      })
      .catch(error => {
        dispatch(ClientActionCreator.failedGetAllClients(error));
        throw error;
      });
  };
}

export function doRemoveClient(clientId, password) {
  return function(dispatch, getState, {apiClient}) {
    dispatch(ClientActionCreator.startRemoveClient());
    return Promise.resolve()
      .then(() => apiClient.client.api.deleteClient(clientId, password))
      .then(clients => dispatch(ClientActionCreator.successfulRemoveClient(clientId)))
      .catch(error => {
        dispatch(ClientActionCreator.failedRemoveClient(error));
        throw error;
      });
  };
}

export function doInitializeClient(clientType, password) {
  return function(dispatch, getState, {core}) {
    dispatch(ClientActionCreator.startInitializeClient());
    return Promise.resolve()
      .then(() => core.initClient({clientType, password}, generateClientPayload(clientType)))
      .then(creationStatus =>
        Promise.resolve()
          .then(() => dispatch(ClientActionCreator.successfulInitializeClient(creationStatus)))
          .then(() => creationStatus)
      )
      .then(creationStatus => {
        const isNewSubsequentClient = password && creationStatus.isNewClient;
        if (isNewSubsequentClient) {
          dispatch(NotificationAction.checkHistory());
          throw new BackendError({code: 201, label: BackendError.LABEL.NEW_CLIENT, message: 'New client is created.'});
        }
      })
      .catch(error => {
        dispatch(ClientActionCreator.failedInitializeClient(error));
        throw error;
      });
  };
}

export function generateClientPayload(clientType: ClientType) {
  if (clientType === ClientType.NONE) {
    return undefined;
  }
  const deviceLabel = `${Runtime.getOsFamily()}${Runtime.getOs().version ? ` ${Runtime.getOs().version}` : ''}`;
  let deviceModel = StringUtil.capitalize(Runtime.getBrowserName());

  if (Runtime.isElectron()) {
    if (Runtime.isMacOS()) {
      deviceModel = 'Wire macOS';
    } else if (Runtime.isWindows()) {
      deviceModel = 'Wire Windows';
    } else {
      deviceModel = 'Wire Linux';
    }
    if (!Environment.isEnvironment(Environment.PRODUCTION)) {
      deviceModel = `${deviceModel} (Internal)`;
    }
  } else if (clientType === ClientType.TEMPORARY) {
    deviceModel = `${deviceModel} (Temporary)`;
  }

  return {
    classification: 'desktop',
    label: deviceLabel,
    model: deviceModel,
  };
}
