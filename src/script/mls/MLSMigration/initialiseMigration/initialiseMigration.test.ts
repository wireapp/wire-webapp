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
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {MixedConversation, ProteusConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {TestFactory} from 'test/helper/TestFactory';
import {createUuid} from 'Util/uuid';

import {initialiseMigrationOfProteusConversations} from './';

const selfUserId = {id: 'self-user-id', domain: 'local.wire.link'};
const selfUserClientId = 'clientId';

const mockCore = container.resolve(Core);
Object.defineProperty(mockCore, 'clientId', {value: selfUserClientId});

const createProteusConversation = (userIds: QualifiedId[] = []): ProteusConversation => {
  const conversation = new Conversation(createUuid(), 'local.wire.link', ConversationProtocol.PROTEUS);
  conversation.participating_user_ids.push(...userIds);
  conversation.type(CONVERSATION_TYPE.REGULAR);
  return conversation as ProteusConversation;
};

const changeConversationProtocolToMixed = (conversation: Conversation, groupId: string): MixedConversation => {
  return {
    ...conversation,
    qualifiedId: conversation.qualifiedId,
    groupId,
    protocol: ConversationProtocol.MIXED,
  } as MixedConversation;
};

describe('initialiseMigrationOfProteusConversations', () => {
  const testFactory = new TestFactory();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should not try to establish MLS group if conversation was not updated to mixed', async () => {
    const proteusConversation = createProteusConversation();
    const mockedConversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockedConversationRepository, 'updateConversationProtocol').mockResolvedValueOnce(proteusConversation);

    await initialiseMigrationOfProteusConversations([proteusConversation], {
      conversationRepository: mockedConversationRepository,
      core: mockCore,
      selfUserId,
    });

    expect(mockCore.service!.mls!.conversationExists).not.toHaveBeenCalled();
    expect(mockCore.service!.mls!.registerConversation).not.toHaveBeenCalled();
    expect(mockedConversationRepository.updateConversationProtocol).toHaveBeenCalledTimes(1);
    expect(mockedConversationRepository.updateConversationProtocol).toHaveBeenCalledWith(
      proteusConversation,
      ConversationProtocol.MIXED,
    );
  });

  it('Should not add other users to MLS group if MLS group was already established', async () => {
    const proteusConversation = createProteusConversation();
    const mockGroupId = 'coolGroupId';
    const mockedConversationRepository = await testFactory.exposeConversationActors();

    const mixedConversation = changeConversationProtocolToMixed(proteusConversation, mockGroupId);
    jest.spyOn(mockedConversationRepository, 'updateConversationProtocol').mockResolvedValueOnce(mixedConversation);
    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

    await initialiseMigrationOfProteusConversations([proteusConversation], {
      conversationRepository: mockedConversationRepository,
      core: mockCore,
      selfUserId,
    });

    expect(mockCore.service!.mls!.registerConversation).not.toHaveBeenCalled();
  });

  it('Should not add other users to MLS group if and wipe conversation MLS group was not established properly', async () => {
    const proteusConversation = createProteusConversation();
    const mockGroupId = 'coolGroupId';
    const mockedConversationRepository = await testFactory.exposeConversationActors();

    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(false);
    jest.spyOn(mockCore.service!.mls!, 'registerConversation').mockRejectedValueOnce(null);
    jest.spyOn(mockCore.service!.conversation, 'wipeMLSConversation');

    const mixedConversation = changeConversationProtocolToMixed(proteusConversation, mockGroupId);
    jest.spyOn(mockedConversationRepository, 'updateConversationProtocol').mockResolvedValueOnce(mixedConversation);

    await initialiseMigrationOfProteusConversations([proteusConversation], {
      conversationRepository: mockedConversationRepository,
      core: mockCore,
      selfUserId,
    });

    expect(mockCore.service!.mls!.registerConversation).toHaveBeenCalledWith(mockGroupId, [], {
      client: selfUserClientId,
      user: selfUserId,
    });
    expect(mockedConversationRepository['core'].service?.conversation.wipeMLSConversation).toHaveBeenCalledWith(
      mockGroupId,
    );
    expect(mockCore.service!.conversation!.addUsersToMLSConversation).not.toHaveBeenCalled();
  });

  it('Should initialise migration for proteus conversations and add other users to MLS group', async () => {
    const conversationMembers = Array(3)
      .fill(0)
      .map(() => ({id: createUuid(), domain: 'local.wire.com'}));

    const proteusConversation = createProteusConversation(conversationMembers);

    const mockGroupId = 'niceGroupId';
    const mockedConversationRepository = await testFactory.exposeConversationActors();

    const mixedConversation = changeConversationProtocolToMixed(proteusConversation, mockGroupId);
    jest.spyOn(mockedConversationRepository, 'updateConversationProtocol').mockResolvedValueOnce(mixedConversation);
    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(false);
    jest.spyOn(mockCore.service!.mls!, 'registerConversation').mockResolvedValueOnce({events: [], time: 'time'});

    await initialiseMigrationOfProteusConversations([proteusConversation], {
      conversationRepository: mockedConversationRepository,
      core: mockCore,
      selfUserId,
    });

    expect(mockedConversationRepository.updateConversationProtocol).toHaveBeenCalledTimes(1);
    expect(mockedConversationRepository.updateConversationProtocol).toHaveBeenCalledWith(
      proteusConversation,
      ConversationProtocol.MIXED,
    );

    expect(mockCore.service!.mls!.registerConversation).toHaveBeenCalledWith(mockGroupId, [], {
      client: selfUserClientId,
      user: selfUserId,
    });
    expect(mockCore.service!.mls!.wipeConversation).not.toHaveBeenCalled();
    expect(mockCore.service!.conversation!.addUsersToMLSConversation).toHaveBeenCalledWith({
      conversationId: proteusConversation.qualifiedId,
      groupId: mockGroupId,
      qualifiedUsers: [...conversationMembers, {...selfUserId, skipOwnClientId: selfUserClientId}],
    });
  });
});
