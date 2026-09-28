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
import type {Dispatch, KeyboardEvent as ReactKeyboardEvent, SetStateAction} from 'react';

import {isNonEmptyString, isNullOrUndefined} from '@sindresorhus/is';

import {Conversation} from 'Repositories/entity/Conversation';
import {isKey, isTabKey, KEY} from 'Util/keyboardUtil';

type FocusConversation = (conversationId: string) => boolean | 'pending';
type RegisterConversationElement = (conversationId: string, element: HTMLElement) => () => void;
type UseConversationFocusResult = {
  currentFocus: string;
  focusFirstMountedConversation: () => boolean;
  focusMountedConversation: (conversationId: string) => boolean;
  handleKeyDown: (conversationId: string) => (event: ReactKeyboardEvent | KeyboardEvent) => void;
  registerConversationElement: RegisterConversationElement;
  setCurrentFocus: Dispatch<SetStateAction<string>>;
  resetConversationFocus: () => void;
};

function useConversationFocus(
  conversations: Conversation[],
  focusKey = '',
  focusConversation: FocusConversation = () => false,
): UseConversationFocusResult {
  const firstConversationId = conversations[0]?.id;
  const [currentFocus, setCurrentFocus] = useState(isNonEmptyString(firstConversationId) ? firstConversationId : '');
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
    const element = isNullOrUndefined(elements) ? undefined : [...elements].find(candidate => candidate.isConnected);

    if (isNullOrUndefined(element)) {
      if (!isNullOrUndefined(elements)) {
        elements.clear();
        registeredElements.current.delete(conversationId);
      }
      return false;
    }

    element.focus();
    return document.activeElement === element;
  }, []);

  const handleKeyDown = useCallback(
    (conversationId: string) => (event: ReactKeyboardEvent | KeyboardEvent) => {
      if (conversations.length === 0) {
        return;
      }

      const currentIndex = conversations.findIndex(conversation => conversation.id === conversationId);
      const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

      if (isKey(event, KEY.ARROW_DOWN)) {
        const nextConversationCandidate = conversations[effectiveIndex + 1];
        const nextConversation = isNullOrUndefined(nextConversationCandidate)
          ? conversations[0]
          : nextConversationCandidate;

        if (focusMountedConversation(nextConversation.id)) {
          event.preventDefault();
          setCurrentFocus(nextConversation.id);
          return;
        }

        const focusResult = focusConversation(nextConversation.id);
        if (focusResult === false) {
          return;
        }

        event.preventDefault();
        if (focusResult === true) {
          setCurrentFocus(nextConversation.id);
        }
      } else if (isKey(event, KEY.ARROW_UP)) {
        const previousConversationCandidate = conversations[effectiveIndex - 1];
        const previousConversation = isNullOrUndefined(previousConversationCandidate)
          ? conversations[conversations.length - 1]
          : previousConversationCandidate;

        if (focusMountedConversation(previousConversation.id)) {
          event.preventDefault();
          setCurrentFocus(previousConversation.id);
          return;
        }

        const focusResult = focusConversation(previousConversation.id);
        if (focusResult === false) {
          return;
        }

        event.preventDefault();
        if (focusResult === true) {
          setCurrentFocus(previousConversation.id);
        }
      } else if (isTabKey(event)) {
        setCurrentFocus(conversations[0].id);
      }
    },
    [conversations, focusConversation, focusMountedConversation],
  );

  const resetConversationFocus = useCallback(() => {
    const firstConversationId = conversations[0]?.id;
    setCurrentFocus(isNonEmptyString(firstConversationId) ? firstConversationId : '');
  }, [conversations]);

  useEffect(() => {
    if (focusStateKey !== previousFocusStateKey.current) {
      previousFocusStateKey.current = focusStateKey;
      const firstConversationId = conversations[0]?.id;
      setCurrentFocus(isNonEmptyString(firstConversationId) ? firstConversationId : '');
      return;
    }

    if (isNonEmptyString(currentFocus) && !conversations.some(conversation => conversation.id === currentFocus)) {
      const firstConversationId = conversations[0]?.id;
      setCurrentFocus(isNonEmptyString(firstConversationId) ? firstConversationId : '');
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
    return !isNullOrUndefined(firstConversation) ? focusMountedConversation(firstConversation.id) : false;
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
