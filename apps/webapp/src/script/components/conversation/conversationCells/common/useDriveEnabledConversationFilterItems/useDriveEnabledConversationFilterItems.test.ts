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

import type {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import type {Conversation} from 'Repositories/entity/conversation';

import {getDriveEnabledConversations} from './usedriveenabledconversationfilteritems';

const createConversation = ({id, lastEventTimestamp}: {id: string; lastEventTimestamp: number}): Conversation =>
  ({
    id,
    last_event_timestamp: () => lastEventTimestamp,
  }) as Conversation;

const createConversationRepository = (conversations: Conversation[]): ConversationRepository =>
  ({
    getAllCellEnabledGroupConversations: () => conversations,
  }) as ConversationRepository;

describe('getDriveEnabledConversations', () => {
  it('returns drive-enabled conversations sorted by recent first', () => {
    const oldest = createConversation({id: 'oldest', lastEventTimestamp: 1_000});
    const newest = createConversation({id: 'newest', lastEventTimestamp: 3_000});
    const middle = createConversation({id: 'middle', lastEventTimestamp: 2_000});

    const conversations = getDriveEnabledConversations(createConversationRepository([oldest, newest, middle]));

    expect(conversations).toEqual([newest, middle, oldest]);
  });

  it('returns an empty array when there are no drive-enabled conversations', () => {
    expect(getDriveEnabledConversations(createConversationRepository([]))).toEqual([]);
  });
});
