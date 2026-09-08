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

import {ReactNode, useCallback, useMemo, useState} from 'react';

import {Button, Dialog, DialogTrigger, Popover} from 'react-aria-components';

import {Checkbox, CheckboxLabel, CircleCloseIcon, SearchIcon} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  badgeStyles,
  checkboxLabelStyles,
  checkboxSubLabelStyles,
  checkboxWrapperStyles,
  clearAllButtonStyles,
  dialogStyles,
  emptyStateStyles,
  footerStyles,
  itemListStyles,
  itemRowHoverStyles,
  labelGroupStyles,
  popoverStyles,
  searchClearButtonStyles,
  searchIconStyles,
  searchInputStyles,
  searchRowStyles,
  startContentStyles,
  triggerButtonStyles,
} from './filterPopover.styles';

export interface FilterItem {
  id: string;
  label: string;
  subLabel?: string;
  startContent?: ReactNode;
}

export const filterItems = (items: FilterItem[], query: string): FilterItem[] => {
  if (!query) {
    return items;
  }
  const lowerQuery = query.toLowerCase();
  return items.filter(
    item => item.label.toLowerCase().includes(lowerQuery) || item.subLabel?.toLowerCase().includes(lowerQuery) === true,
  );
};

export const computeNextSelection = (currentIds: string[], id: string): string[] =>
  currentIds.includes(id) ? currentIds.filter(existing => existing !== id) : [...currentIds, id];

interface FilterPopoverProps {
  triggerLabel: string;
  items: FilterItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
  singleSelect: boolean;
}

export const FilterPopover = ({
  triggerLabel,
  items,
  selectedIds,
  onSelectionChange,
  disabled = false,
  singleSelect,
}: FilterPopoverProps) => {
  const {translate} = useApplicationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredItems = useMemo(() => filterItems(items, searchValue), [items, searchValue]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (disabled && open) {
        return;
      }
      setIsOpen(open);
      if (!open) {
        setSearchValue('');
      }
    },
    [disabled],
  );

  const handleItemSelect = useCallback(
    (id: string) => {
      onSelectionChange(computeNextSelection(selectedIds, id));
    },
    [selectedIds, onSelectionChange],
  );

  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const count = selectedIds.length;

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button
        css={triggerButtonStyles}
        aria-label={triggerLabel}
        isDisabled={disabled}
        data-uie-name="filter-popover-button"
        data-active={count > 0}
      >
        {triggerLabel}
        {count > 0 && (
          <span css={badgeStyles} aria-label={translate('cells.filterPopover.selectedCount', {count})}>
            {count}
          </span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.27426 4.77426C2.89629 4.39629 3.16399 3.75 3.69853 3.75H8.30147C8.83601 3.75 9.10371 4.39629 8.72574 4.77426L6.42426 7.07574C6.18995 7.31005 5.81005 7.31005 5.57574 7.07574L3.27426 4.77426Z"
            fill="currentColor"
          />
        </svg>
      </Button>

      <Popover css={popoverStyles} placement="bottom start" offset={4}>
        <Dialog css={dialogStyles} aria-label={triggerLabel}>
          <div css={searchRowStyles}>
            <SearchIcon css={searchIconStyles} />
            <input
              css={searchInputStyles}
              type="text"
              placeholder={translate('cells.filterPopover.search.placeholder', {
                filterName: triggerLabel.toLowerCase(),
              })}
              aria-label={translate('cells.filterPopover.search.placeholder', {
                filterName: triggerLabel.toLowerCase(),
              })}
              value={searchValue}
              onChange={event => setSearchValue(event.target.value)}
              data-uie-name="filter-popover-search"
            />
            {searchValue && (
              <button
                type="button"
                css={searchClearButtonStyles}
                aria-label={translate('cells.filterPopover.search.clearButton')}
                onClick={() => setSearchValue('')}
              >
                <CircleCloseIcon color="currentColor" />
              </button>
            )}
          </div>

          <ul css={itemListStyles} role="listbox" aria-multiselectable={!singleSelect} aria-label={triggerLabel}>
            {filteredItems.length === 0 ? (
              <li css={emptyStateStyles}>{translate('cells.filtersModal.tags.noTagsFound')}</li>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const isItemDisabled = singleSelect && selectedIds.length > 0 && !isSelected;
                const hasStartContent = item.startContent !== undefined && item.startContent !== null;
                return (
                  <li key={item.id} css={itemRowHoverStyles} role="option" aria-selected={isSelected}>
                    <Checkbox
                      wrapperCSS={checkboxWrapperStyles}
                      checked={isSelected}
                      disabled={isItemDisabled}
                      onChange={() => handleItemSelect(item.id)}
                      labelBeforeCheckbox
                      data-uie-name="filter-popover-item"
                      data-uie-value={item.id}
                    >
                      {hasStartContent && <span css={startContentStyles}>{item.startContent}</span>}
                      <span css={labelGroupStyles} data-has-start-content={hasStartContent}>
                        <CheckboxLabel css={checkboxLabelStyles}>{item.label}</CheckboxLabel>
                        {item.subLabel !== undefined && item.subLabel.length > 0 && (
                          <span css={checkboxSubLabelStyles}>{item.subLabel}</span>
                        )}
                      </span>
                    </Checkbox>
                  </li>
                );
              })
            )}
          </ul>

          <div css={footerStyles}>
            <button
              type="button"
              css={clearAllButtonStyles}
              onClick={clearAll}
              data-uie-name="filter-popover-clear-all"
            >
              {translate('cells.clearFilters.button')}
            </button>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
};
