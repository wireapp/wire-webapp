/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {MixedConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {Core} from 'src/script/service/CoreSingleton';
import {TestFactory} from 'test/helper/TestFactory';
import {createUuid} from 'Util/uuid';

import {joinUnestablishedMixedConversations} from '.';

const createMixedConversation = (mockGroupId: string, epoch = 5): MixedConversation => {
  const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.MIXED);
  conversation.groupId = mockGroupId;
  conversation.type(CONVERSATION_TYPE.REGULAR);
  conversation.epoch = epoch;
  return conversation as MixedConversation;
};

describe('joinUnestablishedMixedConversations', () => {
  const testFactory = new TestFactory();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should join known "mixed" conversations with unestablished MLS groups', async () => {
    const mixedConversation1 = createMixedConversation('groupId1');
    const mixedConversation2 = createMixedConversation('groupId2');
    const mixedConversation3 = createMixedConversation('unestablishedGroup3');
    const mixedConversation4 = createMixedConversation('unestablishedGroup4');

    const selfUser = new User(createUuid(), 'domain');
    const mockedConversationRepository = await testFactory.exposeConversationActors();

    // Use the exact same core instance the repository was constructed with to avoid mismatched spies
    const repositoryCore = (mockedConversationRepository as any).core as Core; // core is a private ctor arg

    jest.spyOn(repositoryCore.service!.conversation!, 'mlsGroupExistsLocally').mockImplementation(groupId => {
      return Promise.resolve(!groupId.includes('unestablished'));
    });

    // Spy on joinByExternalCommit of the repository's core instance
    const joinSpy = jest.spyOn(repositoryCore.service!.conversation!, 'joinByExternalCommit');

    await joinUnestablishedMixedConversations(
      [mixedConversation1, mixedConversation2, mixedConversation3, mixedConversation4],
      mockedConversationRepository,
      selfUser.qualifiedId,
      {
        core: repositoryCore,
      },
    );
    expect(repositoryCore.service?.conversation?.mlsGroupExistsLocally).toHaveBeenCalledTimes(6);
    expect(joinSpy).toHaveBeenCalledTimes(2);
    expect(joinSpy).toHaveBeenCalledWith(mixedConversation3.qualifiedId);
    expect(joinSpy).toHaveBeenCalledWith(mixedConversation4.qualifiedId);
  });

  it('Should establish not initialised (epoch 0) mls groups for known "mixed" conversations', async () => {
    const mixedConversation1 = createMixedConversation('groupId1');
    const mixedConversation2 = createMixedConversation('groupId2');
    const mixedConversation3 = createMixedConversation('unestablishedGroup3', 0);
    const mixedConversation4 = createMixedConversation('unestablishedGroup4', 0);

    const selfUser = new User(createUuid(), 'domain');
    const mockedConversationRepository = await testFactory.exposeConversationActors();
    const repositoryCore = (mockedConversationRepository as any).core as Core;
    jest.spyOn(repositoryCore.service!.conversation!, 'mlsGroupExistsLocally').mockImplementation(groupId => {
      return Promise.resolve(!groupId.includes('unestablished'));
    });
    jest.spyOn(mockedConversationRepository, 'tryEstablishingMLSGroup');

    await joinUnestablishedMixedConversations(
      [mixedConversation1, mixedConversation2, mixedConversation3, mixedConversation4],
      mockedConversationRepository,
      selfUser.qualifiedId,
      {
        core: repositoryCore,
      },
    );
    expect(repositoryCore.service?.conversation?.mlsGroupExistsLocally).toHaveBeenCalledTimes(2);
    expect(repositoryCore.service?.conversation?.joinByExternalCommit).not.toHaveBeenCalled();
    expect(mockedConversationRepository.tryEstablishingMLSGroup).toHaveBeenCalledTimes(2);
  });
});
