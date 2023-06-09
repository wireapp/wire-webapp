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

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';

import {joinUnestablishedMixedConversations} from './';

const createMixedConversation = (mockGroupId: string): MixedConversation => {
  const conversation = new Conversation(createUuid(), '', ConversationProtocol.MIXED);
  conversation.groupId = mockGroupId;
  conversation.type(CONVERSATION_TYPE.REGULAR);
  return conversation as MixedConversation;
};

const mockCore = container.resolve(Core);

describe('tryEstablishingMLSGroupForMixedConversation', () => {
  it('Should join known "mixed" conversations with unestablished MLS groups', async () => {
    const mixedConversation1 = createMixedConversation('groupId1');
    const mixedConversation2 = createMixedConversation('groupId2');
    const mixedConversation3 = createMixedConversation('unestablishedGroup3');
    const mixedConversation4 = createMixedConversation('unestablishedGroup4');

    jest.spyOn(mockCore.service!.conversation!, 'isMLSConversationEstablished').mockImplementation(groupId => {
      return Promise.resolve(!groupId.includes('unestablished'));
    });

    await joinUnestablishedMixedConversations(
      [mixedConversation1, mixedConversation2, mixedConversation3, mixedConversation4],
      {
        core: mockCore,
      },
    );

    expect(mockCore.service?.conversation?.isMLSConversationEstablished).toHaveBeenCalledTimes(4);
    expect(mockCore.service?.conversation?.joinByExternalCommit).toHaveBeenCalledTimes(2);

    expect(mockCore.service?.conversation?.joinByExternalCommit).toHaveBeenCalledWith(mixedConversation3.qualifiedId);
    expect(mockCore.service?.conversation?.joinByExternalCommit).toHaveBeenCalledWith(mixedConversation4.qualifiedId);
  });
});
