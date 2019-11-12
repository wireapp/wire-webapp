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

import {ConnectionState, HttpClient} from '@wireapp/api-client/dist/commonjs/http';
import {Account} from '@wireapp/core';
import {PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {UserUpdateMessage} from '@wireapp/core/dist/conversation/message/UserMessage';
import {getLogger} from 'Util/Logger';
import {ThunkAction} from '../../module/reducer';
import * as SelfSelector from '../../module/selector/SelfSelector';

export class WebSocketAction {
  private readonly logger = getLogger('WebSocketAction');

  disconnect = (): ThunkAction => {
    return async (dispatch, getState, {apiClient, core}) => {
      try {
        apiClient.disconnect();
        for (const payloadType of Object.values(PayloadBundleType)) {
          core.removeAllListeners(payloadType);
        }
      } catch (error) {
        this.logger.warn('Error during WebSocket disconnect:', error.message);
      }
    };
  };

  listen = (): ThunkAction => {
    return async (dispatch, getState, {apiClient, core, actions: {selfAction}}) => {
      core.removeAllListeners(Account.TOPIC.ERROR);
      core.on(Account.TOPIC.ERROR, error => this.logger.error('CoreError', error));

      core.on(PayloadBundleType.USER_UPDATE as any, async (message: UserUpdateMessage) => {
        const isSelfId = message.content.user.id === SelfSelector.getSelf(getState()).id;
        if (isSelfId) {
          await dispatch(selfAction.fetchSelf());
        }
      });

      apiClient.transport.http.removeAllListeners(HttpClient.TOPIC.ON_CONNECTION_STATE_CHANGE);
      apiClient.transport.http.on(HttpClient.TOPIC.ON_CONNECTION_STATE_CHANGE, (event: ConnectionState) => {
        this.logger.log(
          `Connection state change ${HttpClient.TOPIC.ON_CONNECTION_STATE_CHANGE} message: ${JSON.stringify(event)}`,
        );
      });

      await core.listen();
    };
  };
}

export const webSocketAction = new WebSocketAction();
