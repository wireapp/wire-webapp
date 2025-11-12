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

import {ClientClassification, ClientType, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {FEATURE_KEY, FEATURE_STATUS} from '@wireapp/api-client/lib/team';
import {ClientInfo} from '@wireapp/core/lib/client/';

import {Runtime} from '@wireapp/commons';

import {getClientMLSConfig} from 'Repositories/client/clientMLSConfig';

import {ClientActionCreator} from './creator/';

import * as StringUtil from '../../util/stringUtil';
import type {ThunkAction} from '../reducer';

export class ClientAction {
  doGetAllClients = (): ThunkAction<Promise<RegisteredClient[]>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(ClientActionCreator.startGetAllClients());
      try {
        const clients = await apiClient.api.client.getClients();
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
        await apiClient.api.client.deleteClient(clientId, password);
        dispatch(ClientActionCreator.successfulRemoveClient(clientId));
      } catch (error) {
        dispatch(ClientActionCreator.failedRemoveClient(error));
        throw error;
      }
    };
  };

  doInitializeClient = (
    clientType: ClientType,
    password?: string,
    verificationCode?: string,
    entropyData?: Uint8Array,
  ): ThunkAction => {
    return async (dispatch, getState, {core, actions: {clientAction}}) => {
      const localClient = await core.getLocalClient();
      const commonConfig = (await core.service?.team.getCommonFeatureConfig()) ?? {};

      const useAsyncNotificationStream =
        commonConfig[FEATURE_KEY.CONSUMABLE_NOTIFICATIONS]?.status === FEATURE_STATUS.ENABLED;

      const useLegacyNotificationStream = !useAsyncNotificationStream;

      const creationStatus = localClient
        ? {isNew: false, client: localClient}
        : {
            isNew: true,
            client: await core.registerClient(
              {clientType, password, verificationCode},
              useLegacyNotificationStream,
              entropyData,
              clientAction.generateClientPayload(clientType),
            ),
          };

      await core.initClient(creationStatus.client, getClientMLSConfig(commonConfig));
      dispatch(ClientActionCreator.successfulInitializeClient(creationStatus));
    };
  };

  private generateClientPayload = (clientType: ClientType): ClientInfo | undefined => {
    if (clientType === ClientType.NONE) {
      return undefined;
    }
    const deviceLabel = `${Runtime.getOS()}${Runtime.getOS().version ? ` ${Runtime.getOS().version}` : ''}`;
    let deviceModel = StringUtil.capitalize(Runtime.getBrowserName());
    const dev = Runtime.isEdgeEnvironment() ? '(Edge)' : Runtime.isStagingEnvironment() ? '(Staging)' : false;

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
    if (dev) {
      deviceModel = `${deviceModel} ${dev}`;
    }
    return {
      classification: ClientClassification.DESKTOP,
      cookieLabel: undefined,
      label: deviceLabel,
      model: deviceModel,
    };
  };

  resetClientError = (): ThunkAction => {
    return async dispatch => {
      dispatch(ClientActionCreator.resetError());
    };
  };
}

export const clientAction = new ClientAction();
