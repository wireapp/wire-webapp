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

import {FormEvent} from 'react';

import {CircleCloseIcon, Input, SearchIcon} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {
  closeButtonStyles,
  closeIconStyles,
  inputStyles,
  inputWrapperStyles,
  searchIconStyles,
  wrapperStyles,
} from './CellsSearch.styles';

interface CellsSearchProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
}

export const CellsSearch = ({searchValue, onSearch, onClearSearch}: CellsSearchProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchValue = formData.get('cells-global-view-search') as string;
    onSearch(searchValue);
  };

  return (
    <form css={wrapperStyles} onSubmit={handleSubmit}>
      <Input
        value={searchValue}
        placeholder={t('cellsGlobalView.searchPlaceholder')}
        aria-label={t('cellsGlobalView.searchPlaceholder')}
        name="cells-global-view-search"
        onChange={event => onSearch(event.currentTarget.value)}
        startContent={<SearchIcon width={14} height={14} css={searchIconStyles} />}
        endContent={
          <>
            {searchValue && (
              <button
                type="button"
                onClick={onClearSearch}
                css={closeButtonStyles}
                aria-label={t('cellsGlobalView.searchCloseButton')}
              >
                <CircleCloseIcon className="cursor-pointer" css={closeIconStyles} />
              </button>
            )}
          </>
        }
        inputCSS={inputStyles}
        wrapperCSS={inputWrapperStyles}
      />
    </form>
  );
};
