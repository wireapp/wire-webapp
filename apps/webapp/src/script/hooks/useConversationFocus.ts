/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useCallback, useEffect, useRef, useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent} from 'react';

import {Conversation} from 'Repositories/entity/Conversation';
import {isKey, isTabKey, KEY} from 'Util/keyboardUtil';

type FocusConversation = (conversationId: string) => boolean;
type RegisterConversationElement = (conversationId: string, element: HTMLElement) => () => void;

function useConversationFocus(
  conversations: Conversation[],
  focusKey = '',
  focusConversation: FocusConversation = () => false,
) {
  const [currentFocus, setCurrentFocus] = useState(conversations[0]?.id || '');
  const conversationIds = conversations.map(conversation => conversation.id).join('\u0000');
  const focusStateKey = `${focusKey}\u0000${conversationIds}`;
  const previousFocusStateKey = useRef(focusStateKey);
  const registeredElements = useRef(new Map<string, Set<HTMLElement>>());

  const registerConversationElement: RegisterConversationElement = useCallback((conversationId, element) => {
    const elements = registeredElements.current.get(conversationId) ?? new Set<HTMLElement>();
    elements.add(element);
    registeredElements.current.set(conversationId, elements);

    return () => {
      elements.delete(element);
      if (elements.size === 0) {
        registeredElements.current.delete(conversationId);
      }
    };
  }, []);

  const focusMountedConversation = useCallback((conversationId: string) => {
    const elements = registeredElements.current.get(conversationId);
    const element = elements && [...elements].find(candidate => candidate.isConnected);

    if (!element) {
      if (elements) {
        elements.clear();
        registeredElements.current.delete(conversationId);
      }
      return false;
    }

    element.focus();
    return document.activeElement === element;
  }, []);

  const focusConversationById = useCallback(
    (conversationId: string) => focusMountedConversation(conversationId) || focusConversation(conversationId),
    [focusConversation, focusMountedConversation],
  );

  const handleKeyDown = useCallback(
    (conversationId: string) => (event: ReactKeyboardEvent | KeyboardEvent) => {
      if (conversations.length === 0) {
        return;
      }

      const currentIndex = conversations.findIndex(conversation => conversation.id === conversationId);
      const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

      if (isKey(event, KEY.ARROW_DOWN)) {
        const nextConversation = conversations[effectiveIndex + 1] || conversations[0];

        if (!focusConversationById(nextConversation.id)) {
          return;
        }

        event.preventDefault();
        setCurrentFocus(nextConversation.id);
      } else if (isKey(event, KEY.ARROW_UP)) {
        const prevConversation = conversations[effectiveIndex - 1] || conversations[conversations.length - 1];

        if (!focusConversationById(prevConversation.id)) {
          return;
        }

        event.preventDefault();
        setCurrentFocus(prevConversation.id);
      } else if (isTabKey(event)) {
        setCurrentFocus(conversations[0].id);
      }
    },
    [conversations, focusConversationById],
  );

  const resetConversationFocus = useCallback(() => setCurrentFocus(conversations[0]?.id || ''), [conversations]);

  useEffect(() => {
    if (focusStateKey !== previousFocusStateKey.current) {
      previousFocusStateKey.current = focusStateKey;
      setCurrentFocus(conversations[0]?.id || '');
      return;
    }

    if (currentFocus && !conversations.some(conversation => conversation.id === currentFocus)) {
      setCurrentFocus(conversations[0]?.id || '');
    }
  }, [focusStateKey, conversations, currentFocus]);

  useEffect(() => {
    if (currentFocus === conversations[0]?.id) {
      return () => undefined;
    }

    document.addEventListener('click', resetConversationFocus);

    return () => {
      document.removeEventListener('click', resetConversationFocus);
    };
  }, [currentFocus, resetConversationFocus, conversations]);

  const focusFirstMountedConversation = useCallback(() => {
    const firstConversation = conversations[0];
    return firstConversation ? focusMountedConversation(firstConversation.id) : false;
  }, [conversations, focusMountedConversation]);

  return {
    currentFocus,
    focusFirstMountedConversation,
    focusMountedConversation,
    handleKeyDown,
    registerConversationElement,
    setCurrentFocus,
    resetConversationFocus,
  };
}

export type {RegisterConversationElement};
export {useConversationFocus};
