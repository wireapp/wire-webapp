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

import {isNonEmptyString} from '@sindresorhus/is';

import {ClientActionCreator} from './creator/';

import {ClientClassification} from '../../../apiClient/client/clientClassification';
import {ClientType} from '../../../apiClient/client/clientType';
import {RegisteredClient} from '../../../apiClient/client/registeredClient';
import {FEATURE_KEY, FEATURE_STATUS} from '../../../apiClient/team/feature/featureList.types';
import {Runtime} from '../../../commons/util/Runtime';
import {ClientInfo} from '../../../core/client';
import {getClientMLSConfig} from '../../../repositories/client/clientMLSConfig';
import {toError} from '../../../util/toError';
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
      } catch (error: unknown) {
        dispatch(ClientActionCreator.failedGetAllClients(toError(error)));
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
      } catch (error: unknown) {
        dispatch(ClientActionCreator.failedRemoveClient(toError(error)));
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
    return async (dispatch, getState, {core, clock, actions: {clientAction}}) => {
      const localClient = await core.getLocalClient();
      const commonConfig = (await core.service?.team.getCommonFeatureConfig()) ?? {};

      const useAsyncNotificationStream =
        commonConfig[FEATURE_KEY.CONSUMABLE_NOTIFICATIONS]?.status === FEATURE_STATUS.ENABLED;

      const useLegacyNotificationStream = !useAsyncNotificationStream;

      const creationStatus = localClient.isJust
        ? {isNew: false, client: localClient.value}
        : {
            isNew: true,
            client: await core.registerClient(
              {clientType, password, verificationCode},
              useLegacyNotificationStream,
              entropyData,
              clientAction.generateClientPayload(clientType),
            ),
          };

      await core.initClient(creationStatus.client, getClientMLSConfig(commonConfig, clock));
      dispatch(ClientActionCreator.successfulInitializeClient(creationStatus));
    };
  };

  private generateClientPayload = (clientType: ClientType): ClientInfo | undefined => {
    if (clientType === ClientType.NONE) {
      return undefined;
    }
    const deviceLabel = `${Runtime.getOS()}${
      isNonEmptyString(Runtime.getOS().version) ? ` ${Runtime.getOS().version}` : ''
    }`;
    let deviceModel = StringUtil.capitalize(Runtime.getBrowserName());
    let developmentSuffix = '';
    if (Runtime.isEdgeEnvironment()) {
      developmentSuffix = '(Edge)';
    } else if (Runtime.isStagingEnvironment()) {
      developmentSuffix = '(Staging)';
    }

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
    if (developmentSuffix.length > 0) {
      deviceModel = `${deviceModel} ${developmentSuffix}`;
    }
    return {
      classification: ClientClassification.DESKTOP,
      cookieLabel: '',
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
