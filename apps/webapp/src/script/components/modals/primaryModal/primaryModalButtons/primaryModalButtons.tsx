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

import {ReactNode} from 'react';

import cx from 'classnames';

interface PrimaryModalButtonsProps {
  isColumn: boolean;
  children: ReactNode;
}

export const PrimaryModalButtons = ({isColumn, children}: PrimaryModalButtonsProps) => {
  return (
    <div
      className={cx('modal__buttons', {
        'modal__buttons--column': isColumn,
      })}
    >
      {children}
    </div>
  );
};
