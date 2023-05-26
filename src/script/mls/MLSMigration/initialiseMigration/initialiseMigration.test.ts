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

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MixedConversation, ProteusConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
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

const getConversationRepositoryMock = (mockGroupId = 'groupId') => {
  const mockedConversationRepository = {
    updateConversationProtocol: jest.fn().mockImplementation((proteusConversation, protocol) => {
      const mixedConversation = {
        ...proteusConversation,
        qualifiedId: proteusConversation.qualifiedId,
        protocol,
        epoch: 1,
        cipherSuite: 1,
        groupId: mockGroupId,
      } as MixedConversation;
      return Promise.resolve(mixedConversation);
    }),
  } as unknown as ConversationRepository;

  return mockedConversationRepository;
};

describe('initialiseMigrationOfProteusConversations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should not try to establish MLS group if conversation was not updated to mixed', async () => {
    const proteusConversation = createProteusConversation();
    const mockedConversationRepository = getConversationRepositoryMock();

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
    const mockedConversationRepository = getConversationRepositoryMock();

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
    const mockedConversationRepository = getConversationRepositoryMock(mockGroupId);

    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(false);
    jest.spyOn(mockCore.service!.mls!, 'registerConversation').mockResolvedValueOnce(null);

    await initialiseMigrationOfProteusConversations([proteusConversation], {
      conversationRepository: mockedConversationRepository,
      core: mockCore,
      selfUserId,
    });

    expect(mockCore.service!.mls!.registerConversation).toHaveBeenCalledWith(mockGroupId, [], {
      client: selfUserClientId,
      user: selfUserId,
    });
    expect(mockCore.service!.mls!.wipeConversation).toHaveBeenCalledWith(mockGroupId);
    expect(mockCore.service!.conversation!.addUsersToMLSConversation).not.toHaveBeenCalled();
  });

  it('Should initialise migration for proteus conversations and add other users to MLS group', async () => {
    const conversationMembers = Array(3)
      .fill(0)
      .map(() => ({id: createUuid(), domain: 'local.wire.com'}));

    const proteusConversation = createProteusConversation(conversationMembers);

    const mockGroupId = 'niceGroupId';
    const mockedConversationRepository = getConversationRepositoryMock(mockGroupId);

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
