/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {container} from 'tsyringe';

import {Avatar, AVATAR_SIZE, GroupAvatar} from 'Components/Avatar';
import type {Conversation} from 'Repositories/entity/Conversation';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {useKoSubscribableChildren} from 'Util/componentUtil';

interface ConversationAvatarByIdProps {
  conversationId: string;
  conversationDomain: string | null;
}

/**
 * Renders the actual avatar for a conversation looked up by ID.
 * Shows a group icon for group conversations, the user's profile picture for 1:1.
 * Falls back to the group icon if the conversation is not in local state.
 */
export const ConversationAvatarById = ({conversationId, conversationDomain}: ConversationAvatarByIdProps) => {
  const conversationState = container.resolve(ConversationState);
  const conversation = conversationState.findConversation({id: conversationId, domain: conversationDomain ?? ''});

  if (!conversation) {
    return <GroupAvatar conversationID={conversationId} />;
  }

  return <LoadedConversationAvatar conversation={conversation} />;
};

/** Inner component that subscribes to the Knockout observables on the resolved conversation. */
const LoadedConversationAvatar = ({conversation}: {conversation: Conversation}) => {
  const {isGroupOrChannel, participating_user_ets: users} = useKoSubscribableChildren(conversation, [
    'isGroupOrChannel',
    'participating_user_ets',
  ]);

  if (isGroupOrChannel) {
    return <GroupAvatar conversationID={conversation.id} />;
  }

  if (users.length > 0) {
    return <Avatar participant={users[0]} avatarSize={AVATAR_SIZE.SMALL} noBadge />;
  }

  return <GroupAvatar conversationID={conversation.id} />;
};
