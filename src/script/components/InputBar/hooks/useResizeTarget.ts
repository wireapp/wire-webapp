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

import {useEffect, DependencyList} from 'react';

const alignScrollBars = (shadowInput: HTMLElement, textarea: HTMLElement) => {
  /* According to documentation (https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight) scrollHeight always shows the height of an element's content,
    including content not visible on the screen due to overflow.
    Using scroll and hidden values, we're making sure that scroll behaves the same way on both elements
    (overflow: auto behaviour differs on textarea and div).
  */
  const shouldForceScrollbar = textarea.clientHeight < textarea.scrollHeight;

  shadowInput.style.overflowY = shouldForceScrollbar ? 'scroll' : 'hidden';
  textarea.style.overflowY = shouldForceScrollbar ? 'scroll' : 'hidden';
};

const alignHeights = (shadowInput: HTMLElement, textarea: HTMLElement) => {
  const {offsetHeight: shadowInputHeight, scrollHeight: shadowInputScrollHeight} = shadowInput;
  const {offsetHeight: textAreaOffsetHeight} = textarea;

  if (shadowInputHeight !== textAreaOffsetHeight) {
    textarea.style.height = `${shadowInputScrollHeight}px`;
  }
};

const useResizeTarget = (shadowInput: HTMLElement | null, textarea: HTMLElement | null, deps?: DependencyList) => {
  const resizeTarget = () => {
    if (shadowInput && textarea) {
      if (!textarea?.offsetHeight) {
        return;
      }

      alignHeights(shadowInput, textarea);
      alignScrollBars(shadowInput, textarea);

      // changing scroll appearance might change elements' height, we need to double check if their heights match
      alignHeights(shadowInput, textarea);
    }
  };

  useEffect(() => {
    resizeTarget();

    window.addEventListener('resize', resizeTarget);

    return () => {
      window.removeEventListener('resize', resizeTarget);
    };
  }, deps);
};

export {useResizeTarget};
