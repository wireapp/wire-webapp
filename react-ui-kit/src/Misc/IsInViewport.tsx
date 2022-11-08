/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {useEffect, useRef} from 'react';
import * as React from 'react';

export interface IsInViewportProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  checkViewportOnce?: boolean;
  disabled?: boolean;
  onEnterViewport?: () => void;
}

export const IsInViewport = ({
  onEnterViewport,
  disabled = false,
  checkViewportOnce = false,
  ...props
}: IsInViewportProps) => {
  const element = useRef<HTMLDivElement>();
  useEffect(() => {
    let observer = undefined;
    if (onEnterViewport && !disabled) {
      observer = new IntersectionObserver(([{isIntersecting}]) => {
        if (isIntersecting) {
          if (checkViewportOnce) {
            observer.disconnect();
          }
          if (onEnterViewport && !disabled) {
            onEnterViewport();
          }
        }
      });
      observer.observe(element.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [onEnterViewport]);
  return <div ref={element} {...props} />;
};
