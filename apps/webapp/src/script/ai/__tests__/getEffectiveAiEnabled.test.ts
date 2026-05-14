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

import {getEffectiveAiEnabled} from '../domain/getEffectiveAiEnabled';
import type {AiConversationSettingsRecord} from '../storage/records';
import type {Conversation} from 'Repositories/entity/Conversation';

describe('getEffectiveAiEnabled', () => {
  it('returns true when explicit settings.ai_enabled is true', () => {
    const settings: AiConversationSettingsRecord = {
      conversation_id: 'conv-1',
      ai_enabled: true,
      ai_description: '',
      updated_at: '',
    };
    const conversation = {hasService: true} as unknown as Conversation;
    expect(getEffectiveAiEnabled(settings, conversation)).toBe(true);
  });

  it('returns false when explicit settings.ai_enabled is false', () => {
    const settings: AiConversationSettingsRecord = {
      conversation_id: 'conv-1',
      ai_enabled: false,
      ai_description: '',
      updated_at: '',
    };
    const conversation = {hasService: false} as unknown as Conversation;
    expect(getEffectiveAiEnabled(settings, conversation)).toBe(false);
  });

  it('defaults to true when no settings and conversation has no service participants', () => {
    const conversation = {hasService: false} as unknown as Conversation;
    expect(getEffectiveAiEnabled(undefined, conversation)).toBe(true);
  });

  it('defaults to false when no settings and hasService() returns true (function form)', () => {
    const conversation = {hasService: () => true} as unknown as Conversation;
    expect(getEffectiveAiEnabled(undefined, conversation)).toBe(false);
  });

  it('defaults to false when no settings and hasService is true (property form)', () => {
    const conversation = {hasService: true} as unknown as Conversation;
    expect(getEffectiveAiEnabled(undefined, conversation)).toBe(false);
  });
});
