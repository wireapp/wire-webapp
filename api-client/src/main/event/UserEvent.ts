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

import {BackendEvent} from './BackendEvent';

enum USER_EVENT {
  ACTIVATE = 'user.activate',
  CLIENT_ADD = 'user.client-add',
  CLIENT_REMOVE = 'user.client-remove',
  CONNECTION = 'user.connection',
  DELETE = 'user.delete',
  UPDATE = 'user.update',
}

interface UserEvent extends BackendEvent {
  type: USER_EVENT;
}

interface UserActivateEvent extends UserEvent {
  type: USER_EVENT.ACTIVATE;
}

interface UserClientAddEvent extends UserEvent {
  type: USER_EVENT.CLIENT_ADD;
}

interface UserClientRemoveEvent extends UserEvent {
  type: USER_EVENT.CLIENT_REMOVE;
}

interface UserConnectionEvent extends UserEvent {
  type: USER_EVENT.CONNECTION;
}

interface UserDeleteEvent extends UserEvent {
  type: USER_EVENT.DELETE;
}

interface UserUpdateEvent extends UserEvent {
  type: USER_EVENT.UPDATE;
}

export {
  USER_EVENT,
  UserEvent,
  UserActivateEvent,
  UserClientAddEvent,
  UserClientRemoveEvent,
  UserConnectionEvent,
  UserDeleteEvent,
  UserUpdateEvent,
};
