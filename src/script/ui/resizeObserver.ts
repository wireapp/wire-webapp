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

import {useEffect} from 'react';

const observedElements = new Map<Element, (element: Element) => void>();

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    observedElements.get(entry.target)?.(entry.target);
  }
});

export const useResizeObserver = (element: Element | undefined, callback: (element: Element) => void) => {
  useEffect(() => {
    if (!element) {
      return () => {};
    }
    observedElements.set(element, callback);
    resizeObserver.observe(element);
    return () => {
      observedElements.delete(element);
      resizeObserver.unobserve(element);
    };
  }, [element]);
};
