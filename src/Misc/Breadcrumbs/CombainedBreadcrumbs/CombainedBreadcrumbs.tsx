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

import {buttonStyles} from './CombainedBreadcrumbs.styles';

import {DropdownMenu} from '../../../Modal/DropdownMenu';

interface CombainedBreadcrumbsProps {
  items: Array<{name: string}>;
  onItemClick: (item: {name: string}) => void;
}

export const CombainedBreadcrumbs = ({items, onItemClick}: CombainedBreadcrumbsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <li>
          <button type="button" css={buttonStyles}>
            ...
          </button>
        </li>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {items.map(crumb => (
          <DropdownMenu.Item key={crumb.name} onClick={() => onItemClick(crumb)}>
            {crumb.name}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
