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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {create} from 'zustand';

import {isMLSCapableConversation} from 'src/script/conversation/ConversationSelectors';

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
    sendExternalProposal: (conversationId: QualifiedId) => Promise<unknown>,
  ): Promise<void>;
};

export const useMLSConversationState = create<StoreState>((set, get) => {
  return {
    established: initialState.established,
    filterEstablishedConversations: conversations =>
      conversations.filter(conversation => {
        const isMLS = isMLSCapableConversation(conversation);
        return !isMLS || get().isEstablished(conversation.groupId);
      }),

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

    async sendExternalToPendingJoin(conversations, isAlreadyEstablished, sendExternalCommit): Promise<void> {
      const currentState = get();
      const conversationsToJoin: {groupId: string; conversationId: QualifiedId}[] = [];
      const pendingConversations: string[] = [];
      const alreadyEstablishedConversations: string[] = [];

      for (const conversation of conversations) {
        if (!isMLSCapableConversation(conversation)) {
          continue;
        }
        const {groupId} = conversation;
        if (!currentState.isEstablished(groupId) && !currentState.isPendingWelcome(groupId)) {
          if (await isAlreadyEstablished(groupId)) {
            // check is the conversation is not actually already established
            alreadyEstablishedConversations.push(groupId);
          } else {
            conversationsToJoin.push({conversationId: conversation.qualifiedId, groupId});
          }
        }
      }

      await Promise.all(
        conversationsToJoin.map(async ({conversationId, groupId}) => {
          try {
            await sendExternalCommit(conversationId);
            alreadyEstablishedConversations.push(groupId);
          } catch {
            pendingConversations.push(groupId);
          }
        }),
      );

      set({
        ...currentState,
        established: new Set([...currentState.established, ...alreadyEstablishedConversations]),
        pendingWelcome: new Set([...currentState.pendingWelcome, ...pendingConversations]),
      });
    },
  };
});

useMLSConversationState.subscribe(saveState);
