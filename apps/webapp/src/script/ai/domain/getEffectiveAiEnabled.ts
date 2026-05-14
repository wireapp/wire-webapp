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

import type {Conversation} from 'Repositories/entity/Conversation';

import type {AiConversationSettingsRecord} from '../storage/records';

/**
 * Resolves the effective AI-enabled status for a conversation.
 * Three-branch resolution logic:
 * 1. If explicit settings exist, they always win.
 * 2. Otherwise, default is true for human conversations (no service participants).
 * 3. Default is false for conversations with service participants.
 *
 * @param settings - Per-conversation AI settings, or undefined for defaults.
 * @param conversation - The conversation to check. The `hasService` property may be either a function
 *   (in some Knockout entity versions) or a plain boolean property (in others). This function guards
 *   for both forms to avoid throws or incorrect results.
 * @returns True if AI scanning is enabled for this conversation, false otherwise.
 */
export const getEffectiveAiEnabled = (
  settings: AiConversationSettingsRecord | undefined,
  conversation: Conversation,
): boolean => {
  if (settings) {
    return settings.ai_enabled;
  }
  const hasService =
    typeof conversation.hasService === 'function'
      ? conversation.hasService()
      : Boolean((conversation as unknown as {hasService: boolean}).hasService);
  return !hasService;
};
