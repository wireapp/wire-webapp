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

import {useApplicationContext} from 'src/script/page/rootProvider';

import {clearAllButtonStyles, filterGroupStyles, toggleFilterButtonStyles} from './cellsfiltersbar.styles';
import type {FilterConfig} from './filterconfig';

import {FilterPopover} from '../filterpopover/filterpopover';

interface CellsFiltersBarProps {
  filters: FilterConfig[];
}

const isFilterActive = (filter: FilterConfig): boolean =>
  filter.type === 'popover' ? filter.selectedIds.length > 0 : filter.isActive;

const clearFilter = (filter: FilterConfig): void => {
  if (filter.type === 'popover') {
    filter.onSelectionChange([]);
  } else if (filter.isActive) {
    filter.onToggle();
  }
};

export const CellsFiltersBar = ({filters}: CellsFiltersBarProps) => {
  const {translate} = useApplicationContext();
  const hasActiveFilters = filters.some(isFilterActive);
  const clearAll = () => filters.forEach(clearFilter);

  return (
    <div css={filterGroupStyles}>
      {filters.map(filter =>
        filter.type === 'popover' ? (
          <FilterPopover
            key={filter.id}
            triggerLabel={filter.label}
            items={filter.items}
            selectedIds={filter.selectedIds}
            onSelectionChange={filter.onSelectionChange}
            disabled={filter.disabled}
            singleSelect={filter.singleSelect}
          />
        ) : (
          <button
            key={filter.id}
            type="button"
            css={toggleFilterButtonStyles}
            onClick={() => {
              if (filter.disabled !== true) {
                filter.onToggle();
              }
            }}
            aria-pressed={filter.isActive}
            aria-disabled={filter.disabled ?? false}
            data-active={filter.isActive}
            data-uie-name={`filter-${filter.id}`}
          >
            {filter.label}
          </button>
        ),
      )}
      {hasActiveFilters && (
        <button type="button" css={clearAllButtonStyles} onClick={clearAll} data-uie-name="filters-clear-all">
          {translate('cells.clearFilters.button')}
        </button>
      )}
    </div>
  );
};
