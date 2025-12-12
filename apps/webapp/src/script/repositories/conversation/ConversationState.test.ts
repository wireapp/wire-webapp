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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {randomUUID} from 'crypto';

import {Conversation} from 'Repositories/entity/Conversation';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';

import {ConversationState} from './ConversationState';

function createConversationState() {
  return new ConversationState(new UserState(), new TeamState());
}

function createConversation(protocol?: CONVERSATION_PROTOCOL, type?: CONVERSATION_TYPE) {
  const conversation = new Conversation(randomUUID(), '', protocol);
  if (protocol === CONVERSATION_PROTOCOL.MLS) {
    conversation.groupId = `groupid-${randomUUID()}`;
    conversation.epoch = 0;
  }
  if (type) {
    conversation.type(type);
  }
  return conversation;
}

describe('ConversationState', () => {
  const selfProteusConversation = createConversation(CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_TYPE.SELF);
  const selfMLSConversation = createConversation(CONVERSATION_PROTOCOL.MLS, CONVERSATION_TYPE.SELF);
  const regularConversation = createConversation();

  describe('getSelfProteusConversation', () => {
    it('throws if no self conversation are set', () => {
      const conversationState = createConversationState();
      expect(() => conversationState.getSelfProteusConversation()).toThrow('proteus');
    });

    it('finds the MLS and proteus self conversations', () => {
      const conversationState = createConversationState();
      conversationState.conversations([selfProteusConversation, selfMLSConversation, regularConversation]);
      expect(conversationState.getSelfProteusConversation()).toBe(selfProteusConversation);
    });
  });

  describe('getSelfConversations', () => {
    it('returns empty array if there are no self conversations', () => {
      const conversationState = createConversationState();
      expect(conversationState.getSelfConversations(true)).toEqual([]);
      conversationState.conversations([selfProteusConversation, selfMLSConversation, regularConversation]);
    });

    it('returns only proteus self conversation', () => {
      const conversationState = createConversationState();
      conversationState.conversations([selfProteusConversation, regularConversation]);
      expect(conversationState.getSelfConversations(true)).toEqual([selfProteusConversation]);
    });

    it('returns only mls self conversation', () => {
      const conversationState = createConversationState();
      conversationState.conversations([selfMLSConversation, regularConversation]);
      expect(conversationState.getSelfConversations(true)).toEqual([selfMLSConversation]);
    });

    it('returns both the self MLS and proteus conversations', () => {
      const conversationState = createConversationState();
      conversationState.conversations([selfProteusConversation, selfMLSConversation, regularConversation]);
      expect(conversationState.getSelfConversations(true)).toEqual([selfProteusConversation, selfMLSConversation]);
    });

    it('filters out mls conversation if not supported', () => {
      const conversationState = createConversationState();
      conversationState.conversations([selfProteusConversation, selfMLSConversation, regularConversation]);
      expect(conversationState.getSelfConversations(false)).toEqual([selfProteusConversation]);
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
        createConversation(CONVERSATION_PROTOCOL.MLS),
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
