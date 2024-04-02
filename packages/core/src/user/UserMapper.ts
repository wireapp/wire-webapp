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

import {
  USER_EVENT,
  UserClientAddEvent,
  UserClientRemoveEvent,
  UserConnectionEvent,
  UserEvent,
  UserUpdateEvent,
} from '@wireapp/api-client/lib/event';

import {MessageSendingState, PayloadBundle, PayloadBundleType} from '../conversation';
import {createId} from '../conversation/message/MessageBuilder';
import {NotificationSource} from '../notification';

export class UserMapper {
  public static mapUserEvent(
    event: UserEvent,
    selfUserId: string,
    source: NotificationSource,
  ): PayloadBundle | undefined {
    switch (event.type) {
      case USER_EVENT.CONNECTION: {
        const {connection, user} = event as UserConnectionEvent;
        return {
          content: {connection, user},
          conversation: connection.conversation,
          from: connection.from,
          id: createId(),
          messageTimer: 0,
          source,
          state: MessageSendingState.INCOMING,
          timestamp: new Date(connection.last_update).getTime(),
          type: PayloadBundleType.CONNECTION_REQUEST,
        };
      }
      case USER_EVENT.CLIENT_ADD: {
        const {client} = event as UserClientAddEvent;
        return {
          content: {client},
          conversation: selfUserId,
          from: selfUserId,
          id: createId(),
          messageTimer: 0,
          source,
          state: MessageSendingState.INCOMING,
          timestamp: new Date().getTime(),
          type: PayloadBundleType.CLIENT_ADD,
        };
      }
      case USER_EVENT.UPDATE: {
        const {user} = event as UserUpdateEvent;
        return {
          content: {user},
          conversation: selfUserId,
          from: selfUserId,
          id: createId(),
          source,
          state: MessageSendingState.INCOMING,
          timestamp: new Date().getTime(),
          type: PayloadBundleType.USER_UPDATE,
        };
      }
      case USER_EVENT.CLIENT_REMOVE: {
        const {client} = event as UserClientRemoveEvent;
        return {
          content: {client},
          conversation: selfUserId,
          from: selfUserId,
          id: createId(),
          messageTimer: 0,
          source,
          state: MessageSendingState.INCOMING,
          timestamp: new Date().getTime(),
          type: PayloadBundleType.CLIENT_REMOVE,
        };
      }
    }
    return undefined;
  }
}
