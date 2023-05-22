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

import {tryEstablishingMLSGroupForMixedConversation} from './';

const createMixedConversation = (): MixedConversation => {
  const conversation = new Conversation(createUuid(), '', ConversationProtocol.MIXED);
  const mockGroupId = 'groupId';
  conversation.groupId = mockGroupId;
  conversation.type(CONVERSATION_TYPE.REGULAR);
  return conversation as MixedConversation;
};

const mockCore = container.resolve(Core);
const selfUserClientId = 'clientId';

const selfUserId = {id: 'self-user-id', domain: 'local.wire.com'};

describe('tryEstablishingMLSGroupForMixedConversation', () => {
  Object.defineProperty(mockCore, 'clientId', {value: selfUserClientId});

  it('Should not try to establish mls group if it already exists locally', async () => {
    const mixedConversation = createMixedConversation();

    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(true);

    const hasEstablishedMLSGroup = await tryEstablishingMLSGroupForMixedConversation(mixedConversation, {
      core: mockCore,
      selfUserId,
    });

    expect(mockCore.service?.mls?.registerConversation).not.toHaveBeenCalled();
    expect(hasEstablishedMLSGroup).toEqual(false);
  });

  it('Should wipe conversation if conversation was not established properly', async () => {
    const mixedConversation = createMixedConversation();

    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(false);
    jest.spyOn(mockCore.service!.mls!, 'registerConversation').mockResolvedValueOnce(null);

    const hasEstablishedMLSGroup = await tryEstablishingMLSGroupForMixedConversation(mixedConversation, {
      core: mockCore,
      selfUserId,
    });

    const groupCreator = {user: selfUserId, client: selfUserClientId};
    expect(mockCore.service?.mls?.registerConversation).toHaveBeenCalledWith(
      mixedConversation.groupId,
      [],
      groupCreator,
    );
    expect(mockCore.service?.mls?.wipeConversation).toHaveBeenCalledWith(mixedConversation.groupId);

    expect(hasEstablishedMLSGroup).toEqual(false);
  });

  it('Should return true if group was initialised successfully', async () => {
    const mixedConversation = createMixedConversation();

    jest.spyOn(mockCore.service!.mls!, 'conversationExists').mockResolvedValueOnce(false);
    jest.spyOn(mockCore.service!.mls!, 'registerConversation').mockResolvedValueOnce({events: [], time: ''});

    const hasEstablishedMLSGroup = await tryEstablishingMLSGroupForMixedConversation(mixedConversation, {
      core: mockCore,
      selfUserId,
    });

    const groupCreator = {user: selfUserId, client: selfUserClientId};
    expect(mockCore.service?.mls?.registerConversation).toHaveBeenCalledWith(
      mixedConversation.groupId,
      [],
      groupCreator,
    );

    expect(hasEstablishedMLSGroup).toEqual(true);
  });
});
