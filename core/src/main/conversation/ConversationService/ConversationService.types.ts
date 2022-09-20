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

import {GenericMessage} from '@wireapp/protocol-messaging';
import {
  QualifiedUserClients,
  ClientMismatch,
  ConversationProtocol,
  MessageSendingStatus,
  UserClients,
  Conversation,
} from '@wireapp/api-client/src/conversation';
import {QualifiedId} from '@wireapp/api-client/src/user';
import {MlsEvent} from '@wireapp/api-client/src/conversation/data/MlsEventData';

export enum MessageTargetMode {
  NONE,
  USERS,
  USERS_CLIENTS,
}

export interface MessageSendingOptions {
  /**
   * The federated domain the server runs on. Should only be set for federation enabled envs
   */
  conversationDomain?: string;

  /**
   * can be either a QualifiedId[] or QualfiedUserClients or undefined. The type has some effect on the behavior of the method.
   *    When given undefined the method will fetch both the members of the conversations and their devices. No ClientMismatch can happen in that case
   *    When given a QualifiedId[] the method will fetch the freshest list of devices for those users (since they are not given by the consumer). As a consequence no ClientMismatch error will trigger and we will ignore missing clients when sending
   *    When given a QualifiedUserClients the method will only send to the clients listed in the userIds. This could lead to ClientMismatch (since the given list of devices might not be the freshest one and new clients could have been created)
   */
  userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients;

  /**
   * Will send the message as a protobuf payload
   */
  sendAsProtobuf?: boolean;
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
   * Will be called before a message is actually sent. Returning 'false' will prevent the message from being sent
   * @param message The message being sent
   * @return true or undefined if the message should be sent, false if the message sending should be cancelled
   */
  onStart?: (message: GenericMessage) => void | boolean | Promise<boolean>;

  onSuccess?: (message: GenericMessage, sentTime?: string) => void;
  /**
   * Called whenever there is a clientmismatch returned from the server. Will also indicate the sending status of the message (if it was already sent or not)
   *
   * @param status The mismatch info
   * @param wasSent Indicate whether the message was already sent or if it can still be canceled
   * @return
   */
  onClientMismatch?: (
    status: ClientMismatch | MessageSendingStatus,
    wasSent: boolean,
  ) => void | boolean | Promise<boolean>;
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
  protocol: ConversationProtocol;
};

/**
 * The message to send to the conversation
 */
export type SendCommonParams<T> = ProtocolParam & {
  payload: T;
  onStart?: (message: GenericMessage) => void | boolean | Promise<boolean>;
  onSuccess?: (message: GenericMessage, sentTime?: string) => void;
};
export type SendProteusMessageParams<T> = SendCommonParams<T> &
  MessageSendingOptions & {
    /**
     * Can be either a QualifiedId[], string[], UserClients or QualfiedUserClients. The type has some effect on the behavior of the method. (Needed only for Proteus)
     *    When given a QualifiedId[] or string[] the method will fetch the freshest list of devices for those users (since they are not given by the consumer). As a consequence no ClientMismatch error will trigger and we will ignore missing clients when sending
     *    When given a QualifiedUserClients or UserClients the method will only send to the clients listed in the userIds. This could lead to ClientMismatch (since the given list of devices might not be the freshest one and new clients could have been created)
     *    When given a QualifiedId[] or QualifiedUserClients the method will send the message through the federated API endpoint
     *    When given a string[] or UserClients the method will send the message through the old API endpoint
     */
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients;
    onClientMismatch?: (
      status: ClientMismatch | MessageSendingStatus,
      wasSent: boolean,
    ) => void | boolean | Promise<boolean>;
    protocol: ConversationProtocol.PROTEUS;
  };

export type SendMlsMessageParams<T> = SendCommonParams<T> & {
  /**
   * The groupId of the conversation to send the message to (Needed only for MLS)
   */
  groupId: string;
  protocol: ConversationProtocol.MLS;
};

export type QualifiedUsers = QualifiedId & {skipOwn?: string};

export type AddUsersParams = {
  conversationId: QualifiedId;
  qualifiedUserIds: QualifiedId[];
  groupId?: string;
};

export type RemoveUsersParams = {
  conversationId: QualifiedId;
  qualifiedUserIds: QualifiedId[];
  groupId: string;
};

export type MLSReturnType = {events: MlsEvent[]; conversation: Conversation};
