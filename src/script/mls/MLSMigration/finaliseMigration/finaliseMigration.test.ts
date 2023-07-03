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
import {FeatureStatus} from '@wireapp/api-client/lib/team';

import {MixedConversation, MLSConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {TeamState} from 'src/script/team/TeamState';
import {TestFactory} from 'test/helper/TestFactory';
import {generateUser} from 'test/helper/UserGenerator';
import {createUuid} from 'Util/uuid';

import {finaliseMigrationOfMixedConversations} from './finaliseMigration';

const createMixedConversation = (): MixedConversation => {
  const conversation = new Conversation(createUuid(), '', ConversationProtocol.MIXED);
  const mockGroupId = 'groupId';
  conversation.groupId = mockGroupId;
  conversation.type(CONVERSATION_TYPE.REGULAR);
  return conversation as MixedConversation;
};

const changeConversationProtocolToMLS = (conversation: MixedConversation): MLSConversation => {
  return {
    ...conversation,
    protocol: ConversationProtocol.MLS,
  } as MLSConversation;
};

const injectParticipantsIntoConversation = (
  conversation: Conversation,
  {doAllSupportMLS}: {doAllSupportMLS: boolean},
) => {
  const usersSupportingMLS = Array(5)
    .fill(0)
    .map(() => {
      const user = generateUser({id: createUuid(), domain: 'test.wire.test'});
      user.supportedProtocols([ConversationProtocol.PROTEUS, ConversationProtocol.MLS]);
      return user;
    });

  if (!doAllSupportMLS) {
    const userNotSupportingMLS = generateUser({id: createUuid(), domain: 'test.wire.test'});
    userNotSupportingMLS.supportedProtocols([ConversationProtocol.PROTEUS]);
    return conversation.participating_user_ets([...usersSupportingMLS, userNotSupportingMLS]);
  }

  return conversation.participating_user_ets(usersSupportingMLS);
};

const testFactory = new TestFactory();

describe('finaliseMigrationOfMixedConversations', () => {
  it('should finalise when finaliseRegardlessAfter date arrived', async () => {
    const conversationRepository = await testFactory.exposeConversationActors();
    const teamState = new TeamState();

    const mixedConversation = createMixedConversation();
    const mlsConversation = changeConversationProtocolToMLS(mixedConversation);

    jest.spyOn(teamState, 'teamFeatures').mockReturnValueOnce({
      mlsMigration: {
        status: FeatureStatus.ENABLED,
        config: {
          startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), //week before
          finaliseRegardlessAfter: new Date().toISOString(),
        },
      },
    });

    jest.spyOn(conversationRepository, 'updateConversationProtocol').mockResolvedValueOnce(mlsConversation);

    await finaliseMigrationOfMixedConversations([mixedConversation], {teamState, conversationRepository});

    expect(conversationRepository.updateConversationProtocol).toHaveBeenCalledWith(
      mixedConversation,
      ConversationProtocol.MLS,
    );
  });

  it('should finalise when all conversation participants support MLS', async () => {
    const conversationRepository = await testFactory.exposeConversationActors();
    const teamState = new TeamState();

    const mixedConversation = createMixedConversation();
    injectParticipantsIntoConversation(mixedConversation, {doAllSupportMLS: true});

    const mlsConversation = changeConversationProtocolToMLS(mixedConversation);

    jest.spyOn(teamState, 'teamFeatures').mockReturnValueOnce({
      mlsMigration: {
        status: FeatureStatus.ENABLED,
        config: {
          startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), //week before
          finaliseRegardlessAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), //week after
        },
      },
    });

    jest.spyOn(conversationRepository, 'updateConversationProtocol').mockResolvedValueOnce(mlsConversation);

    await finaliseMigrationOfMixedConversations([mixedConversation], {teamState, conversationRepository});

    expect(conversationRepository.updateConversationProtocol).toHaveBeenCalledWith(
      mixedConversation,
      ConversationProtocol.MLS,
    );
  });

  it('should not be finalized if none of the requirements are met', async () => {
    const conversationRepository = await testFactory.exposeConversationActors();
    const teamState = new TeamState();

    const mixedConversation = createMixedConversation();
    injectParticipantsIntoConversation(mixedConversation, {doAllSupportMLS: false});

    jest.spyOn(teamState, 'teamFeatures').mockReturnValueOnce({
      mlsMigration: {
        status: FeatureStatus.ENABLED,
        config: {
          startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), //week before
          finaliseRegardlessAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), //week after
        },
      },
    });

    jest.spyOn(conversationRepository, 'updateConversationProtocol');

    await finaliseMigrationOfMixedConversations([mixedConversation], {teamState, conversationRepository});

    expect(conversationRepository.updateConversationProtocol).not.toHaveBeenCalled();
  });
});
