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
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {MixedConversation, ProteusConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {TestFactory} from 'test/helper/TestFactory';
import {createUuid} from 'Util/uuid';

import {initialiseMigrationOfProteusConversations} from '.';

const selfUserId = {id: 'self-user-id', domain: 'local.wire.link'};

const createProteusConversation = (userIds: QualifiedId[] = []): ProteusConversation => {
  const conversation = new Conversation(createUuid(), 'local.wire.link', CONVERSATION_PROTOCOL.PROTEUS);
  conversation.participating_user_ids.push(...userIds);
  conversation.type(CONVERSATION_TYPE.REGULAR);
  return conversation as ProteusConversation;
};

const changeConversationProtocolToMixed = (conversation: Conversation, groupId: string): MixedConversation => {
  return {
    ...conversation,
    qualifiedId: conversation.qualifiedId,
    groupId,
    protocol: CONVERSATION_PROTOCOL.MIXED,
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

    await initialiseMigrationOfProteusConversations([proteusConversation], selfUserId, mockedConversationRepository);

    expect(container.resolve(Core).service?.conversation.tryEstablishingMLSGroup).not.toHaveBeenCalled();
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

    await initialiseMigrationOfProteusConversations([proteusConversation], selfUserId, mockedConversationRepository);

    expect(mockedConversationRepository.updateConversationProtocol).toHaveBeenCalledTimes(1);
    expect(mockedConversationRepository.updateConversationProtocol).toHaveBeenCalledWith(
      proteusConversation,
      CONVERSATION_PROTOCOL.MIXED,
    );

    expect(container.resolve(Core).service?.conversation.tryEstablishingMLSGroup).toHaveBeenCalled();
  });
});
