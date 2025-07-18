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

import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {container} from 'tsyringe';

import {MixedConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {Core} from 'src/script/service/CoreSingleton';
import {TestFactory} from 'test/helper/TestFactory';
import {createUuid} from 'Util/uuid';

import {joinUnestablishedMixedConversations} from '.';

const createMixedConversation = (mockGroupId: string, epoch = 1): MixedConversation => {
  const conversation = new Conversation(createUuid(), '', ConversationProtocol.MIXED);
  conversation.groupId = mockGroupId;
  conversation.type(CONVERSATION_TYPE.REGULAR);
  conversation.epoch = epoch;
  return conversation as MixedConversation;
};

const mockCore = container.resolve(Core);

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

    jest.spyOn(mockCore.service!.conversation!, 'mlsGroupExistsLocally').mockImplementation(groupId => {
      return Promise.resolve(!groupId.includes('unestablished'));
    });

    const mockedConversationRepository = await testFactory.exposeConversationActors();

    await joinUnestablishedMixedConversations(
      [mixedConversation1, mixedConversation2, mixedConversation3, mixedConversation4],
      selfUser.qualifiedId,
      {
        core: mockCore,
        conversationHandler: mockedConversationRepository,
      },
    );

    expect(mockCore.service?.conversation?.mlsGroupExistsLocally).toHaveBeenCalledTimes(4);
    expect(mockCore.service?.conversation?.joinByExternalCommit).toHaveBeenCalledTimes(2);

    expect(mockCore.service?.conversation?.joinByExternalCommit).toHaveBeenCalledWith(mixedConversation3.qualifiedId);
    expect(mockCore.service?.conversation?.joinByExternalCommit).toHaveBeenCalledWith(mixedConversation4.qualifiedId);
  });

  it('Should establish not initialised (epoch 0) mls groups for known "mixed" conversations', async () => {
    const mixedConversation1 = createMixedConversation('groupId1');
    const mixedConversation2 = createMixedConversation('groupId2');
    const mixedConversation3 = createMixedConversation('unestablishedGroup3', 0);
    const mixedConversation4 = createMixedConversation('unestablishedGroup4', 0);

    const selfUser = new User(createUuid(), 'domain');

    jest.spyOn(mockCore.service!.conversation!, 'mlsGroupExistsLocally').mockImplementation(groupId => {
      return Promise.resolve(!groupId.includes('unestablished'));
    });

    const mockedConversationRepository = await testFactory.exposeConversationActors();
    jest.spyOn(mockedConversationRepository, 'tryEstablishingMLSGroup');

    await joinUnestablishedMixedConversations(
      [mixedConversation1, mixedConversation2, mixedConversation3, mixedConversation4],
      selfUser.qualifiedId,
      {
        core: mockCore,
        conversationHandler: mockedConversationRepository,
      },
    );

    expect(mockCore.service?.conversation?.mlsGroupExistsLocally).toHaveBeenCalledTimes(2);
    expect(mockCore.service?.conversation?.joinByExternalCommit).not.toHaveBeenCalled();

    expect(mockedConversationRepository.tryEstablishingMLSGroup).toHaveBeenCalledTimes(2);
  });
});
