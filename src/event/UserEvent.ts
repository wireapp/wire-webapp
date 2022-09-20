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

import {
  UserActivateData,
  UserClientAddData,
  UserClientRemoveData,
  UserConnectionData,
  UserDeleteData,
  UserLegalHoldDisableData,
  UserLegalHoldEnableData,
  UserLegalHoldRequestData,
  UserPropertiesDeleteData,
  UserPropertiesSetData,
  UserPushRemoveData,
  UserUpdateData,
} from '../user/data';

export enum USER_EVENT {
  ACTIVATE = 'user.activate',
  CLIENT_ADD = 'user.client-add',
  CLIENT_REMOVE = 'user.client-remove',
  CONNECTION = 'user.connection',
  DELETE = 'user.delete',
  LEGAL_HOLD_DISABLE = 'user.legalhold-disable',
  LEGAL_HOLD_ENABLE = 'user.legalhold-enable',
  LEGAL_HOLD_REQUEST = 'user.legalhold-request',
  PROPERTIES_DELETE = 'user.properties-delete',
  PROPERTIES_SET = 'user.properties-set',
  PUSH_REMOVE = 'user.push-remove',
  UPDATE = 'user.update',
}

export type UserEventData =
  | UserActivateData
  | UserClientAddData
  | UserLegalHoldRequestData
  | UserLegalHoldEnableData
  | UserLegalHoldDisableData
  | UserClientRemoveData
  | UserConnectionData
  | UserDeleteData
  | UserPropertiesSetData
  | UserPropertiesDeleteData
  | UserUpdateData
  | UserPushRemoveData
  | null;

export type UserEvent =
  | UserActivateEvent
  | UserClientAddEvent
  | UserLegalHoldRequestEvent
  | UserLegalHoldEnableEvent
  | UserLegalHoldDisableEvent
  | UserClientRemoveEvent
  | UserConnectionEvent
  | UserDeleteEvent
  | UserPropertiesSetEvent
  | UserPropertiesDeleteEvent
  | UserUpdateEvent
  | UserPushRemoveEvent;

export interface BaseUserEvent {
  type: USER_EVENT;
}

export interface UserActivateEvent extends BaseUserEvent, UserActivateData {
  type: USER_EVENT.ACTIVATE;
}

export interface UserClientAddEvent extends BaseUserEvent, UserClientAddData {
  type: USER_EVENT.CLIENT_ADD;
}

export interface UserLegalHoldRequestEvent extends BaseUserEvent, UserLegalHoldRequestData {
  type: USER_EVENT.LEGAL_HOLD_REQUEST;
}

export interface UserLegalHoldEnableEvent extends BaseUserEvent, UserLegalHoldEnableData {
  type: USER_EVENT.LEGAL_HOLD_ENABLE;
}

export interface UserLegalHoldDisableEvent extends BaseUserEvent, UserLegalHoldDisableData {
  type: USER_EVENT.LEGAL_HOLD_DISABLE;
}

export interface UserClientRemoveEvent extends BaseUserEvent, UserClientRemoveData {
  type: USER_EVENT.CLIENT_REMOVE;
}

export interface UserConnectionEvent extends BaseUserEvent, UserConnectionData {
  type: USER_EVENT.CONNECTION;
}

export interface UserDeleteEvent extends BaseUserEvent, UserDeleteData {
  type: USER_EVENT.DELETE;
}

export interface UserPropertiesSetEvent extends BaseUserEvent, UserPropertiesSetData {
  type: USER_EVENT.PROPERTIES_SET;
}

export interface UserPropertiesDeleteEvent extends BaseUserEvent, UserPropertiesDeleteData {
  type: USER_EVENT.PROPERTIES_DELETE;
}

export interface UserUpdateEvent extends BaseUserEvent, UserUpdateData {
  type: USER_EVENT.UPDATE;
}

export interface UserPushRemoveEvent extends BaseUserEvent, UserPushRemoveData {
  type: USER_EVENT.PUSH_REMOVE;
}
