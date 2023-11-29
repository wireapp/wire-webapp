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

import {Account} from '@wireapp/core';

import {isMixedConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {initMLSConversations} from 'src/script/mls/MLSConversations';

import {mlsMigrationLogger} from '../../MLSMigrationLogger';

interface JoinUnestablishedMixedConversationsParams {
  core: Account;
}

export const joinUnestablishedMixedConversations = async (
  conversations: Conversation[],
  {core}: JoinUnestablishedMixedConversationsParams,
) => {
  const mixedConversations = conversations.filter(isMixedConversation);
  mlsMigrationLogger.info(`Found ${mixedConversations.length} "mixed" conversations, joining unestablished ones...`);

  await initMLSConversations(mixedConversations, {
    core,
    onError: ({id}, error) =>
      mlsMigrationLogger.error(`Failed when joining a mls group of mixed conversation with id ${id}, error: `, error),
  });
};
