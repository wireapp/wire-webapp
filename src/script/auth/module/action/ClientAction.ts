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

import {ClientClassification, ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {ClientInfo} from '@wireapp/core/dist/client/';
import * as Runtime from '../../Runtime';
import * as StringUtil from '../../util/stringUtil';
import {ThunkAction} from '../reducer';
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

  doRemoveClient = (clientId: string, password?: string): ThunkAction => {
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
    return async (dispatch, getState, {core, actions: {clientAction}}) => {
      dispatch(ClientActionCreator.startInitializeClient());
      try {
        const creationStatus = await core.initClient(
          {clientType, password},
          clientAction.generateClientPayload(clientType),
        );
        await dispatch(clientAction.doGetAllClients());
        dispatch(ClientActionCreator.successfulInitializeClient(creationStatus));
      } catch (error) {
        dispatch(ClientActionCreator.failedInitializeClient(error));
        throw error;
      }
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
