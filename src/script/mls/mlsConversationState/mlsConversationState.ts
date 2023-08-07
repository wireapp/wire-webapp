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

import {loadState, saveState} from './conversationStateStorage';

import {Conversation} from '../../entity/Conversation';

export interface MLSConversationState {
  /** list of conversations that are already established */
  established: Set<string>;
}

const initialState = loadState();

type StoreState = MLSConversationState & {
  isEstablished: (groupId: string) => boolean;
  filterEstablishedConversations: (conversations: Conversation[]) => Conversation[];
  markAsEstablished: (groupId: string) => void;
  wipeConversationState: (groupId: string) => void;
  /**
   * Will join all the conversations that are not already established  with external commits.
   * @param conversations conversations that we want to process (only the mls conversations will be considered)
   * @param isAlreadyEstablished callback to check if a conversation is already established
   * @param joinWithExternalCommit callback to join a conversation with an external commit
   */
  joinWithExternalCommit(
    conversations: Conversation[],
    isAlreadyEstablished: (groupId: string) => Promise<boolean>,
    joinWithExternalCommit: (conversationId: QualifiedId) => Promise<unknown>,
  ): Promise<void>;
};

export const useMLSConversationState = create<StoreState>((set, get) => {
  return {
    established: initialState.established,
    filterEstablishedConversations: conversations =>
      conversations.filter(conversation => !conversation.groupId || get().isEstablished(conversation.groupId)),

    isEstablished: groupId => get().established.has(groupId),

    markAsEstablished: groupId =>
      set(state => {
        const established = new Set(state.established);
        established.add(groupId);

        return {
          established,
        };
      }),

    async joinWithExternalCommit(conversations, isAlreadyEstablished, sendExternalCommit): Promise<void> {
      const currentState = get();
      const conversationsToJoin: {groupId: string; conversationId: QualifiedId}[] = [];
      const pendingConversations: string[] = [];
      const alreadyEstablishedConversations: string[] = [];

      for (const conversation of conversations) {
        const groupId = conversation.groupId;
        if (!conversation.isUsingMLSProtocol || !groupId) {
          continue;
        }
        if (!currentState.isEstablished(groupId)) {
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
      });
    },

    wipeConversationState: groupId =>
      set(state => {
        const established = new Set(state.established);
        established.delete(groupId);

        return {
          ...state,
          established,
        };
      }),
  };
});

useMLSConversationState.subscribe(saveState);
