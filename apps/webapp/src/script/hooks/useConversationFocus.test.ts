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

import {renderHook} from '@testing-library/react';
import {act} from 'react';
import {noop} from 'noop-esm';

import {Conversation} from 'Repositories/entity/Conversation';

import {useConversationFocus} from './useConversationFocus';

const createConversation = (id: string) => ({id}) as Conversation;

const createEvent = (key: string) => ({key, preventDefault: noop}) as KeyboardEvent;

describe('useConversationFocus', () => {
  it('starts with the first conversation focused', () => {
    const conversations = [createConversation('first'), createConversation('second')];

    const {result} = renderHook(() => useConversationFocus(conversations));

    expect(result.current.currentFocus).toBe('first');
  });

  it('rebases focus to the first conversation when the result list changes', () => {
    const {result, rerender} = renderHook(
      ({conversations}: {conversations: Conversation[]}) => useConversationFocus(conversations),
      {initialProps: {conversations: [createConversation('first'), createConversation('second')]}},
    );

    act(() => result.current.setCurrentFocus('second'));
    expect(result.current.currentFocus).toBe('second');

    rerender({conversations: [createConversation('filtered-first'), createConversation('filtered-second')]});

    expect(result.current.currentFocus).toBe('filtered-first');
  });

  it('rebases focus when the search query changes even if results stay the same', () => {
    const conversations = [createConversation('first'), createConversation('second')];
    const {result, rerender} = renderHook(
      ({focusKey}: {focusKey: string}) => useConversationFocus(conversations, focusKey),
      {initialProps: {focusKey: 'a'}},
    );

    act(() => result.current.setCurrentFocus('second'));
    rerender({focusKey: 'b'});

    expect(result.current.currentFocus).toBe('first');
  });

  it('does not throw when keyboard events are received with no conversations', () => {
    const {result} = renderHook(() => useConversationFocus([]));

    expect(() => {
      act(() => result.current.handleKeyDown(0)(createEvent('ArrowDown')));
    }).not.toThrow();
    expect(result.current.currentFocus).toBe('');
  });
});
