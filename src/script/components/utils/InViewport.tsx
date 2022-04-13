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
import {overlayedObserver} from '../../ui/overlayedObserver';
import {viewportObserver} from '../../ui/viewportObserver';

interface InViewportParams {
  fullyInView?: boolean;
  onVisible: () => void;
  style?: React.CSSProperties;
}

const InViewport: React.FC<InViewportParams> = ({children, style, onVisible, fullyInView = true}) => {
  const domNode = useRef<HTMLDivElement>();

  useEffect(() => {
    const element = domNode.current;
    if (!element) {
      return undefined;
    }

    let inViewport = false;
    let visible = false;
    const releaseTrackers = () => {
      overlayedObserver.removeElement(element);
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
      fullyInView,
      element.parentElement,
    );
    overlayedObserver.trackElement(element, isVisible => {
      visible = isVisible;
      triggerCallbackIfVisible();
    });
    return () => releaseTrackers();
  }, [onVisible]);

  return (
    <div ref={domNode} style={style}>
      {children}
    </div>
  );
};

export default InViewport;
