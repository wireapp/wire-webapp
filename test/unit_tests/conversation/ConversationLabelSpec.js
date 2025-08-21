/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {ConversationLabelRepository} from 'Repositories/conversation/ConversationLabelRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {createUuid} from 'Util/uuid';

describe('ConversationLabelRepository', () => {
  const createConversation = isGroup => {
    const conversation = new Conversation(createUuid());
    conversation.isGroup = () => isGroup;
    return conversation;
  };

  const conversations = () => [
    createConversation(true),
    createConversation(false),
    createConversation(true),
    createConversation(false),
    createConversation(true),
  ];

  const conversationLabelRepository = new ConversationLabelRepository(conversations, conversations);

  describe('getGroupsWithoutLabel', () => {
    it('returns the right amount of unlabelled group conversations', () => {
      expect(conversationLabelRepository.getGroupsWithoutLabel().length).toEqual(3);
    });
  });

  describe('getContactsWithoutLabel', () => {
    it('returns the right amount of unlabelled 1to1 conversations', () => {
      expect(conversationLabelRepository.getContactsWithoutLabel().length).toEqual(2);
    });
  });
});
