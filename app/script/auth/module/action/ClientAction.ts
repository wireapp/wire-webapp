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
import * as Runtime from '../../Runtime';
import * as Environment from '../../Environment';
import * as StringUtil from '../../util/stringUtil';
import {ClientType, RegisteredClient, ClientClassification} from '@wireapp/api-client/dist/commonjs/client/index';
import {ThunkAction} from '../reducer';
import {ClientInfo} from '@wireapp/core/dist/client/root';
import {ClientActionCreator} from './creator/';

export class ClientAction {
  doGetAllClients = (): ThunkAction<Promise<RegisteredClient[]>> => {
    return (dispatch, getState, {apiClient}) => {
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
  };

  doRemoveClient = (clientId, password): ThunkAction => {
    return (dispatch, getState, {apiClient}) => {
      dispatch(ClientActionCreator.startRemoveClient());
      return Promise.resolve()
        .then(() => apiClient.client.api.deleteClient(clientId, password))
        .then(clients => {
          dispatch(ClientActionCreator.successfulRemoveClient(clientId));
        })
        .catch(error => {
          dispatch(ClientActionCreator.failedRemoveClient(error));
          throw error;
        });
    };
  };

  doInitializeClient = (clientType: ClientType, password?: string): ThunkAction => {
    return (dispatch, getState, {core, actions: {clientAction, notificationAction}}) => {
      dispatch(ClientActionCreator.startInitializeClient());
      return Promise.resolve()
        .then(() => core.initClient({clientType, password}, clientAction.generateClientPayload(clientType)))
        .then(creationStatus =>
          Promise.resolve()
            .then(() => dispatch(ClientActionCreator.successfulInitializeClient(creationStatus)))
            .then(() => creationStatus)
        )
        .then(creationStatus => {
          const isNewSubsequentClient = password && creationStatus.isNewClient;
          if (isNewSubsequentClient) {
            dispatch(notificationAction.checkHistory());
            throw new BackendError({
              code: 201,
              label: BackendError.LABEL.NEW_CLIENT,
              message: 'New client is created.',
            });
          }
        })
        .catch(error => {
          dispatch(ClientActionCreator.failedInitializeClient(error));
          throw error;
        });
    };
  };

  generateClientPayload = (clientType: ClientType): ClientInfo => {
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
      if (!Environment.isEnvironment(Environment.ENVIRONMENT.PRODUCTION)) {
        deviceModel = `${deviceModel} (Internal)`;
      }
    } else if (clientType === ClientType.TEMPORARY) {
      deviceModel = `${deviceModel} (Temporary)`;
    }

    return {
      classification: ClientClassification.DESKTOP,
      cookieLabel: undefined,
      label: deviceLabel,
      model: deviceModel,
    };
  };
}

export const clientAction = new ClientAction();
