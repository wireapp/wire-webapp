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

import {useEffect} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  isArrowKey,
  isEnterKey,
  isFunctionKey,
  isMetaKey,
  isPageUpDownKey,
  isPasteAction,
  isSpaceKey,
  isTabKey,
} from 'Util/KeyboardUtil';

const hasInputAlreadyFocused = () => {
  return document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
};

const useTextAreaFocus = (callback: () => void) => {
  const handleFocusTextarea = (event: KeyboardEvent) => {
    const detailViewModal = document.querySelector('#detail-view');

    if (detailViewModal?.classList.contains('modal-show')) {
      return;
    }

    const isPageupDownKeyPressed = isPageUpDownKey(event);

    if (isPageupDownKeyPressed) {
      (document.activeElement as HTMLElement).blur();
    } else if (
      !hasInputAlreadyFocused() &&
      !isArrowKey(event) &&
      !isTabKey(event) &&
      !isEnterKey(event) &&
      !isSpaceKey(event) &&
      !isFunctionKey(event)
    ) {
      if (!isMetaKey(event) || isPasteAction(event)) {
        callback();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleFocusTextarea);

    if (!hasInputAlreadyFocused()) {
      // Focus on the first render if no other input is focused
      setTimeout(callback);
    }
    return () => {
      window.removeEventListener('keydown', handleFocusTextarea);
    };
  }, []);
};

/**
 * Will automatically focus the input field when the user types anywhere in the document
 */
export function AutoFocusPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useTextAreaFocus(() => editor.focus());

  return null;
}
