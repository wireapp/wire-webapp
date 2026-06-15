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

import {useCallback, useState} from 'react';

import {CellsSortDirection} from '../CellsSortIcon/CellsSortIcon';

export type CellsSortField = 'name_ci' | 'mtime' | 'size';

export interface CellsSort {
  field: CellsSortField;
  direction: CellsSortDirection;
}

// Direction applied the first time a column is selected:
// name → A→Z, modified → newest first, size → smallest first.
const DEFAULT_DIRECTION: Record<CellsSortField, CellsSortDirection> = {
  name_ci: 'asc',
  mtime: 'desc',
  size: 'asc',
};

export const useCellsSorting = () => {
  const [sort, setSort] = useState<CellsSort | null>(null);

  const toggleSort = useCallback((field: CellsSortField) => {
    setSort(current => {
      // Selecting a different column starts at that column's default direction.
      if (current?.field !== field) {
        return {field, direction: DEFAULT_DIRECTION[field]};
      }
      // Re-selecting the active column flips the direction. There is no click path
      // back to the unsorted state — that only returns when the view is left/re-entered.
      return {field, direction: current.direction === 'asc' ? 'desc' : 'asc'};
    });
  }, []);

  const resetSort = useCallback(() => setSort(null), []);

  const getDirectionFor = useCallback(
    (field: CellsSortField): CellsSortDirection | undefined => (sort?.field === field ? sort.direction : undefined),
    [sort],
  );

  return {sort, toggleSort, resetSort, getDirectionFor};
};
