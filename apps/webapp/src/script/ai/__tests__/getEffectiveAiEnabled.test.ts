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

import {getEffectiveAiEnabled} from '../domain/getEffectiveAiEnabled';
import type {AiConversationSettingsRecord} from '../storage/records/AiConversationSettingsRecord';

// Builds a minimal mock Conversation
const makeMockConversation = (hasService: boolean | (() => boolean)): Conversation => {
  return {hasService} as unknown as Conversation;
};

describe('getEffectiveAiEnabled', () => {
  describe('when settings record is provided', () => {
    it('returns true when settings.ai_enabled is true', () => {
      const settings: AiConversationSettingsRecord = {
        conversation_id: 'conv-1',
        ai_enabled: true,
        ai_description: '',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const conversation = makeMockConversation(false);

      expect(getEffectiveAiEnabled(settings, conversation)).toBe(true);
    });

    it('returns false when settings.ai_enabled is false', () => {
      const settings: AiConversationSettingsRecord = {
        conversation_id: 'conv-1',
        ai_enabled: false,
        ai_description: '',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const conversation = makeMockConversation(false);

      expect(getEffectiveAiEnabled(settings, conversation)).toBe(false);
    });

    it('ignores the conversation hasService value when settings are provided', () => {
      const settings: AiConversationSettingsRecord = {
        conversation_id: 'conv-1',
        ai_enabled: true,
        ai_description: '',
        updated_at: '2025-01-01T00:00:00Z',
      };
      // Even a bot conversation returns true because the explicit setting wins
      const conversation = makeMockConversation(true);

      expect(getEffectiveAiEnabled(settings, conversation)).toBe(true);
    });
  });

  describe('when settings record is undefined (fallback to conversation default)', () => {
    it('returns true for a human conversation (hasService = false as plain boolean)', () => {
      const conversation = makeMockConversation(false);

      expect(getEffectiveAiEnabled(undefined, conversation)).toBe(true);
    });

    it('returns false for a service/bot conversation (hasService = true as plain boolean)', () => {
      const conversation = makeMockConversation(true);

      expect(getEffectiveAiEnabled(undefined, conversation)).toBe(false);
    });

    it('returns true for a human conversation (hasService = function returning false)', () => {
      const conversation = makeMockConversation(() => false);

      expect(getEffectiveAiEnabled(undefined, conversation)).toBe(true);
    });

    it('returns false for a service/bot conversation (hasService = function returning true)', () => {
      const conversation = makeMockConversation(() => true);

      expect(getEffectiveAiEnabled(undefined, conversation)).toBe(false);
    });
  });
});
