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

import create from 'zustand';
import createVanilla from 'zustand/vanilla';

import {loadState, saveState} from './conversationStateStorage';

import {Conversation} from '../../entity/Conversation';

export interface MLSConversationState {
  /** list of conversations that are fully joined */
  established: Set<string>;
  /** list of conversations that are waiting for a welcome */
  pendingWelcome: Set<string>;
}

const initialState = loadState();

type StoreState = MLSConversationState & {
  isEstablished: (groupId: string) => boolean;
  isPendingWelcome: (groupId: string) => boolean;
  filterEstablishedConversations: (conversations: Conversation[]) => Conversation[];
  markAsEstablished: (groupId: string) => void;
  markAsPendingWelcome: (groupId: string) => void;
  /**
   * Will send external proposal for all the conversations that are not pendingWelcome or established
   * @param conversations The conversations that we want to process (only the mls conversations will be considered)
   * @param sendExternalProposal Callback that will be called with every conversation that needs an external proposal
   */
  sendExternalToPendingJoin(
    conversations: Conversation[],
    isEstablishedConversation: (groupId: string) => Promise<boolean>,
    sendExternalProposal: (conversationDetails: {groupId: string; epoch: number}) => Promise<void>,
  ): Promise<void>;
};

export const mlsConversationState = createVanilla<StoreState>((set, get) => {
  return {
    established: initialState.established,
    filterEstablishedConversations: conversations =>
      conversations.filter(conversation => !conversation.groupId || get().isEstablished(conversation.groupId)),

    isEstablished: groupId => get().established.has(groupId),

    isPendingWelcome: groupId => get().pendingWelcome.has(groupId),

    markAsEstablished: groupId =>
      set(state => ({
        ...state,
        established: state.established.add(groupId),
      })),

    markAsPendingWelcome: groupId =>
      set(state => ({
        ...state,
        pendingWelcome: state.pendingWelcome.add(groupId),
      })),

    pendingWelcome: initialState.pendingWelcome,

    async sendExternalToPendingJoin(conversations, isAlreadyEstablished, sendExternalProposal): Promise<void> {
      const currentState = get();
      const pendingConversations: {groupId: string; epoch: number}[] = [];
      const alreadyEstablishedConversations: string[] = [];

      for (const conversation of conversations) {
        const groupId = conversation.groupId;
        if (!conversation.isUsingMLSProtocol || !groupId) {
          continue;
        }
        if (!currentState.isEstablished(groupId) && !currentState.isPendingWelcome(groupId)) {
          if (await isAlreadyEstablished(groupId)) {
            // check is the conversation is not actually already established
            alreadyEstablishedConversations.push(groupId);
          } else {
            pendingConversations.push({epoch: conversation.epoch, groupId});
          }
        }
      }

      await pendingConversations.map(sendExternalProposal);

      set({
        ...currentState,
        established: new Set([...currentState.established, ...alreadyEstablishedConversations]),
        pendingWelcome: new Set([...currentState.pendingWelcome, ...pendingConversations.map(({groupId}) => groupId)]),
      });
    },
  };
});

/**
 * react hook to manipulate the MLS conversation state
 */
export const useMLSConversationState = create(mlsConversationState);

mlsConversationState.subscribe(saveState);
