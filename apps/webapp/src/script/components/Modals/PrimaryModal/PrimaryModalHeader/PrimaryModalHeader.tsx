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

import {forwardRef} from 'react';

import * as Icon from 'Components/Icon';

import {removeCurrentModal} from '../PrimaryModalState';

interface ModalHeaderProps {
  titleText: string;
  closeBtnTitle?: string;
  hideCloseBtn?: boolean;
  closeAction: () => void;
}

export const PrimaryModalHeader = forwardRef<HTMLButtonElement, ModalHeaderProps>(
  ({titleText, closeAction, closeBtnTitle, hideCloseBtn}, ref) => {
    return (
      <div className="modal__header" data-uie-name="status-modal-title">
        <h2 className="modal__header__title" id="modal-title">
          {titleText}
        </h2>
        {!hideCloseBtn && (
          <button
            ref={ref}
            type="button"
            className="modal__header__button"
            onClick={() => {
              removeCurrentModal();
              closeAction();
            }}
            aria-label={closeBtnTitle}
            data-uie-name="do-close"
          >
            <Icon.CloseIcon className="modal__header__icon" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);

PrimaryModalHeader.displayName = 'PrimaryModalHeader';
