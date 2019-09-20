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

import {AudioPreference} from '../audio/';
import {PreKey} from '../auth/';
import {RegisteredClient, UpdatedClient} from '../client/';
import {Connection} from '../connection/';
import {NotificationPreference} from '../notification/';
import {Self} from '../self/';
import {UserClientRemoveData, UserConnectionData, UserPushRemoveData, UserUpdateData} from '../user/data';
import {BackendEvent} from './BackendEvent';

type UserID = string;

export enum USER_EVENT {
  ACTIVATE = 'user.activate',
  CLIENT_ADD = 'user.client-add',
  CLIENT_LEGAL_HOLD_REQUEST = 'user.client-legal-hold-request',
  CLIENT_REMOVE = 'user.client-remove',
  CONNECTION = 'user.connection',
  DELETE = 'user.delete',
  LEGAL_HOLD_DISABLE = 'user.legalhold-disable',
  LEGAL_HOLD_ENABLE = 'user.legalhold-enable',
  PROPERTIES_SET = 'user.properties-set',
  PUSH_REMOVE = 'user.push-remove',
  UPDATE = 'user.update',
}

export interface UserEvent extends BackendEvent {
  type: USER_EVENT;
}

export interface UserActivateEvent extends UserEvent {
  type: USER_EVENT.ACTIVATE;
  user: Self;
}

export interface UserClientAddEvent extends UserEvent {
  client: RegisteredClient;
  type: USER_EVENT.CLIENT_ADD;
}

export interface UserClientAddNotification {
  client: UpdatedClient;
  type: USER_EVENT.CLIENT_ADD;
}

export interface UserClientLegalHoldRequestEvent extends UserEvent {
  client_id: string;
  last_prekey: PreKey;
  requester: string;
  target_user: string;
  type: USER_EVENT.CLIENT_LEGAL_HOLD_REQUEST;
}

export interface UserLegalHoldEnableEvent extends UserEvent {
  id: UserID;
  type: USER_EVENT.LEGAL_HOLD_ENABLE;
}

export interface UserLegalHoldDisableEvent extends UserEvent {
  id: UserID;
  type: USER_EVENT.LEGAL_HOLD_DISABLE;
}

export interface UserClientRemoveEvent extends UserEvent {
  client: {
    id: string;
  };
  type: USER_EVENT.CLIENT_REMOVE;
}

export interface UserClientRemoveNotification {
  client: UserClientRemoveData;
  type: USER_EVENT.CLIENT_REMOVE;
}

export interface UserConnectionEvent extends UserEvent {
  connection: Connection;
  user: {
    name: string;
  };
  type: USER_EVENT.CONNECTION;
}

export interface UserConnectionNotification {
  connection: UserConnectionData;
  type: USER_EVENT.CONNECTION;
}

export interface UserDeleteEvent extends UserEvent {
  type: USER_EVENT.DELETE;
}

export interface UserPropertiesSetEvent extends UserEvent {
  value: {
    contact_import: Object;
    enable_debugging: boolean;
    settings: {
      emoji: {
        replace_inline: boolean;
      };
      notifications: NotificationPreference;
      previews: {
        send: boolean;
      };
      privacy: {
        improve_wire: boolean;
      };
      sound: {
        alerts: AudioPreference;
      };
    };
    version: number;
  };
  key: 'webapp';
  type: USER_EVENT.PROPERTIES_SET;
}

export interface UserUpdateEvent extends UserEvent {
  type: USER_EVENT.UPDATE;
}

export interface UserPushRemoveNotification {
  type: USER_EVENT.PUSH_REMOVE;
  token: UserPushRemoveData;
}

export interface UserUpdateNotification {
  type: USER_EVENT.UPDATE;
  user: UserUpdateData;
}
