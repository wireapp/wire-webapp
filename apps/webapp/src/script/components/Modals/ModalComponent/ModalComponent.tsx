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

import React, {useEffect, useId, useRef, useState, useCallback, HTMLProps} from 'react';

import {CSSObject} from '@emotion/react';
import {noop, preventFocusOutside} from 'Util/util';

import {TabIndex} from '@wireapp/react-ui-kit';

import {
  ModalContentStyles,
  ModalContentVisibleStyles,
  ModalOverlayStyles,
  ModalOverlayVisibleStyles,
} from './ModalComponent.styles';

import {LoadingIcon} from '../../Icon';

interface ModalComponentProps extends HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
  isShown: boolean;
  id?: string;
  className?: string;
  onBgClick?: () => void;
  onClosed?: () => void;
  showLoading?: boolean;
  wrapperCSS?: CSSObject;
}

const CLOSE_DELAY = 350;

const ModalComponent = ({
  id,
  className = '',
  isShown,
  onBgClick = noop,
  onClosed = noop,
  showLoading = false,
  wrapperCSS,
  children,
  onKeyDown,
  ...rest
}: ModalComponentProps) => {
  const [displayNone, setDisplayNone] = useState<boolean>(!isShown);
  const hasVisibleClass = isShown && !displayNone;
  const isMounting = useRef<boolean>(true);
  const trapId = useId();

  const trapFocus = useCallback((event: KeyboardEvent) => preventFocusOutside(event, trapId), [trapId]);

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
    }, CLOSE_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isShown]);

  if (displayNone) {
    return null;
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions
    <div
      role="dialog"
      aria-modal="true"
      onClick={onBgClick}
      id={id}
      css={hasVisibleClass ? ModalOverlayVisibleStyles : ModalOverlayStyles}
      style={{display: 'flex'}}
      tabIndex={TabIndex.FOCUSABLE}
      className={className}
      {...rest}
    >
      {showLoading ? (
        <LoadingIcon width="48" height="48" css={{path: {fill: 'var(--modal-bg)'}}} />
      ) : (
        <div
          id={trapId}
          onClick={event => event.stopPropagation()}
          role="button"
          tabIndex={TabIndex.UNFOCUSABLE}
          onKeyDown={event => (onKeyDown ? onKeyDown(event) : event.stopPropagation())}
          css={{...(hasVisibleClass ? ModalContentVisibleStyles : ModalContentStyles), ...wrapperCSS}}
        >
          {hasVisibleClass ? children : null}
        </div>
      )}
    </div>
  );
};

export {ModalComponent};
