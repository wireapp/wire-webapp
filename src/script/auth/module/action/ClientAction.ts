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

import {ClientClassification, ClientType, RegisteredClient} from '@wireapp/api-client/src/client/index';
import type {ClientInfo} from '@wireapp/core/src/main/client/';

import {Runtime} from '@wireapp/commons';
import * as StringUtil from '../../util/stringUtil';
import type {ThunkAction} from '../reducer';
import {ClientActionCreator} from './creator/';

export class ClientAction {
  doGetAllClients = (): ThunkAction<Promise<RegisteredClient[]>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ClientActionCreator.startGetAllClients());
      try {
        const clients = await apiClient.client.api.getClients();
        dispatch(ClientActionCreator.successfulGetAllClients(clients));
        return clients;
      } catch (error) {
        dispatch(ClientActionCreator.failedGetAllClients(error));
        throw error;
      }
    };
  };

  doRemoveClient = (clientId: string, password?: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ClientActionCreator.startRemoveClient());
      try {
        await apiClient.client.api.deleteClient(clientId, password);
        dispatch(ClientActionCreator.successfulRemoveClient(clientId));
      } catch (error) {
        dispatch(ClientActionCreator.failedRemoveClient(error));
        throw error;
      }
    };
  };

  doInitializeClient = (clientType: ClientType, password?: string): ThunkAction => {
    return async (dispatch, getState, {core, actions: {clientAction, webSocketAction}}) => {
      dispatch(ClientActionCreator.startInitializeClient());
      try {
        const creationStatus = await core.initClient(
          {clientType, password},
          clientAction.generateClientPayload(clientType),
        );
        await dispatch(clientAction.doGetAllClients());
        await dispatch(webSocketAction.listen());
        dispatch(ClientActionCreator.successfulInitializeClient(creationStatus));
      } catch (error) {
        dispatch(ClientActionCreator.failedInitializeClient(error));
        throw error;
      }
    };
  };

  generateClientPayload = (clientType: ClientType): ClientInfo | undefined => {
    if (clientType === ClientType.NONE) {
      return undefined;
    }
    const deviceLabel = `${Runtime.getOS()}${Runtime.getOS().version ? ` ${Runtime.getOS().version}` : ''}`;
    let deviceModel = StringUtil.capitalize(Runtime.getBrowserName());

    if (Runtime.isDesktopApp()) {
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
