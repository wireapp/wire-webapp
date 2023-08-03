/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Account} from '@wireapp/core';

import {initMLSConversations, registerUninitializedSelfAndTeamConversations} from './MLSConversations';
import {useMLSConversationState} from './mlsConversationState';

import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

function createConversation(protocol: ConversationProtocol, type?: CONVERSATION_TYPE) {
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

function createConversations(
  nbConversations: number,
  protocol: ConversationProtocol = ConversationProtocol.MLS,
  type?: CONVERSATION_TYPE,
) {
  return Array.from(new Array(nbConversations)).map(() => createConversation(protocol, type));
}

describe('MLSConversations', () => {
  beforeEach(() => {
    jest.spyOn(useMLSConversationState.getState(), 'sendExternalToPendingJoin').mockReturnValue(undefined);
  });

  describe('initMLSConversations', () => {
    it('joins all the MLS conversations', async () => {
      const nbProteusConversations = 5 + Math.ceil(Math.random() * 10);
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const proteusConversations = createConversations(nbProteusConversations, ConversationProtocol.PROTEUS);
      const mlsConversations = createConversations(nbMLSConversations);
      const conversations = [...proteusConversations, ...mlsConversations];

      await initMLSConversations(conversations, new Account());

      expect(useMLSConversationState.getState().sendExternalToPendingJoin).toHaveBeenCalledWith(
        mlsConversations,
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('schedules key renewal intervals for all the mls groups', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const mlsConversations = createConversations(nbMLSConversations);

      await initMLSConversations(mlsConversations, core);

      expect(core.service!.mls!.schedulePeriodicKeyMaterialRenewals).toHaveBeenCalledWith(
        mlsConversations.map(c => c.groupId),
      );
    });

    it('register all uninitiated conversations', async () => {
      const core = new Account();
      const nbProteusConversations = 5 + Math.ceil(Math.random() * 10);
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const proteusConversations = createConversations(nbProteusConversations, ConversationProtocol.PROTEUS);
      const selfConversation = createConversation(ConversationProtocol.MLS, CONVERSATION_TYPE.SELF);

      const teamConversation = createConversation(ConversationProtocol.MLS, CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createConversations(nbMLSConversations);
      const conversations = [...proteusConversations, teamConversation, ...mlsConversations, selfConversation];

      await registerUninitializedSelfAndTeamConversations(conversations, new User(), 'client-1', core);

      expect(core.service!.mls.registerConversation).toHaveBeenCalledTimes(2);
    });

    it('does not register self and team conversation that have epoch > 0', async () => {
      const core = new Account();
      const nbProteusConversations = 5 + Math.ceil(Math.random() * 10);
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const proteusConversations = createConversations(nbProteusConversations, ConversationProtocol.PROTEUS);
      const selfConversation = createConversation(ConversationProtocol.MLS);
      selfConversation.epoch = 1;
      selfConversation.type(CONVERSATION_TYPE.SELF);

      const teamConversation = createConversation(ConversationProtocol.MLS);
      teamConversation.epoch = 2;
      teamConversation.type(CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createConversations(nbMLSConversations);
      const conversations = [...proteusConversations, teamConversation, ...mlsConversations, selfConversation];

      await initMLSConversations(conversations, core);

      expect(core.service!.mls.registerConversation).toHaveBeenCalledTimes(0);
    });
  });
});
