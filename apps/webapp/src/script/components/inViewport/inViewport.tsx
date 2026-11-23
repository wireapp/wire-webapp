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

import React, {useEffect, useRef, type FunctionComponent} from 'react';

import {isNull, isUndefined} from '@sindresorhus/is';

import {overlayedObserver} from '../../util/DOM/overlayedObserver';
import {viewportObserver} from '../../util/DOM/viewportObserver';

interface InViewportParams {
  onVisible: () => void;
  onVisibilityLost?: () => void;
  callVisibilityLostOnUnmount?: boolean;
  requireFullyInView?: boolean;
  allowBiggerThanViewport?: boolean;
  /** Will check if the element is overlayed by something else. Can be used to be sure the user could actually see the element. Should not be used to do lazy loading as the overlayObserver has quite a long debounce time */
  checkOverlay?: boolean;
}

export const InViewport: FunctionComponent<InViewportParams & React.HTMLProps<HTMLDivElement>> = ({
  children,
  onVisible,
  onVisibilityLost,
  requireFullyInView = false,
  checkOverlay = false,
  allowBiggerThanViewport = false,
  callVisibilityLostOnUnmount = false,
  ...props
}: InViewportParams & React.HTMLProps<HTMLDivElement>) => {
  const domNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = domNode.current;
    if (isNull(element)) {
      return undefined;
    }

    const observedElement = element;

    let inViewport = false;
    let visible = !checkOverlay;
    let overlayTracked = false;

    let onVisibleTriggered = false;
    let onVisibilityLostTriggered = false;

    function releaseOverlayTracker(): void {
      if (overlayTracked) {
        overlayTracked = false;
        overlayedObserver.removeElement(observedElement);
      }
    }

    const releaseTrackers = (): void => {
      releaseOverlayTracker();
      viewportObserver.removeElement(observedElement);
    };

    const triggerCallbackIfVisible = (): void => {
      if (inViewport && visible) {
        if (!onVisibleTriggered) {
          onVisible();
          onVisibleTriggered = true;
          onVisibilityLostTriggered = false;
        }

        if (isUndefined(onVisibilityLost)) {
          releaseTrackers();
        }
      }
    };

    function shouldStartOverlayTracking(): boolean {
      return checkOverlay && !overlayTracked;
    }

    viewportObserver.trackElement(
      observedElement,
      (isInViewport: boolean, isPartiallyVisible: boolean) => {
        inViewport = isInViewport;

        if (!isPartiallyVisible) {
          releaseOverlayTracker();
          visible = !checkOverlay;
          if (!onVisibilityLostTriggered) {
            onVisibilityLost?.();
            onVisibleTriggered = false;
            onVisibilityLostTriggered = true;
          }

          return;
        }

        if (shouldStartOverlayTracking()) {
          overlayTracked = true;
          overlayedObserver.trackElement(observedElement, isVisible => {
            visible = isVisible;
            triggerCallbackIfVisible();
          });

          return;
        }

        triggerCallbackIfVisible();
      },
      requireFullyInView,
      allowBiggerThanViewport,
    );
    return () => {
      // If the element is unmounted, we can trigger the onVisibilityLost callback and release the trackers
      if (callVisibilityLostOnUnmount) {
        onVisibilityLost?.();
      }
      releaseTrackers();
    };
  }, [allowBiggerThanViewport, requireFullyInView, checkOverlay, onVisible, onVisibilityLost]);

  return (
    <div ref={domNode} {...props} css={{minHeight: '1px'}}>
      {children}
    </div>
  );
};
