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

import React, {useEffect, useRef} from 'react';

import {overlayedObserver} from 'Util/DOM/overlayedObserver';
import {viewportObserver} from 'Util/DOM/viewportObserver';

interface InViewportParams {
  onVisible: () => void;
  requireFullyInView?: boolean;
  allowBiggerThanViewport?: boolean;
  /** Will check if the element is overlayed by something else. Can be used to be sure the user could actually see the element. Should not be used to do lazy loading as the overlayObserver has quite a long debounce time */
  checkOverlay?: boolean;
}

const InViewport: React.FC<InViewportParams & React.HTMLProps<HTMLDivElement>> = ({
  children,
  onVisible,
  requireFullyInView = false,
  checkOverlay = false,
  allowBiggerThanViewport = false,
  ...props
}) => {
  const domNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = domNode.current;
    if (!element) {
      return undefined;
    }

    let inViewport = false;
    let visible = !checkOverlay;
    const releaseTrackers = () => {
      if (checkOverlay) {
        overlayedObserver.removeElement(element);
      }
      viewportObserver.removeElement(element);
    };

    const triggerCallbackIfVisible = () => {
      if (inViewport && visible) {
        onVisible();
        releaseTrackers();
      }
    };

    viewportObserver.trackElement(
      element,
      (isInViewport: boolean) => {
        inViewport = isInViewport;
        triggerCallbackIfVisible();
      },
      requireFullyInView,
      allowBiggerThanViewport,
    );
    if (checkOverlay) {
      overlayedObserver.trackElement(element, isVisible => {
        visible = isVisible;
        triggerCallbackIfVisible();
      });
    }
    return () => releaseTrackers();
  }, [allowBiggerThanViewport, requireFullyInView, checkOverlay, onVisible]);

  return (
    <div ref={domNode} {...props} css={{minHeight: '1px'}}>
      {children}
    </div>
  );
};

export {InViewport};
