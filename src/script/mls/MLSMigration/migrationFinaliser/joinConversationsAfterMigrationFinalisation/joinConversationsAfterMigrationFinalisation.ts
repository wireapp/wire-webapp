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

import {Account} from '@wireapp/core';

import {MLSConversation, isMLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {initMLSGroupConversations} from 'src/script/mls/MLSConversations';

/**
 * Will compare the list of initial conversations stored in the local database with conversations fetched from the backend.
 * Will join the MLS group and send a system message to the conversation if the conversation was previously using proteus and is now using MLS.
 * Should be called before we join new unestablished MLS conversations, otherwise we would join without insterting the system message.
 *
 * @param conversations - list of conversations updated from the backend
 */
export const joinConversationsAfterMigrationFinalisation = async ({
  conversations,
  core,
  selfUser,
  onSuccess,
  onError,
}: {
  conversations: Conversation[];
  core: Account;
  selfUser: User;
  onSuccess: (conversation: Conversation) => void;
  onError?: (conversation: Conversation, error: unknown) => void;
}) => {
  //we filter out the conversations that are known by the clients (saved in the db) before being refetch from the backend
  //if such conversations were previously using proteus, and now are using MLS,
  //it means that the self user did not take part in the migration and is joining a conversation late
  //we have to join the conversation with external commit and let user know that they might have missed some messages
  const alreadyMigratedConversations = filterGroupConversationsAlreadyMigratedToMLS(conversations);

  await initMLSGroupConversations(alreadyMigratedConversations, selfUser, {
    core,
    onSuccessfulJoin: onSuccess,
    onError,
  });
};

const filterGroupConversationsAlreadyMigratedToMLS = (conversations: Conversation[]) => {
  return conversations.filter((conversation): conversation is MLSConversation => {
    if (!conversation.isGroupOrChannel()) {
      return false;
    }

    return isMLSConversation(conversation) && conversation.initialProtocol !== ConversationProtocol.MLS;
  });
};
