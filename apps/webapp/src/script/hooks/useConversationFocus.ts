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

function useConversationFocus(conversations: Conversation[], focusKey = '', focusConversation?: FocusConversation) {
  const [currentFocus, setCurrentFocus] = useState(conversations[0]?.id || '');
  const conversationIds = conversations.map(conversation => conversation.id).join('\u0000');
  const focusStateKey = `${focusKey}\u0000${conversationIds}`;
  const previousFocusStateKey = useRef(focusStateKey);

  const handleKeyDown = useCallback(
    (index: number) => (event: ReactKeyboardEvent | KeyboardEvent) => {
      if (conversations.length === 0) {
        return;
      }

      if (isKey(event, KEY.ARROW_DOWN)) {
        const nextConversation = conversations[index + 1] || conversations[0];

        const didFocusConversation = focusConversation?.(nextConversation.id) ?? true;

        if (!didFocusConversation) {
          return;
        }

        event.preventDefault();
        setCurrentFocus(nextConversation.id);
      } else if (isKey(event, KEY.ARROW_UP)) {
        const prevConversation = conversations[index - 1] || conversations[conversations.length - 1];

        const didFocusConversation = focusConversation?.(prevConversation.id) ?? true;

        if (!didFocusConversation) {
          return;
        }

        event.preventDefault();
        setCurrentFocus(prevConversation.id);
      } else if (isTabKey(event) || (event.shiftKey && isTabKey(event))) {
        setCurrentFocus(conversations[0].id);
      }
    },
    [conversations, focusConversation],
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

  return {currentFocus, handleKeyDown, setCurrentFocus, resetConversationFocus};
}

export {useConversationFocus};
