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
  UserActivateData,
  UserClientAddData,
  UserClientRemoveData,
  UserConnectionData,
  UserDeleteData,
  UserLegalHoldDisableData,
  UserLegalHoldEnableData,
  UserLegalHoldRequestData,
  UserPropertiesSetData,
  UserUpdateData,
} from '@wireapp/api-client/lib/user/data';

import {BasePayloadBundle, PayloadBundleType} from './PayloadBundle';

export interface UserActivateMessage extends BasePayloadBundle {
  content: UserActivateData;
  type: PayloadBundleType.USER_ACTIVATE;
}

export interface UserClientAddMessage extends BasePayloadBundle {
  content: UserClientAddData;
  type: PayloadBundleType.USER_CLIENT_ADD;
}

export interface UserLegalHoldRequestMessage extends BasePayloadBundle {
  content: UserLegalHoldRequestData;
  type: PayloadBundleType.USER_LEGAL_HOLD_REQUEST;
}

export interface UserLegalHoldEnableMessage extends BasePayloadBundle {
  content: UserLegalHoldEnableData;
  type: PayloadBundleType.USER_LEGAL_HOLD_ENABLE;
}

export interface UserLegalHoldDisableMessage extends BasePayloadBundle {
  content: UserLegalHoldDisableData;
  type: PayloadBundleType.USER_LEGAL_HOLD_DISABLE;
}

export interface UserClientRemoveMessage extends BasePayloadBundle {
  content: UserClientRemoveData;
  type: PayloadBundleType.USER_CLIENT_REMOVE;
}

export interface UserConnectionMessage extends BasePayloadBundle {
  content: UserConnectionData;
  type: PayloadBundleType.USER_CONNECTION;
}

export interface UserDeleteMessage extends BasePayloadBundle {
  content: UserDeleteData;
  type: PayloadBundleType.USER_DELETE;
}

export interface UserPropertiesSetEvent extends BasePayloadBundle {
  content: UserPropertiesSetData;
  type: PayloadBundleType.USER_PROPERTIES_SET;
}

export interface UserUpdateMessage extends BasePayloadBundle {
  content: UserUpdateData;
  type: PayloadBundleType.USER_UPDATE;
}

export type UserMessage =
  | UserActivateMessage
  | UserClientAddMessage
  | UserLegalHoldRequestMessage
  | UserLegalHoldEnableMessage
  | UserLegalHoldDisableMessage
  | UserClientRemoveMessage
  | UserConnectionMessage
  | UserDeleteMessage
  | UserPropertiesSetEvent
  | UserUpdateMessage;
