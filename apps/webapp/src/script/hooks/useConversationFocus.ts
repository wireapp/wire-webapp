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

function useConversationFocus(conversations: Conversation[], focusKey = '') {
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
        event.preventDefault();
        const nextConversation = conversations[index + 1];

        setCurrentFocus(nextConversation?.id || conversations[0].id);
      } else if (isKey(event, KEY.ARROW_UP)) {
        event.preventDefault();
        const prevConversation = conversations[index - 1];

        setCurrentFocus(prevConversation?.id || conversations[conversations.length - 1].id);
      } else if (isTabKey(event) || (event.shiftKey && isTabKey(event))) {
        setCurrentFocus(conversations[0].id);
      }
    },
    [conversations],
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
