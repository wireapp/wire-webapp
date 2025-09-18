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

import {MLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';

import {initMLSGroupConversations, initialiseSelfAndTeamConversations} from './MLSConversations';

function createMLSConversation(type?: CONVERSATION_TYPE, epoch = 0): MLSConversation {
  const conversation = new Conversation(randomUUID(), '', ConversationProtocol.MLS);
  conversation.groupId = `groupid-${randomUUID()}`;
  conversation.epoch = epoch;
  if (type !== undefined) {
    conversation.type(type);
  }
  return conversation as MLSConversation;
}

function createMLSConversations(nbConversations: number, type?: CONVERSATION_TYPE) {
  return Array.from(new Array(nbConversations)).map(() => createMLSConversation(type));
}

describe('MLSConversations', () => {
  describe('initMLSGroupConversations', () => {
    it('joins all the unestablished MLS groups', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const mlsConversations = createMLSConversations(nbMLSConversations, CONVERSATION_TYPE.REGULAR);

      jest.spyOn(core.service!.conversation, 'mlsGroupExistsLocally').mockResolvedValue(false);
      jest.spyOn(core.service!.conversation, 'joinByExternalCommit');

      await initMLSGroupConversations(mlsConversations, new User(), {core});

      for (const conversation of mlsConversations) {
        expect(core.service?.conversation.joinByExternalCommit).toHaveBeenCalledWith(conversation.qualifiedId);
      }
    });
  });

  it('schedules key renewal intervals for all already established mls groups', async () => {
    const core = new Account();
    const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

    const mlsConversations = createMLSConversations(nbMLSConversations, CONVERSATION_TYPE.REGULAR);

    jest.spyOn(core.service!.conversation!, 'mlsGroupExistsLocally').mockResolvedValue(true);
    jest.spyOn(core.service!.mls!, 'scheduleKeyMaterialRenewal');

    await initMLSGroupConversations(mlsConversations, new User(), {core});

    for (const conversation of mlsConversations) {
      expect(core.service!.mls!.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(conversation.groupId);
    }
  });

  describe('initialiseSelfAndTeamConversations', () => {
    it('register unestablished team and self mls conversations', async () => {
      const core = new Account();
      const nbMLSConversations = 5 + Math.ceil(Math.random() * 10);

      const selfConversation = createMLSConversation(CONVERSATION_TYPE.SELF);

      const teamConversation = createMLSConversation(CONVERSATION_TYPE.GLOBAL_TEAM);
      jest.spyOn(core.service!.conversation!, 'mlsGroupExistsLocally').mockResolvedValue(true);
      jest.spyOn(core.service!.mls!, 'scheduleKeyMaterialRenewal');

      const mlsConversations = createMLSConversations(nbMLSConversations);
      const conversations = [teamConversation, ...mlsConversations, selfConversation];

      await initialiseSelfAndTeamConversations(conversations, new User(), 'client-1', core);

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

      await initialiseSelfAndTeamConversations(conversations, new User(), 'clientId', core);

      expect(core.service!.mls!.registerConversation).toHaveBeenCalledTimes(0);
    });

    it('joins self and team conversation with external commit that have epoch > 0', async () => {
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

      // MLS group is not yet established locally
      jest.spyOn(core.service!.mls!, 'isConversationEstablished').mockResolvedValue(false);

      await initialiseSelfAndTeamConversations(conversations, new User(), 'clientId', core);

      expect(core.service!.mls!.registerConversation).toHaveBeenCalledTimes(0);
      expect(core.service!.conversation!.joinByExternalCommit).toHaveBeenCalledTimes(2);
    });

    it('DOES NOT join self and team conversation with external commit that have epoch > 0, but is already established locally', async () => {
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

      jest.spyOn(core.service!.mls!, 'isConversationEstablished').mockResolvedValue(true);

      await initialiseSelfAndTeamConversations(conversations, new User(), 'clientId', core);

      expect(core.service!.mls!.registerConversation).not.toHaveBeenCalled();
      expect(core.service!.conversation!.joinByExternalCommit).not.toHaveBeenCalled();
    });
  });
});
