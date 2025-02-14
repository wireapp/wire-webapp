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

import {ElementType} from 'react';

import cx from 'classnames';

interface FormatButtonProps {
  label: string;
  icon: ElementType<any>;
  active: boolean;
  onClick: () => void;
  isEditing: boolean;
}

export const FormatButton = ({label, icon: Icon, active, onClick, isEditing}: FormatButtonProps) => {
  return (
    <button
      title={label}
      aria-label={label}
      className={cx('input-bar-control', {active, 'input-bar-control--editing': isEditing})}
      onClick={onClick}
      data-uie-name={`format-text-${label}`}
    >
      <Icon width={14} height={14} />
    </button>
  );
};
