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

import {
  initialiseEstablishedMLSCapableConversations,
  joinNewMLSConversations,
  registerUninitializedSelfAndTeamConversations,
} from './MLSConversations';
import {useMLSConversationState} from './mlsConversationState';

import {MLSConversation} from '../conversation/ConversationSelectors';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

function createMLSConversation(type?: CONVERSATION_TYPE): MLSConversation {
  const conversation = new Conversation(randomUUID(), '', ConversationProtocol.MLS);
  conversation.groupId = `groupid-${randomUUID()}`;
  conversation.epoch = 0;
  if (type) {
    conversation.type(type);
  }
  return conversation as MLSConversation;
}

function createMLSConversations(
  nbConversations: number,
  protocol: ConversationProtocol = ConversationProtocol.MLS,
  type?: CONVERSATION_TYPE,
) {
  return Array.from(new Array(nbConversations)).map(() => createMLSConversation(type));
}

describe('MLSConversations', () => {
  describe('joinNewMLSConversations', () => {
    it('joins all the MLS conversations', async () => {
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const mlsConversations = createMLSConversations(nbMLSConversations);

      jest.spyOn(useMLSConversationState.getState(), 'sendExternalToPendingJoin');

      await joinNewMLSConversations(mlsConversations, new Account());

      expect(useMLSConversationState.getState().sendExternalToPendingJoin).toHaveBeenCalledWith(
        mlsConversations,
        expect.any(Function),
        expect.any(Function),
        undefined,
      );
    });
  });

  describe('initialiseEstablishedMLSCapableConversations', () => {
    it('schedules key renewal intervals for all the established mls groups', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const mlsConversations = createMLSConversations(nbMLSConversations);

      jest
        .spyOn(useMLSConversationState, 'getState')
        .mockReturnValue({established: mlsConversations.map(c => c.groupId)} as any);

      await initialiseEstablishedMLSCapableConversations(core);

      expect(core.service!.mls!.schedulePeriodicKeyMaterialRenewals).toHaveBeenCalledWith(
        mlsConversations.map(c => c.groupId),
      );
    });
  });

  describe('registerUninitializedSelfAndTeamConversations', () => {
    it('register uninitiated team and self mls conversations', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation(CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];

      await registerUninitializedSelfAndTeamConversations(conversations, new User(), 'client-1', core);

      expect(core.service!.mls!.registerConversation).toHaveBeenCalledTimes(2);
    });

    it('does not register self and team conversation that have epoch > 0', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation();
      selfConversation.epoch = 1;
      selfConversation.type(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation();
      teamConversation.epoch = 2;
      teamConversation.type(CONVERSATION_TYPE.GLOBAL_TEAM);

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];

      await registerUninitializedSelfAndTeamConversations(conversations, new User(), 'clientId', core);

      expect(core.service!.mls!.registerConversation).toHaveBeenCalledTimes(0);
    });
  });
});
