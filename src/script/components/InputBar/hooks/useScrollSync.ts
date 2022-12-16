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

const useScrollSync = (element: HTMLElement | null, targetElement: HTMLElement | null, deps?: DependencyList) => {
  const syncScroll = () => {
    if (element && targetElement) {
      if (element?.scrollTop !== targetElement?.scrollTop) {
        targetElement.scrollTop = element.scrollTop;
      }
    }
  };

  useEffect(() => {
    window.addEventListener('resize', syncScroll);
    element?.addEventListener('scroll', syncScroll);

    return () => {
      window.removeEventListener('resize', syncScroll);
      element?.removeEventListener('scroll', syncScroll);
    };
  }, deps);
};

export {useScrollSync};
