/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {QualifiedUserClients, MessageSendingStatus, Conversation} from '@wireapp/api-client/lib/conversation';
import {ConversationEvent, ConversationMemberJoinEvent} from '@wireapp/api-client/lib/event';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {GenericMessage} from '@wireapp/protocol-messaging';

import {MessageSendingState} from '..';

export enum MessageTargetMode {
  NONE,
  USERS,
  USERS_CLIENTS,
}

export interface MessageSendingOptions {
  /**
   * can be either a QualifiedId[] or QualfiedUserClients or undefined. The type has some effect on the behavior of the method.
   *    When given undefined the method will fetch both the members of the conversations and their devices. No ClientMismatch can happen in that case
   *    When given a QualifiedId[] the method will fetch the freshest list of devices for those users (since they are not given by the consumer). As a consequence no ClientMismatch error will trigger and we will ignore missing clients when sending
   *    When given a QualifiedUserClients the method will only send to the clients listed in the userIds. This could lead to ClientMismatch (since the given list of devices might not be the freshest one and new clients could have been created)
   */
  userIds?: QualifiedId[] | QualifiedUserClients;

  nativePush?: boolean;

  /**
   * Will be called whenever there is a clientmismatch returned from the server. Needs to be combined with a userIds of type QualifiedUserClients
   */
  onClientMismatch?: MessageSendingCallbacks['onClientMismatch'];

  /**
   * Defines the behavior to use when a mismatch happens on backend side:
   *     - NONE -> Not a targetted message, we want to send to all the users/clients in the conversation. Will report all missing users and clients (default mode)
   *     - USERS -> A message targetted to all the clients of the given users (according to params.userIds). Will ignore missing users and only report missing clients for the given params.userIds
   *     - USERS_CLIENTS -> A message targetted at some specific clients of specific users (according to params.userIds). Will force sending the message even if users or clients are missing
   */
  targetMode?: MessageTargetMode;
}

export interface MessageSendingCallbacks {
  /**
   * Called whenever there is a clientmismatch returned from the server. Will also indicate the sending status of the message (if it was already sent or not)
   *
   * @param status The mismatch info
   * @param wasSent Indicate whether the message was already sent or if it can still be canceled
   * @return
   */
  onClientMismatch?: (status: MessageSendingStatus, wasSent: boolean) => void | boolean | Promise<boolean>;
}

/**
 *   ######################################################################
 *   ################ MLS and Proteus implementation types ################
 *   ######################################################################
 */

/**
 * The protocol to use to send the message (MLS or Proteus)
 */
export type ProtocolParam = {
  protocol: CONVERSATION_PROTOCOL;
};

/**
 * The message to send to the conversation
 */
export type SendCommonParams = ProtocolParam & {
  payload: GenericMessage;
  conversationId: QualifiedId;
};

export type SendMlsMessageParams = SendCommonParams & {
  /**
   * The groupId of the conversation to send the message to (Needed only for MLS)
   */
  groupId: string;
  protocol: CONVERSATION_PROTOCOL.MLS;
};

export type KeyPackageClaimUser = QualifiedId & {skipOwnClientId?: string};

export type AddUsersParams = {
  conversationId: QualifiedId;
  qualifiedUsers: KeyPackageClaimUser[];
  groupId?: string;
};

export type RemoveUsersParams = {
  conversationId: QualifiedId;
  qualifiedUserIds: QualifiedId[];
  groupId: string;
};

export enum AddUsersFailureReasons {
  NON_FEDERATING_BACKENDS = 'NON_FEDERATING_BACKENDS',
  UNREACHABLE_BACKENDS = 'UNREACHABLE_BACKENDS',
  OFFLINE_FOR_TOO_LONG = 'OFFLINE_FOR_TOO_LONG',
  NOT_MLS_CAPABLE = 'NOT_MLS_CAPABLE',
}

/**
 * List of users that were originaly requested to be in the conversation
 * but could not be added due to their backend not being available
 * @note Added since version 4: https://staging-nginz-https.z
ra.io/v4/api/swagger-ui/#/default/post_conversations
* @note Federation only
*/
export type AddUsersFailure =
  | {
      reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS;
      users: QualifiedId[];
      backends: string[];
    }
  | {
      reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS;
      users: QualifiedId[];
      backends: string[];
    }
  | {
      reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG;
      users: QualifiedId[];
    }
  | {
      reason: AddUsersFailureReasons.NOT_MLS_CAPABLE;
      users: QualifiedId[];
    };

/**
 * The backend response of any method that will create (or add users to) a conversation
 */
export interface BaseCreateConversationResponse {
  conversation: Conversation;
  failedToAdd?: AddUsersFailure[];
}

export type ProteusCreateConversationResponse = BaseCreateConversationResponse;
export type ProteusAddUsersResponse = {
  event?: ConversationMemberJoinEvent;
  failedToAdd?: AddUsersFailure[];
};

export interface MLSCreateConversationResponse extends BaseCreateConversationResponse {
  events: ConversationEvent[];
}

export type SendResult = {
  /** The id of the message sent */
  id: string;
  /** the ISO formatted date at which the message was received by the backend */
  sentAt: string;
  /** The sending state of the payload (has the payload been succesfully sent or canceled) */
  state: MessageSendingState;
  /** In case the message was sent to some federated backend, if the backend was down at the moment of sending the `failedToSend` property will contain all the users/devices that couldn't get the message */
  failedToSend?: {
    /** the message was encrypted for those recipients but will reach them later (a session existed but their backend is offline) */
    queued?: QualifiedUserClients | QualifiedId[];
    /** the message could not be encrypted for those recipients and thus will never reach them (a session did not exist and their backend if offline) */
    failed?: QualifiedId[];
  };
};
