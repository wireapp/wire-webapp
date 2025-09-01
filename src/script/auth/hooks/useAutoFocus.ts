/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, RefObject} from 'react';

interface UseAutoFocusProps {
  elementRef: RefObject<HTMLElement>;
  preventScroll?: boolean;
  cursorAtEnd?: boolean;
  shouldFocus?: boolean;
}

export const useAutoFocus = ({
  elementRef,
  preventScroll = true,
  cursorAtEnd = true,
  shouldFocus = true,
}: UseAutoFocusProps) => {
  useEffect(() => {
    // Early return if should not focus
    if (!shouldFocus) {
      return;
    }

    const focusId = requestAnimationFrame(() => {
      const element = elementRef.current;

      // Check if element exists at animation frame time
      if (!element) {
        return;
      }

      element.focus({preventScroll});

      if (cursorAtEnd && 'setSelectionRange' in element) {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
        const value = inputElement.value ?? '';
        inputElement.setSelectionRange(value.length, value.length);
      }
    });

    return () => cancelAnimationFrame(focusId);
  }, [shouldFocus, preventScroll, cursorAtEnd, elementRef]);
};
