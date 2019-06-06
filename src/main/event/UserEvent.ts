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
import {RegisteredClient} from '../client/';
import {Connection} from '../connection/';
import {NotificationPreference} from '../notification/';
import {Self} from '../self/';
import {BackendEvent} from './BackendEvent';

export enum USER_EVENT {
  ACTIVATE = 'user.activate',
  CLIENT_ADD = 'user.client-add',
  CLIENT_REMOVE = 'user.client-remove',
  CONNECTION = 'user.connection',
  DELETE = 'user.delete',
  PROPERTIES_SET = 'user.properties-set',
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

export interface UserClientRemoveEvent extends UserEvent {
  client: {
    id: string;
  };
  type: USER_EVENT.CLIENT_REMOVE;
}

export interface UserConnectionEvent extends UserEvent {
  connection: Connection;
  user: {
    name: string;
  };
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
