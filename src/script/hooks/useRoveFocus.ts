/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

/** Reference: https://www.freecodecamp.org/news/html-roving-tabindex-attribute-explained-with-examples/ */

import {useCallback, useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent} from 'react';

import {isKey, isTabKey, KEY} from 'Util/KeyboardUtil';

export function useRoveFocus(elements: string[]) {
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);

  const lastIndex = elements.length - 1;

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent | KeyboardEvent) => {
      const currentIndex = focusedId ? elements.indexOf(focusedId) : -1;
      if (isKey(event, KEY.ARROW_DOWN)) {
        event.preventDefault();
        if (currentIndex < lastIndex) {
          setFocusedId(elements[currentIndex + 1]);
        }
      } else if (isKey(event, KEY.ARROW_UP)) {
        event.preventDefault();
        if (currentIndex === -1) {
          setFocusedId(elements[lastIndex]);
        }
        if (currentIndex > 0) {
          setFocusedId(elements[currentIndex - 1]);
        }
      } else if (isTabKey(event)) {
        setFocusedId(elements[lastIndex]);
      }
    },
    [focusedId, elements, lastIndex],
  );

  return {focusedId, handleKeyDown, setFocusedId};
}
