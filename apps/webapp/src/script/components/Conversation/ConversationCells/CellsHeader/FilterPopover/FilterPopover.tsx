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

import {Checkbox, CheckboxLabel, ChevronDownIcon, SearchIcon} from '@wireapp/react-ui-kit';

import {t} from 'Util/localizerUtil';

import {
  badgeStyles,
  checkboxLabelStyles,
  checkboxWrapperStyles,
  clearAllButtonStyles,
  dialogStyles,
  emptyStateStyles,
  footerStyles,
  itemListStyles,
  itemRowHoverStyles,
  labelGroupStyles,
  popoverStyles,
  searchIconStyles,
  searchInputStyles,
  searchRowStyles,
  singleSelectRowStyles,
  startContentStyles,
  subLabelStyles,
  triggerButtonStyles,
} from './FilterPopover.styles';

export interface FilterItem {
  id: string;
  label: string;
  subLabel?: string;
  startContent?: ReactNode;
}

interface CellsTagsFilterProps {
  triggerLabel: string;
  items: FilterItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isMultiSelect?: boolean;
}

export const FilterPopover = ({
  triggerLabel,
  items,
  selectedIds,
  onSelectionChange,
  isMultiSelect = true,
}: CellsTagsFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredItems = useMemo(
    () => items.filter(item => item.label.toLowerCase().includes(searchValue.toLowerCase())),
    [items, searchValue],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchValue('');
    }
  }, []);

  const handleItemSelect = useCallback(
    (id: string) => {
      if (isMultiSelect) {
        if (selectedIds.includes(id)) {
          onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
        } else {
          onSelectionChange([...selectedIds, id]);
        }
      } else {
        onSelectionChange([id]);
        setIsOpen(false);
      }
    },
    [isMultiSelect, selectedIds, onSelectionChange],
  );

  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const count = selectedIds.length;

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button css={triggerButtonStyles} aria-label={triggerLabel} data-uie-name="filter-popover-button">
        {triggerLabel}
        {count > 0 && (
          <span css={badgeStyles} aria-label={`${count} selected`}>
            {count}
          </span>
        )}
        <ChevronDownIcon />
      </Button>

      <Popover css={popoverStyles} placement="bottom start" offset={4}>
        <Dialog css={dialogStyles} aria-label={triggerLabel}>
          <div css={searchRowStyles}>
            <SearchIcon css={searchIconStyles} />
            <input
              css={searchInputStyles}
              type="text"
              placeholder={t('cells.tagsFilter.searchPlaceholder')}
              aria-label={t('cells.tagsFilter.searchPlaceholder')}
              value={searchValue}
              onChange={event => setSearchValue(event.target.value)}
              data-uie-name="filter-popover-search"
            />
          </div>

          <ul css={itemListStyles} role="listbox" aria-multiselectable={isMultiSelect} aria-label={triggerLabel}>
            {filteredItems.length === 0 ? (
              <li css={emptyStateStyles}>{t('cells.filtersModal.tags.noTagsFound')}</li>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <li key={item.id} css={itemRowHoverStyles} role="option" aria-selected={isSelected}>
                    {isMultiSelect ? (
                      <Checkbox
                        wrapperCSS={checkboxWrapperStyles}
                        checked={isSelected}
                        onChange={() => handleItemSelect(item.id)}
                        labelBeforeCheckbox
                        data-uie-name="filter-popover-item"
                        data-uie-value={item.id}
                      >
                        {/* labelGroup comes first in DOM so it appears second (middle) after row-reverse */}
                        <span css={labelGroupStyles}>
                          <CheckboxLabel css={checkboxLabelStyles}>{item.label}</CheckboxLabel>
                          {item.subLabel && <span css={subLabelStyles}>{item.subLabel}</span>}
                        </span>
                        {/* startContent comes second in DOM so it appears first (leftmost) after row-reverse */}
                        {item.startContent && <span css={startContentStyles}>{item.startContent}</span>}
                      </Checkbox>
                    ) : (
                      <button
                        type="button"
                        css={singleSelectRowStyles}
                        onClick={() => handleItemSelect(item.id)}
                        data-uie-name="filter-popover-item"
                        data-uie-value={item.id}
                      >
                        {item.startContent && <span css={startContentStyles}>{item.startContent}</span>}
                        <span css={labelGroupStyles}>
                          <span css={checkboxLabelStyles}>{item.label}</span>
                          {item.subLabel && <span css={subLabelStyles}>{item.subLabel}</span>}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {isMultiSelect && (
            <div css={footerStyles}>
              <button
                type="button"
                css={clearAllButtonStyles}
                onClick={clearAll}
                data-uie-name="filter-popover-clear-all"
              >
                {t('cells.clearFilters.button')}
              </button>
            </div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
};
