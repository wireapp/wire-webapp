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

import {ChevronRight} from 'Components/Icon';

import {FolderIcon} from '@wireapp/react-ui-kit';

import {
  arrowIconStyles,
  buttonStyles,
  listItemStyles,
  listStyles,
  nameStyles,
  nameWrapperStyles,
} from './CellsFolderList.styles';

interface CellsFolderListProps {
  items: Array<{id: string; name: string; path: string}>;
  onNavigate: (path: string) => void;
}

export const CellsFolderList = ({items, onNavigate}: CellsFolderListProps) => {
  return (
    <ul css={listStyles}>
      {items.map(item => (
        <li key={item.id} css={listItemStyles}>
          <button type="button" css={buttonStyles} onClick={() => onNavigate(item.path)}>
            <div css={nameWrapperStyles}>
              <FolderIcon width={24} height={24} />
              <span css={nameStyles}>{item.name}</span>
            </div>
            <ChevronRight width={16} height={16} css={arrowIconStyles} />
          </button>
        </li>
      ))}
    </ul>
  );
};
