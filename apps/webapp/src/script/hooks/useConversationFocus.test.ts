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

import userEvent from '@testing-library/user-event';
import {renderHook} from '@testing-library/react';
import {act} from 'react';
import {noop} from 'noop-esm';

import {Conversation} from 'Repositories/entity/Conversation';

import {useConversationFocus} from './useConversationFocus';

const createConversation = (id: string) => {
  return {id} as Conversation;
};

const createEvent = (key: string) => {
  return {key, preventDefault: noop} as KeyboardEvent;
};

describe('useConversationFocus', () => {
  it('starts with the first conversation focused', () => {
    const conversations = [createConversation('first'), createConversation('second')];

    const {result} = renderHook(() => {
      return useConversationFocus(conversations);
    });

    expect(result.current.currentFocus).toBe('first');
  });

  it('rebases focus to the first conversation when the result list changes', () => {
    const {result, rerender} = renderHook(
      ({conversations}: {conversations: Conversation[]}) => {
        return useConversationFocus(conversations);
      },
      {initialProps: {conversations: [createConversation('first'), createConversation('second')]}},
    );

    act(() => {
      return result.current.setCurrentFocus('second');
    });
    expect(result.current.currentFocus).toBe('second');

    rerender({conversations: [createConversation('filtered-first'), createConversation('filtered-second')]});

    expect(result.current.currentFocus).toBe('filtered-first');
  });

  it('rebases focus when the search query changes even if results stay the same', () => {
    const conversations = [createConversation('first'), createConversation('second')];
    const {result, rerender} = renderHook(
      ({focusKey}: {focusKey: string}) => {
        return useConversationFocus(conversations, focusKey);
      },
      {initialProps: {focusKey: 'a'}},
    );

    act(() => {
      return result.current.setCurrentFocus('second');
    });
    rerender({focusKey: 'b'});

    expect(result.current.currentFocus).toBe('first');
  });

  it('moves from the first Tab-entered result with arrow navigation and wraps at both boundaries', async () => {
    const conversations = [createConversation('first'), createConversation('second')];
    const searchInput = document.createElement('input');
    const focusableElements = new Map(
      conversations.map(conversation => {
        return [conversation.id, document.createElement('button')];
      }),
    );
    document.body.append(searchInput, ...focusableElements.values());
    const focusConversation = (conversationId: string) => {
      const element = focusableElements.get(conversationId);
      element?.focus();
      return document.activeElement === element;
    };
    const {result} = renderHook(() => {
      return useConversationFocus(conversations, '', focusConversation);
    });

    searchInput.focus();
    await userEvent.setup().tab();
    expect(document.activeElement).toBe(focusableElements.get('first'));

    act(() => {
      return result.current.handleKeyDown('first')(createEvent('ArrowDown'));
    });

    expect(document.activeElement).toBe(focusableElements.get('second'));
    expect(result.current.currentFocus).toBe('second');

    act(() => {
      return result.current.handleKeyDown('second')(createEvent('ArrowDown'));
    });
    expect(document.activeElement).toBe(focusableElements.get('first'));
    expect(result.current.currentFocus).toBe('first');

    act(() => {
      return result.current.handleKeyDown('first')(createEvent('ArrowUp'));
    });
    expect(document.activeElement).toBe(focusableElements.get('second'));
    expect(result.current.currentFocus).toBe('second');

    searchInput.remove();
    for (const element of focusableElements.values()) {
      element.remove();
    }
  });

  it('focuses registered result elements and falls back when one is virtualized away', () => {
    const conversations = [createConversation('first')];
    const firstElement = document.createElement('button');
    const replacementElement = document.createElement('button');
    document.body.append(firstElement, replacementElement);
    const {result} = renderHook(() => {
      return useConversationFocus(conversations);
    });

    let unregisterFirstElement: (() => void) | undefined;
    act(() => {
      unregisterFirstElement = result.current.registerConversationElement('first', firstElement);
      expect(result.current.focusFirstMountedConversation()).toBe(true);
    });
    expect(firstElement).toHaveFocus();

    act(() => {
      unregisterFirstElement?.();
      result.current.registerConversationElement('first', replacementElement);
      expect(result.current.focusFirstMountedConversation()).toBe(true);
    });
    expect(replacementElement).toHaveFocus();

    firstElement.remove();
    replacementElement.remove();
  });

  it('does not intercept Tab while resetting the roving focus candidate', () => {
    const conversations = [createConversation('first'), createConversation('second')];
    const focusConversation = jest.fn();
    const preventDefault = jest.fn();
    const {result} = renderHook(() => {
      return useConversationFocus(conversations, '', focusConversation);
    });

    act(() => {
      return result.current.setCurrentFocus('second');
    });
    act(() => {
      return result.current.handleKeyDown('second')({key: 'Tab', preventDefault} as unknown as KeyboardEvent);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(focusConversation).not.toHaveBeenCalled();
    expect(result.current.currentFocus).toBe('first');
  });

  it('does not trap focus when the next conversation is not mounted', () => {
    const conversations = [createConversation('first'), createConversation('second')];
    const focusConversation = jest.fn(() => {
      return false;
    });
    const preventDefault = jest.fn();
    const {result} = renderHook(() => {
      return useConversationFocus(conversations, '', focusConversation);
    });

    act(() => {
      return result.current.handleKeyDown('first')({key: 'ArrowDown', preventDefault} as unknown as KeyboardEvent);
    });

    expect(focusConversation).toHaveBeenCalledWith('second');
    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.currentFocus).toBe('first');
  });

  it('keeps the current tab stop while focus is queued for a virtualized conversation', () => {
    const conversations = [createConversation('first'), createConversation('second')];
    const focusConversation = jest.fn(() => {
      return 'pending' as const;
    });
    const preventDefault = jest.fn();
    const {result} = renderHook(() => {
      return useConversationFocus(conversations, '', focusConversation);
    });

    act(() => {
      return result.current.handleKeyDown('first')({key: 'ArrowDown', preventDefault} as unknown as KeyboardEvent);
    });

    expect(focusConversation).toHaveBeenCalledWith('second');
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.currentFocus).toBe('first');
  });

  it('does not throw when keyboard events are received with no conversations', () => {
    const {result} = renderHook(() => {
      return useConversationFocus([]);
    });

    expect(() => {
      act(() => {
        return result.current.handleKeyDown('first')(createEvent('ArrowDown'));
      });
    }).not.toThrow();
    expect(result.current.currentFocus).toBe('');
  });
});
