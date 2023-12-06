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

import React, {useEffect, useId, useRef, useState, useCallback} from 'react';

import {CSSObject} from '@emotion/react';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {noop, preventFocusOutside} from 'Util/util';

import {Icon} from './Icon';

interface ModalComponentProps {
  children: React.ReactNode;
  isShown: boolean;
  id?: string;
  className?: string;
  onBgClick?: () => void;
  onClosed?: () => void;
  showLoading?: boolean;
  wrapperCSS?: CSSObject;
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
  fontSize: '0.875rem',
  margin: 'auto',
  maxHeight: '90vh',
  overflow: 'hidden',
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
  id,
  className = '',
  isShown,
  onBgClick = noop,
  onClosed = noop,
  showLoading = false,
  wrapperCSS,
  children,
  ...rest
}) => {
  const [displayNone, setDisplayNone] = useState<boolean>(!isShown);
  const hasVisibleClass = isShown && !displayNone;
  const isMounting = useRef<boolean>(true);
  const trapId = useId();

  const trapFocus = useCallback(
    (event: KeyboardEvent): void => {
      preventFocusOutside(event, trapId);
    },
    [trapId],
  );

  useEffect(() => {
    if (isShown) {
      document.addEventListener('keydown', trapFocus);
    } else {
      document.removeEventListener('keydown', trapFocus);
    }
    return () => {
      document.removeEventListener('keydown', trapFocus);
    };
  }, [isShown, onkeydown]);

  useEffect(() => {
    let timeoutId = 0;
    const mounting = isMounting.current;
    isMounting.current = false;
    if (isShown) {
      return setDisplayNone(false);
    }

    if (mounting) {
      // Avoid triggering the onClose event when component is mounting
      return;
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
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
      onKeyDown={noop}
      id={id}
      className={className}
      {...rest}
    >
      {showLoading ? (
        <Icon.Loading width="48" height="48" css={{path: {fill: 'var(--modal-bg)'}}} />
      ) : (
        <div
          id={trapId}
          onClick={event => event.stopPropagation()}
          role="button"
          tabIndex={TabIndex.UNFOCUSABLE}
          onKeyDown={noop}
          css={{...(hasVisibleClass ? ModalContentVisibleStyles : ModalContentStyles), ...wrapperCSS}}
        >
          {hasVisibleClass ? children : null}
        </div>
      )}
    </div>
  );
};

export {ModalComponent};
