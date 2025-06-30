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

import {MouseEvent as ReactMouseEvent, ReactNode} from 'react';

import {activeItemStyles, buttonStyles, listItemStyles} from './BreadcrumbItem.styles';

interface BreadcrumbItemProps {
  name: string;
  icon?: ReactNode;
  isActive: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => void;
  isFirst: boolean;
}

export const BreadcrumbItem = ({name, icon, isActive, onClick, isFirst}: BreadcrumbItemProps) => {
  return (
    <li css={listItemStyles}>
      {isActive ? (
        <span css={activeItemStyles}>
          {icon}
          {name}
        </span>
      ) : (
        <button type="button" css={buttonStyles({isFirst})} onClick={onClick}>
          {icon}
          {name}
        </button>
      )}
    </li>
  );
};
