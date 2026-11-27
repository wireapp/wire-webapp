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

import type {QualifiedId} from '../apiClient/user/qualifiedId';
import type {Conversation} from '../repositories/entity/Conversation';
import type {ContentMessage} from '../repositories/entity/message/contentMessage';

type EveryoneMentionConversation = Pick<Conversation, 'isGroupLike'>;
type EveryoneMentionMessage = Pick<ContentMessage, 'user'>;

/**
 * Checks whether a mention of everyone (`@all`) in a message counts as mentioning the self user.
 * It counts only in group-like conversations (groups, channels and meetings) and never for the self user's own messages.
 *
 * @param conversation The conversation the message belongs to. Without one, a mention of everyone does not count.
 * @param message The message containing the mention
 */
export const isEveryoneMentionApplicable = (
  conversation: EveryoneMentionConversation | undefined,
  message: EveryoneMentionMessage,
): boolean => {
  return conversation !== undefined && conversation.isGroupLike() && !message.user().isMe;
};

/**
 * Checks whether a message mentions the self user, either directly or through a mention of everyone (`@all`).
 * This is the single rule shared by the unread state, notifications and message rendering.
 *
 * @param message The message to check
 * @param conversation The conversation the message belongs to
 * @param selfId The qualified id of the self user
 */
export const isSelfMentioned = (
  message: Pick<ContentMessage, 'isUserMentioned' | 'user'>,
  conversation: EveryoneMentionConversation | undefined,
  selfId: QualifiedId,
): boolean => {
  return message.isUserMentioned(selfId, {includeEveryone: isEveryoneMentionApplicable(conversation, message)});
};

/**
 * Checks whether a message mentions or quotes the self user, including mentions of everyone (`@all`) where they count.
 */
export const isSelfTargeted = (
  message: Pick<ContentMessage, 'isUserMentioned' | 'isUserQuoted' | 'user'>,
  conversation: EveryoneMentionConversation | undefined,
  selfId: QualifiedId,
): boolean => {
  return isSelfMentioned(message, conversation, selfId) || message.isUserQuoted(selfId.id);
};
