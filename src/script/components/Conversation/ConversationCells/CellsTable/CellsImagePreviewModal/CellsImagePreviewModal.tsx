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

import {useEffect, useState, KeyboardEvent as ReactKeyboardEvent, useCallback} from 'react';

import cx from 'classnames';

import {CloseIcon} from 'Components/Icon';
import {ZoomableImage} from 'Components/ZoomableImage';
import {handleEscDown, handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {renderElement} from 'Util/renderElement';
import {preventFocusOutside} from 'Util/util';

const modalId = 'detail-view';

interface CellsImagePreviewModalProps {
  imageSrc: string;
}

/**
 * The most of this component is taken from the DetailsViewModal
 * Although the original component contains a lot of domain specific logic (related to a message and conversation)
 * In the future, we should create a common fullscreen modal component, and use it in both cases
 * TODO: refactor this component to use a common modal
 */
export const CellsImagePreviewModal = ({imageSrc}: CellsImagePreviewModalProps) => {
  const [isImageVisible, setIsImageVisible] = useState(true);

  const onCloseClick = useCallback(() => {
    setIsImageVisible(false);
    window.URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  const handleCloseOnEscape = useCallback(
    (event: KeyboardEvent) => {
      handleEscDown(event, onCloseClick);
    },
    [onCloseClick],
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
      callback: onCloseClick,
      keys: [KEY.ENTER, KEY.SPACE],
    });
  };

  if (!isImageVisible) {
    return null;
  }

  return (
    <div id={modalId} className={cx('modal detail-view modal-show', {'modal-fadein': isImageVisible})}>
      <div
        className={cx('detail-view-content modal-content-anim-close', {
          'modal-content-anim-open': isImageVisible,
        })}
      >
        <header className="detail-view-header">
          <button
            type="button"
            className="detail-view-header-close-button icon-button"
            aria-label={t('cells.imageFullScreenModal.closeButton')}
            onClick={onCloseClick}
            data-uie-name="do-close-detail-view"
          >
            <CloseIcon />
          </button>
        </header>
        <button className="detail-view-main button-reset-default" onKeyDown={handleOnClosePress} aria-label="Close">
          <ZoomableImage key={modalId} src={imageSrc} data-uie-name="status-picture" />
        </button>
      </div>
    </div>
  );
};

// @ts-expect-error - TODO: investigate why this it is throwing a type error
export const showCellsImagePreviewModal = renderElement<CellsImagePreviewModalProps>(CellsImagePreviewModal);
