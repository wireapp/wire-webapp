/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';
import React, {useEffect, useState} from 'react';
import {noop} from 'Util/util';
import Icon from './Icon';

interface ModalComponentProps {
  children: React.ReactNode;
  isShown: boolean;
  onBgClick?: () => void;
  onClosed?: () => void;
  showLoading: boolean;
}

const ModalOverlayStyles: CSSObject = {
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0, 0.64)',
  bottom: 0,
  justifyContent: 'center',
  left: 0,
  opacity: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  position: 'fixed',
  right: 0,
  top: 0,
  transition: 'opacity 0.15s cubic-bezier(0.165, 0.84, 0.44, 1)',
  zIndex: 10000000,
};

const ModalOverlayVisibleStyles: CSSObject = {
  ...ModalOverlayStyles,
  opacity: 1,
  transition: 'opacity 0.25s cubic-bezier(0.165, 0.84, 0.44, 1)',
};

const ModalContentStyles: CSSObject = {
  animation: 'scaleIn 0.35s cubic-bezier(0.165, 0.84, 0.44, 1)',
  backgroundColor: 'var(--modal-bg)',
  border: 'var(--modal-border-color)',
  borderRadius: 4,
  cursor: 'default',
  display: 'flex',
  flexDirection: 'column',
  fontSize: 14,
  margin: 'auto',
  maxHeight: 480,
  overflow: 'hidden',
  overflowY: 'hidden',
  padding: 16,
  position: 'relative',
  transform: 'scale(0.8)',
  transition: 'transform 0.35s cubic-bezier(0.165, 0.84, 0.44, 1)',
  width: 384,
};

const ModalContentVisibleStyles: CSSObject = {
  ...ModalContentStyles,
  transform: 'scale(1)',
};

const ModalComponent: React.FC<ModalComponentProps> = ({
  isShown,
  onBgClick = noop,
  onClosed = noop,
  showLoading = false,
  children,
  ...rest
}) => {
  const [displayNone, setDisplayNone] = useState<boolean>(!isShown);
  const hasVisibleClass = isShown && !displayNone;
  useEffect(() => {
    let timeoutId = 0;
    if (isShown) {
      return setDisplayNone(false);
    }
    timeoutId = window.setTimeout(() => {
      setDisplayNone(true);
      onClosed();
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isShown]);

  return (
    <div
      onClick={onBgClick}
      css={hasVisibleClass ? ModalOverlayVisibleStyles : ModalOverlayStyles}
      style={{display: displayNone ? 'none' : 'flex'}}
      {...rest}
    >
      {showLoading ? (
        <Icon.Loading width="48" height="48" css={{path: {fill: 'var(--modal-bg)'}}} />
      ) : (
        <div
          onClick={event => event.stopPropagation()}
          css={hasVisibleClass ? ModalContentVisibleStyles : ModalContentStyles}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default ModalComponent;
