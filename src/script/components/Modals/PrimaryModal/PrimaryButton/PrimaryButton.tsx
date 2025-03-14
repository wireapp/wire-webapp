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

import {forwardRef, ReactNode, MouseEvent} from 'react';

import cx from 'classnames';

interface PrimaryButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled: boolean;
  fullWidth: boolean;
  children: ReactNode;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({onClick, disabled, fullWidth, children}, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cx('modal__button modal__button--primary', {
          'modal__button--full': fullWidth,
        })}
        data-uie-name="do-action"
        key={`modal-primary-button`}
      >
        {children}
      </button>
    );
  },
);

PrimaryButton.displayName = 'PrimaryButton';
