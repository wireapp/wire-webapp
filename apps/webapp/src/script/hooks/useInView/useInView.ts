/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useEffect, useRef, useState} from 'react';

interface UseInViewOptions {
  /** The root element to use as the viewport, defaults to browser viewport */
  root?: Element | null;
  /** Margin around the root element */
  rootMargin?: string;
  /** Percentage of element that needs to be visible to trigger */
  threshold?: number | number[];
}

export const useInView = <Element extends HTMLElement = HTMLDivElement>(options: UseInViewOptions = {}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const isIntersecting = entry.isIntersecting;
      setIsInView(isIntersecting);

      if (isIntersecting) {
        setHasBeenInView(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options, options.root, options.rootMargin, options.threshold]);

  return {elementRef, isInView, hasBeenInView};
};
