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

import {useCallback, useEffect, useRef, useState} from 'react';

interface ResizeObserverResult<Element extends HTMLElement = HTMLDivElement> {
  ref: React.RefObject<Element>;
  width: number;
  height: number;
}

/**
 * A hook that observes and returns the dimensions of an HTML element
 * @template Element The type of HTML element to observe (defaults to HTMLDivElement)
 * @returns An object containing the ref to attach to the element, and its current dimensions
 */
export const useElementSize = <Element extends HTMLElement = HTMLDivElement>(): ResizeObserverResult<Element> => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const ref = useRef<Element>(null);

  const onResize = useCallback((entries: readonly ResizeObserverEntry[]) => {
    if (!Array.isArray(entries)) {
      return;
    }

    const entry = entries[0];
    if (entry) {
      const {width: newWidth, height: newHeight} = entry.contentRect;
      setWidth(newWidth);
      setHeight(newHeight);
    }
  }, []);

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    const observer = new ResizeObserver(onResize);
    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [onResize]);

  return {ref, width, height};
};
