/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ConversationProtocol} from '@wireapp/api-client/src/conversation';
import {createRandomUuid} from 'Util/util';
import {Conversation} from '../../entity/Conversation';
import {mlsConversationState} from './mlsConversationState';

describe('mlsPendingStateUtil', () => {
  const createConversations = (
    nb: number,
  ): {
    nbMlsConversations: number;
    nbProteusConversations: number;
    conversations: Conversation[];
  } => {
    const result = {conversations: [] as Conversation[], nbMlsConversations: 0, nbProteusConversations: 0};

    for (let i = 0; i < nb; i++) {
      const isMsl = Math.random() >= 0.5;
      result.conversations.push(
        new Conversation(createRandomUuid(), '', isMsl ? ConversationProtocol.MLS : ConversationProtocol.PROTEUS),
      );
      if (isMsl) {
        result.nbMlsConversations++;
      } else {
        result.nbProteusConversations++;
      }
    }
    return result;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('load initial state from localStorage when imported', async () => {
    const conversationId = 'conversation-id';
    mlsConversationState.getState().markAsEstablished(conversationId);

    const loadedMlsConversationState = await import('./mlsConversationState');

    expect(loadedMlsConversationState.mlsConversationState.getState().isEstablished(conversationId)).toBeTruthy();
  });

  it('sends external proposal to mls conversations that the device is not part of', async () => {
    const {conversations, nbMlsConversations} = createConversations(100);
    const sendExternalProposal = jest.fn();
    await mlsConversationState
      .getState()
      .sendExternalToPendingJoin(conversations, () => Promise.resolve(false), sendExternalProposal);

    expect(sendExternalProposal).toHaveBeenCalledTimes(nbMlsConversations);

    const sendExternalProposal2 = jest.fn();
    await mlsConversationState
      .getState()
      .sendExternalToPendingJoin(conversations, () => Promise.resolve(false), sendExternalProposal2);
    expect(sendExternalProposal2).not.toHaveBeenCalled();
  });

  it('marks conversation as established if they are already known', async () => {
    const conversations = [
      new Conversation(createRandomUuid(), '', ConversationProtocol.MLS),
      new Conversation(createRandomUuid(), '', ConversationProtocol.MLS),
      new Conversation(createRandomUuid(), '', ConversationProtocol.MLS),
    ];
    const sendExternalProposal = jest.fn();
    const currentSize = mlsConversationState.getState().established.size;
    await mlsConversationState
      .getState()
      .sendExternalToPendingJoin(conversations, () => Promise.resolve(true), sendExternalProposal);

    expect(sendExternalProposal).not.toHaveBeenCalled();
    expect(mlsConversationState.getState().established.size).toBe(currentSize + conversations.length);
  });

  it('sends external proposal only to conversations that are not pending and not established', async () => {
    const conversations = [
      new Conversation(createRandomUuid(), '', ConversationProtocol.MLS),
      new Conversation(createRandomUuid(), '', ConversationProtocol.MLS),
      new Conversation(createRandomUuid(), '', ConversationProtocol.MLS),
      new Conversation(createRandomUuid(), '', ConversationProtocol.PROTEUS),
    ];

    mlsConversationState.getState().markAsEstablished(conversations[1].id);
    mlsConversationState.getState().markAsPendingWelcome(conversations[2].id);

    const sendExternalProposal = jest.fn();
    await mlsConversationState
      .getState()
      .sendExternalToPendingJoin(conversations, () => Promise.resolve(false), sendExternalProposal);

    expect(sendExternalProposal).toHaveBeenCalledTimes(1);
  });
});
