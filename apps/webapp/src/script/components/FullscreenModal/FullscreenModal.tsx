/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, useCallback, ReactNode, useState} from 'react';

import {createPortal} from 'react-dom';

import {handleEscDown} from 'Util/KeyboardUtil';
import {preventFocusOutside} from 'Util/util';

import {modalStyles, contentStyles} from './FullscreenModal.styles';

const ANIMATION_OPEN_TIMEOUT = 50;
const ANIMATION_CLOSE_TIMEOUT = 350;

interface FullscreenModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Barebone, animated fullscreen modal component.
 * The close button is not provided, so it must be added to the content, although the escape key is handled.
 *
 * Usage:
 * ```tsx
 * const Component = () => {
 *  const [isOpen, setIsOpen] = useState(false);
 *  const id = useId();
 *  return (
 *    <>
 *      <button aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={id} onClick={() => setIsOpen(true)}>Open Modal</button>
 *      <FullscreenModal id={id} isOpen={isOpen} onClose={() => setIsOpen(false)}>
 *        <div>Content</div>
 *      </FullscreenModal>
 *    </>
 *  );
 * };
 * ```
 */
export const FullscreenModal = ({id, isOpen, children, onClose}: FullscreenModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), ANIMATION_CLOSE_TIMEOUT);
      return () => clearTimeout(timer);
    }

    setIsVisible(true);
    const timer = setTimeout(() => setIsAnimating(true), ANIMATION_OPEN_TIMEOUT);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleCloseOnEscape = useCallback(
    (event: KeyboardEvent) => {
      handleEscDown(event, onClose);
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleCloseOnEscape);
    return () => {
      document.removeEventListener('keydown', handleCloseOnEscape);
    };
  }, [handleCloseOnEscape]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      preventFocusOutside(event, id);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [id]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {createPortal(
        <div role="dialog" aria-modal="true" id={id} css={modalStyles(isAnimating)}>
          <div css={contentStyles(isAnimating)}>{children}</div>
        </div>,
        document.body,
      )}
    </>
  );
};
