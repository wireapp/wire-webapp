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

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';

export const finaliseMigrationOfMixedConversations = async (
  mixedConversations: MixedConversation[],
  {
    apiClient,
    core,
  }: {
    apiClient: APIClient;
    core: Account;
  },
) => {
  for (const mixedConversation of mixedConversations) {
    await finaliseMigrationOfMixedConversation(mixedConversation, {apiClient, core});
  }
};

const finaliseMigrationOfMixedConversation = async (
  mixedConversation: MixedConversation,
  {
    core,
    apiClient,
  }: {
    core: Account;
    apiClient: APIClient;
  },
) => {
  //change the conversation protocol to mls
  await apiClient.api.conversation.putConversationProtocol(mixedConversation.qualifiedId, ConversationProtocol.MLS);
};
