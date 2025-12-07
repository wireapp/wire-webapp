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

import {ReactNode, useRef} from 'react';

import {createPortal} from 'react-dom';

import {useActiveWindowState} from 'src/script/hooks/useActiveWindow';

import {portalContainerCss} from './BannerPortal.styles';

interface Props {
  onClose: () => void;
  positionX?: number;
  positionY?: number;
  children: ReactNode;
}

export const BannerPortal = ({onClose, positionX = 0, positionY = 0, children}: Props) => {
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const {activeWindow} = useActiveWindowState.getState();

  const updateRef = (element: HTMLDivElement) => {
    bannerRef.current = element;

    if (!element) {
      return;
    }

    element.style.top = `${positionY - element.clientHeight}px`;
  };

  return (
    <>
      {createPortal(
        <div ref={updateRef} onMouseLeave={onClose} css={{...portalContainerCss, left: positionX}}>
          {children}
        </div>,
        activeWindow.document.body,
      )}
    </>
  );
};
