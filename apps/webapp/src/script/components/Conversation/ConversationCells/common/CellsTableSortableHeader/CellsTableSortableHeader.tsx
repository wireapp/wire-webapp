/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {sortableHeaderStyles} from './CellsTableSortableHeader.styles';

import {CellsSortDirection, CellsSortIcon} from '../CellsSortIcon/CellsSortIcon';

interface CellsTableSortableHeaderProps {
  label: string;
  direction?: CellsSortDirection;
  onClick: () => void;
}

export const CellsTableSortableHeader = ({label, direction, onClick}: CellsTableSortableHeaderProps) => {
  const isActive = direction !== undefined;

  return (
    <button
      type="button"
      css={sortableHeaderStyles(isActive)}
      onClick={onClick}
      data-uie-name="cells-table-sortable-header"
      data-uie-value={label}
    >
      {label}
      <CellsSortIcon direction={direction} />
    </button>
  );
};
