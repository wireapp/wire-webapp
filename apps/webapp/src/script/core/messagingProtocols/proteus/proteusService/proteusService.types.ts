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

import {NewConversation} from '../../../../apiClient/conversation/newConversation';
import {QualifiedOTRRecipients} from '../../../../apiClient/conversation/otrRecipients';
import {QualifiedUserClients} from '../../../../apiClient/conversation/qualifiedUserClients';
import {QualifiedId} from '../../../../apiClient/user/qualifiedId';
import type {
  AddUsersToProteusConversationParams,
  SendProteusMessageParams,
} from '../../../conversation/conversationService/conversationService.types';

export interface NewClient {
  clientId: string;
  userId: QualifiedId;
}
export type ProteusServiceConfig = {
  onNewClient?: (client: NewClient) => void;
  nbPrekeys: number;
};

export type EncryptionResult = {
  /** the encrypted payloads for the clients that have a valid sessions */
  payloads: QualifiedOTRRecipients;
  /** user-client that do not have prekeys on backend (deleted clients) */
  unknowns?: QualifiedUserClients;
  /** users for whom we could retrieve a prekey and, thus, for which we could not encrypt the message */
  failed?: QualifiedId[];
};

export type CreateProteusConversationParams = {
  conversationData: NewConversation | string;
  otherUserIds?: string | string[];
};

export type {AddUsersToProteusConversationParams, SendProteusMessageParams};
