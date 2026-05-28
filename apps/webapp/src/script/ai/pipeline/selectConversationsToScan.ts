/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';

import {getEffectiveAiEnabled} from '../domain/getEffectiveAiEnabled';
import type {AiStorageRepository} from '../storage/AiStorageRepository';

/**
 * Returns all non-archived conversations that have effective AI scanning enabled.
 * Reads per-conversation settings from Dexie; applies the default-resolution helper (D7 / D8).
 */
export const selectConversationsToScan = async (
  conversationState: ConversationState,
  aiStorage: AiStorageRepository,
): Promise<Conversation[]> => {
  const all = conversationState.conversations();
  const result: Conversation[] = [];

  for (const c of all) {
    if (c.is_archived()) {
      continue;
    }
    const settings = await aiStorage.getConversationSettings(c.id);
    if (!getEffectiveAiEnabled(settings, c)) {
      continue;
    }
    result.push(c);
  }

  return result;
};
