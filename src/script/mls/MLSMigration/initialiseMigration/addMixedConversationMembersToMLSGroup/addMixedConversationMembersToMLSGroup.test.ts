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

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';

import {addMixedConversationMembersToMLSGroup} from './addMixedConversationMembersToMLSGroup';

const createMixedConversation = (userIds: QualifiedId[]): MixedConversation => {
  const conversation = new Conversation(createUuid(), '', ConversationProtocol.MIXED);
  const mockGroupId = 'groupId';
  conversation.groupId = mockGroupId;
  conversation.participating_user_ids.push(...userIds);
  conversation.type(CONVERSATION_TYPE.REGULAR);
  return conversation as MixedConversation;
};

const mockCore = container.resolve(Core);
const selfUserClientId = 'clientId';

const selfUserId = {id: 'self-user-id', domain: 'local.wire.com'};

describe('addMixedConversationMembersToMLSGroup', () => {
  Object.defineProperty(mockCore, 'clientId', {value: selfUserClientId});

  it('should add all mixed conversation members to MLS group', async () => {
    const conversationMembers = Array(3)
      .fill(0)
      .map(() => ({id: createUuid(), domain: 'local.wire.com'}));

    const mixedConversation = createMixedConversation(conversationMembers);

    await addMixedConversationMembersToMLSGroup(mixedConversation, {core: mockCore, selfUserId});

    expect(mockCore.service?.conversation.addUsersToMLSConversation).toHaveBeenCalledWith({
      groupId: mixedConversation.groupId,
      conversationId: mixedConversation.qualifiedId,
      qualifiedUsers: [...conversationMembers, {...selfUserId, skipOwnClientId: selfUserClientId}],
    });
  });

  it('should still add other self-user clients if conversation has only one (self) user', async () => {
    const mixedConversation = createMixedConversation([]);

    await addMixedConversationMembersToMLSGroup(mixedConversation, {core: mockCore, selfUserId});
    expect(mockCore.service?.conversation.addUsersToMLSConversation).toHaveBeenCalledWith({
      groupId: mixedConversation.groupId,
      conversationId: mixedConversation.qualifiedId,
      qualifiedUsers: [{...selfUserId, skipOwnClientId: selfUserClientId}],
    });
  });
});
