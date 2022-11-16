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

function useRoveFocus(size: number, defaultFocus = 0) {
  const [currentFocus, setCurrentFocus] = useState(defaultFocus);
  const firstItem = 0;
  const interval = 1;

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent | KeyboardEvent) => {
      if (isKey(e, KEY.ARROW_DOWN)) {
        e.preventDefault();
        setCurrentFocus(currentFocus === --size ? firstItem : currentFocus + interval);
      } else if (isKey(e, KEY.ARROW_UP)) {
        e.preventDefault();
        setCurrentFocus(currentFocus === firstItem ? --size : currentFocus - interval);
      } else if (isTabKey(e)) {
        setCurrentFocus(firstItem);
      }
    },
    [size, currentFocus, setCurrentFocus],
  );
  return {currentFocus, handleKeyDown, setCurrentFocus};
}

export {useRoveFocus};
