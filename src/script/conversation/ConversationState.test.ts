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

import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';

import {randomUUID} from 'crypto';

import {ConversationState} from './ConversationState';

import {Conversation} from '../entity/Conversation';
import {TeamState} from '../team/TeamState';
import {UserState} from '../user/UserState';

function createConversationState() {
  return new ConversationState(new UserState(), new TeamState());
}

function createConversation(protocol?: ConversationProtocol, type?: CONVERSATION_TYPE) {
  const conversation = new Conversation(randomUUID(), '', protocol);
  if (protocol === ConversationProtocol.MLS) {
    conversation.groupId = `groupid-${randomUUID()}`;
    conversation.epoch = 0;
  }
  if (type) {
    conversation.type(type);
  }
  return conversation;
}

describe('ConversationState', () => {
  const selfProteusConversation = createConversation(ConversationProtocol.PROTEUS, CONVERSATION_TYPE.SELF);
  const selfMLSConversation = createConversation(ConversationProtocol.MLS, CONVERSATION_TYPE.SELF);
  const regularConversation = createConversation();

  describe('getSelfConversation', () => {
    it('throws if no self conversation are set', () => {
      const conversationState = createConversationState();
      expect(() => conversationState.getSelfConversation()).toThrow('proteus');
      expect(() => conversationState.getSelfConversation(true)).toThrow('MLS');
    });

    it('finds the MLS and proteus self conversations', () => {
      const conversationState = createConversationState();
      conversationState.conversations([selfProteusConversation, selfMLSConversation, regularConversation]);
      expect(conversationState.getSelfConversation()).toBe(selfProteusConversation);
      expect(conversationState.getSelfConversation(true)).toBe(selfMLSConversation);
    });
  });

  describe('isSelfConversation', () => {
    it('returns false if not self conversations are set', () => {
      const conversationState = createConversationState();
      expect(conversationState.isSelfConversation(regularConversation.qualifiedId)).toBeFalsy();
      expect(conversationState.isSelfConversation(selfMLSConversation.qualifiedId)).toBeFalsy();
      expect(conversationState.isSelfConversation(selfProteusConversation.qualifiedId)).toBeFalsy();
    });

    it('detects self proteus and mls conversations', () => {
      const conversationState = createConversationState();

      const conversations = [
        createConversation(ConversationProtocol.MLS),
        regularConversation,
        selfProteusConversation,
        selfMLSConversation,
      ];

      conversationState.conversations(conversations);

      expect(conversationState.isSelfConversation(regularConversation.qualifiedId)).toBeFalsy();
      expect(conversationState.isSelfConversation(selfMLSConversation.qualifiedId)).toBeTruthy();
      expect(conversationState.isSelfConversation(selfProteusConversation.qualifiedId)).toBeTruthy();
    });
  });
});
