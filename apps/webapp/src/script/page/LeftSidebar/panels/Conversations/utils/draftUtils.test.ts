/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {StorageKey} from 'Repositories/storage';
import {generateConversation} from 'test/helper/ConversationGenerator';

import {conversationHasDraft} from './draftUtils';

describe('conversationHasDraft', () => {
  beforeEach(() => {
    Storage.prototype.getItem = jest.fn();
  });

  it('returns false when no draft data exists', () => {
    const conversation = generateConversation();
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    expect(conversationHasDraft(conversation)).toBe(false);
  });

  it('returns false when draft data has no content', () => {
    const conversation = generateConversation();
    const storageKey = `__amplify__${StorageKey.CONVERSATION.INPUT}|${conversation.id}`;
    const draftData = JSON.stringify({data: {plainMessage: '   '}});

    (localStorage.getItem as jest.Mock).mockImplementation(key => (key === storageKey ? draftData : null));

    expect(conversationHasDraft(conversation)).toBe(false);
  });

  it('returns true when draft data has content', () => {
    const conversation = generateConversation();
    const storageKey = `__amplify__${StorageKey.CONVERSATION.INPUT}|${conversation.id}`;
    const draftData = JSON.stringify({data: {plainMessage: 'Hello'}});

    (localStorage.getItem as jest.Mock).mockImplementation(key => (key === storageKey ? draftData : null));

    expect(conversationHasDraft(conversation)).toBe(true);
  });

  it('returns false when draft data is malformed', () => {
    const conversation = generateConversation();
    const storageKey = `__amplify__${StorageKey.CONVERSATION.INPUT}|${conversation.id}`;

    (localStorage.getItem as jest.Mock).mockImplementation(key => (key === storageKey ? 'not-json' : null));

    expect(conversationHasDraft(conversation)).toBe(false);
  });
});
