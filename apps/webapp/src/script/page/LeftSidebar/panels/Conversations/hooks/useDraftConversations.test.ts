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

import {act, renderHook, waitFor} from '@testing-library/react';
import {amplify} from 'amplify';

import {StorageKey} from 'Repositories/storage';
import {generateConversation} from 'test/helper/ConversationGenerator';

import {useDraftConversations} from './useDraftConversations';

jest.mock('amplify');

describe('useDraftConversations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Storage.prototype.getItem = jest.fn();
    (amplify.subscribe as jest.Mock).mockImplementation(() => undefined);
    (amplify.unsubscribe as jest.Mock).mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns conversations with drafts on initial check', async () => {
    const draftConversation = generateConversation({name: 'Draft'});
    const otherConversation = generateConversation({name: 'Other'});
    const draftKey = `__amplify__${StorageKey.CONVERSATION.INPUT}|${draftConversation.id}`;
    const draftData = JSON.stringify({data: {plainMessage: 'Hello'}});

    (localStorage.getItem as jest.Mock).mockImplementation(key => (key === draftKey ? draftData : null));

    const {result} = renderHook(() => useDraftConversations([draftConversation, otherConversation]));

    await waitFor(() => expect(result.current).toEqual([draftConversation]));
  });

  it('updates when a draft change event is published', async () => {
    const draftConversation = generateConversation({name: 'Draft'});
    const draftKey = `__amplify__${StorageKey.CONVERSATION.INPUT}|${draftConversation.id}`;

    (localStorage.getItem as jest.Mock).mockImplementation(() => null);

    const {result} = renderHook(() => useDraftConversations([draftConversation]));

    const subscribeCall = (amplify.subscribe as jest.Mock).mock.calls[0];
    const handleDraftChange = subscribeCall[1];

    (localStorage.getItem as jest.Mock).mockImplementation(key =>
      key === draftKey ? JSON.stringify({data: {plainMessage: 'Later'}}) : null,
    );

    act(() => {
      handleDraftChange();
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => expect(result.current).toEqual([draftConversation]));
  });
});
