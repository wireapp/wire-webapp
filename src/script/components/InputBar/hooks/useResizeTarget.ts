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

const useResizeTarget = (element: HTMLElement | null, targetElement: HTMLElement | null, deps?: DependencyList) => {
  const resizeTarget = () => {
    if (element && targetElement) {
      if (!targetElement?.offsetHeight) {
        return;
      }

      const shouldForceScrollbar = targetElement.clientHeight < targetElement.scrollHeight;

      element.style.overflowY = shouldForceScrollbar ? 'scroll' : 'auto';
      targetElement.style.overflowY = shouldForceScrollbar ? 'scroll' : 'auto';

      const {offsetHeight: shadowInputHeight, scrollHeight: shadowInputScrollHeight} = element;
      const {offsetHeight: textAreaOffsetHeight} = targetElement;

      if (shadowInputHeight !== textAreaOffsetHeight) {
        targetElement.style.height = `${shadowInputScrollHeight}px`;
      }
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
