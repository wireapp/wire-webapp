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

import {useEffect, KeyboardEvent as ReactKeyboardEvent, useCallback} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';
import {createPortal} from 'react-dom';

import {CloseIcon} from 'Components/Icon';
import {handleEscDown, handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {preventFocusOutside} from 'Util/util';

const modalId = 'detail-view';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * The most of this component is taken from the DetailsViewModal
 * Although the original component contains a lot of domain specific logic (related to a message and conversation)
 * In the future, we should create a common fullscreen modal component, and use it in both cases
 * TODO: refactor this component to use a common modal
 */
export const FullscreenModal = ({isOpen, children, onClose}: FullscreenModalProps) => {
  const handleCloseOnEscape = useCallback(
    (event: KeyboardEvent) => {
      handleEscDown(event, onClose);
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleCloseOnEscape);

    return () => document.removeEventListener('keydown', handleCloseOnEscape);
  }, [handleCloseOnEscape]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      preventFocusOutside(event, modalId);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleOnClosePress = (event: KeyboardEvent | ReactKeyboardEvent<HTMLButtonElement>) => {
    handleKeyDown({
      event,
      callback: onClose,
      keys: [KEY.ENTER, KEY.SPACE],
    });
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      id={modalId}
      tabIndex={TabIndex.FOCUSABLE}
      className={cx('modal detail-view modal-show', {'modal-fadein': isOpen})}
    >
      <div
        className={cx('detail-view-content modal-content-anim-close', {
          'modal-content-anim-open': isOpen,
        })}
      >
        <header className="detail-view-header">
          <button
            type="button"
            className="detail-view-header-close-button icon-button"
            aria-label={t('cellsGlobalView.imageFullScreenModalCloseButton')}
            onClick={onClose}
            onKeyDown={handleOnClosePress}
            data-uie-name="do-close-detail-view"
          >
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
};
