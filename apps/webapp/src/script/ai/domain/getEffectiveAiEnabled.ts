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
 * Returns the effective `ai_enabled` value for the conversation.
 * - If an explicit settings record exists, that value wins.
 * - Otherwise: default true for human conversations, false if any participant isService.
 */
export const getEffectiveAiEnabled = (
  settings: AiConversationSettingsRecord | undefined,
  conversation: Conversation,
): boolean => {
  if (settings !== undefined) {
    return settings.ai_enabled;
  }

  // hasService may be a Knockout observable function or a plain boolean depending on entity version.
  const hasService =
    typeof conversation.hasService === 'function'
      ? (conversation.hasService as () => boolean)()
      : Boolean((conversation as unknown as {hasService: boolean}).hasService);

  return !hasService;
};
