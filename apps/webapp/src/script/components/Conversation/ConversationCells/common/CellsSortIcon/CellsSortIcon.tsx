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

import {SortAscendingIcon, SortDescendingIcon, SortNeutralIcon} from '@wireapp/react-ui-kit';

import {sortIconStyles} from './CellsSortIcon.styles';

export type CellsSortDirection = 'asc' | 'desc';
type CellsSortState = CellsSortDirection | 'none';

const DEFAULT_SORT_STATE: CellsSortState = 'none';

const SORT_ICON_BY_STATE = {
  asc: SortAscendingIcon,
  desc: SortDescendingIcon,
  none: SortNeutralIcon,
};

interface CellsSortIconProps {
  direction?: CellsSortDirection;
}

export const CellsSortIcon = ({direction}: CellsSortIconProps) => {
  const sortState = direction ?? DEFAULT_SORT_STATE;
  const SortIcon = SORT_ICON_BY_STATE[sortState];

  return (
    <SortIcon css={sortIconStyles} aria-hidden="true" data-uie-name="cells-sort-icon" data-uie-value={sortState} />
  );
};
