/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {ProteusConversation} from 'src/script/conversation/ConversationSelectors';

export const initialiseMigrationOfProteusConversations = async (
  proteusConversations: ProteusConversation[],
  {
    core,
    apiClient,
  }: {
    core: Account;
    apiClient: APIClient;
  },
) => {
  for (const proteusConversation of proteusConversations) {
    await initialiseMigrationOfProteusConversation(proteusConversation, {core, apiClient});
  }
};

const initialiseMigrationOfProteusConversation = async (
  proteusConversation: ProteusConversation,
  {
    core,
    apiClient,
  }: {
    core: Account;
    apiClient: APIClient;
  },
) => {
  //change the conversation protocol to mixed
  await apiClient.api.conversation.putConversationProtocol(proteusConversation.qualifiedId, ConversationProtocol.MIXED);

  //refetch the conversation to get all new fields including groupId, epoch and new protocol
  await apiClient.api.conversation.getConversation(proteusConversation.qualifiedId);
  //create MLS group with derived groupId
};
