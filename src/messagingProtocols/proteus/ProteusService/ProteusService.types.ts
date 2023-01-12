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

import {
  UserClients,
  QualifiedUserClients,
  ClientMismatch,
  MessageSendingStatus,
  ConversationProtocol,
  NewConversation,
} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {AddUsersParams, MessageSendingOptions, SendCommonParams} from '../../../conversation';

export interface NewClient {
  clientId: string;
  userId: QualifiedId;
}
export type ProteusServiceConfig = {
  useQualifiedIds: boolean;
  onNewClient?: (client: NewClient) => void;
  nbPrekeys: number;
};

export type SendProteusMessageParams = SendCommonParams &
  MessageSendingOptions & {
    conversationId: QualifiedId;

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

export type CreateProteusConversationParams = {
  conversationData: NewConversation | string;
  otherUserIds?: string | string[];
};

export type AddUsersToProteusConversationParams = Omit<AddUsersParams, 'groupId'>;
