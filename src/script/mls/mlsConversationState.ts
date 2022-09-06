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

import {Conversation} from '../entity/Conversation';

interface MLSConversationState {
  /** list of conversations that are fully joined */
  establishedConversations: string[];
  /** list of conversations that are waiting for a welcome */
  pendingWelcome: string[];
}

const storageKey = 'mlsPendingConversation';

const loadState = (): MLSConversationState => {
  const storedState = localStorage.getItem(storageKey);
  return storedState
    ? JSON.parse(storedState)
    : {
        establishedConversations: [],
        pendingWelcome: [],
      };
};

const saveState = (state: MLSConversationState): void => {
  localStorage.setItem(storageKey, JSON.stringify(state));
};

/**
 * Will send external proposal for all the conversations that are not pendingWelcome or established
 * @param conversations The conversations that we want to process (only the mls conversations will be considered)
 * @param sendExternalProposal Callback that will be called with every conversation that needs an external proposal
 */
export async function sendExternalToPendingJoin(
  conversations: Conversation[],
  sendExternalProposal: (conversation: Conversation) => Promise<void>,
): Promise<void> {
  const mlsConversationState = loadState();
  const pendingConversations = conversations.filter(
    conversation =>
      conversation.protocol === 'mls' &&
      !mlsConversationState.establishedConversations.includes(conversation.id) &&
      !mlsConversationState.pendingWelcome.includes(conversation.id),
  );

  await pendingConversations.map(sendExternalProposal);

  saveState({
    establishedConversations: [],
    pendingWelcome: pendingConversations.map(conversation => conversation.id),
  });
}

/**
 * Will mark the conversation as established
 * @param conversationId The conversation to mark
 */
export function markAsEstablished(conversationId: string) {
  const currentState = loadState();
  saveState({
    ...currentState,
    establishedConversations: [...currentState.establishedConversations, conversationId],
  });
}

/**
 * Will mark the conversation as pending welcome
 * @param conversationId The conversation to mark
 */
export function markAsPendingWelcome(conversationId: string) {
  const currentState = loadState();
  saveState({
    ...currentState,
    pendingWelcome: [...currentState.pendingWelcome, conversationId],
  });
}
