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

import createVanilla from 'zustand/vanilla';
import create from 'zustand';
import {Conversation} from '../../entity/Conversation';
import {loadState, saveState} from './conversationStateStorage';

export interface MLSConversationState {
  /** list of conversations that are fully joined */
  established: Set<string>;
  /** list of conversations that are waiting for a welcome */
  pendingWelcome: Set<string>;
}

const initialState = loadState();

export const mlsConversationState = createVanilla<
  MLSConversationState & {
    isEstablished: (conversationId: string) => boolean;
    isPendingWelcome: (conversationId: string) => boolean;
    markAsEstablished: (conversationId: string) => void;
    markAsPendingWelcome: (conversationId: string) => void;
    /**
     * Will send external proposal for all the conversations that are not pendingWelcome or established
     * @param conversations The conversations that we want to process (only the mls conversations will be considered)
     * @param sendExternalProposal Callback that will be called with every conversation that needs an external proposal
     */
    sendExternalToPendingJoin(
      conversations: Conversation[],
      sendExternalProposal: (conversation: Conversation) => Promise<void>,
    ): Promise<void>;
  }
>((set, get) => ({
  established: initialState.established,
  isEstablished: conversationId => get().established.has(conversationId),

  isPendingWelcome: conversationId => get().pendingWelcome.has(conversationId),

  markAsEstablished: conversationId =>
    set(state => ({
      ...state,
      established: state.established.add(conversationId),
    })),

  markAsPendingWelcome: conversationId =>
    set(state => ({
      ...state,
      pendingWelcome: state.pendingWelcome.add(conversationId),
    })),

  pendingWelcome: initialState.pendingWelcome,

  async sendExternalToPendingJoin(conversations, sendExternalProposal): Promise<void> {
    const currentState = get();
    const pendingConversations = conversations.filter(
      conversation =>
        conversation.protocol === 'mls' &&
        !currentState.isEstablished(conversation.id) &&
        !currentState.isPendingWelcome(conversation.id),
    );

    await pendingConversations.map(sendExternalProposal);

    set({
      established: new Set(),
      pendingWelcome: new Set([
        ...currentState.pendingWelcome,
        ...pendingConversations.map(conversation => conversation.id),
      ]),
    });
  },
}));

/**
 * react hook to manipulate the MLS conversation state
 */
export const useMLSConversationState = create(mlsConversationState);

mlsConversationState.subscribe(saveState);
