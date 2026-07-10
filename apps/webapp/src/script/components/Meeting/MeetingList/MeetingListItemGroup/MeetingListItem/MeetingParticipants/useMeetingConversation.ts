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

import {useMemo} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const useMeetingConversation = (qualifiedConversation: QualifiedId): Conversation | undefined => {
  const conversationState = container.resolve(ConversationState);
  const {conversations} = useKoSubscribableChildren(conversationState, ['conversations']);

  return useMemo(
    () => conversations.find(item => matchQualifiedIds(item.qualifiedId, qualifiedConversation)),
    [conversations, qualifiedConversation],
  );
};
