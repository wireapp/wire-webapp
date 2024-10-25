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

import {ReactNode, useEffect, useState} from 'react';

import {CSSObject} from '@emotion/react';
import {createPortal} from 'react-dom';

import {useActiveWindowState} from 'src/script/hooks/useActiveWindow';

export const BannerPortal = ({
  onClose,
  positionX = 0,
  positionY = 0,
  children,
}: {
  onClose: () => void;
  positionX?: number;
  positionY?: number;
  children: ReactNode;
}) => {
  const [bannerRef, setBannerRef] = useState<HTMLDivElement | null>();

  const {activeWindow} = useActiveWindowState.getState();

  const handleClickOutside = (event: any) => {
    if (bannerRef && !bannerRef.contains(event.target)) {
      onClose();
    }
  };

  useEffect(() => {
    activeWindow.document.addEventListener('mousedown', handleClickOutside);
    return () => {
      activeWindow.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const top = positionY - (bannerRef?.clientHeight || 0);
  const left = positionX;

  return createPortal(
    <div ref={setBannerRef} css={{...portalContainerCss, top, left}}>
      {children}
    </div>,
    activeWindow.document.body,
  );
};

const portalContainerCss: CSSObject = {
  zIndex: 1000,
  position: 'fixed',
  boxShadow: '0px 0px 12px 0px var(--background-fade-32)',
  borderRadius: '0.5rem',
};
