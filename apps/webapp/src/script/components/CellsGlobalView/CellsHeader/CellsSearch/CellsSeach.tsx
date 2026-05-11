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

import {CellsSearchInput} from 'Components/CellsSearchInput/CellsSearchInput';
import {t} from 'Util/localizerUtil';

import {wrapperStyles} from './CellsSearch.styles';

interface CellsSearchProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
}

export const CellsSearch = ({searchValue, onSearch, onClearSearch}: CellsSearchProps) => (
  <div css={wrapperStyles}>
    <CellsSearchInput
      value={searchValue}
      placeholder={t('cells.search.placeholder')}
      onChange={onSearch}
      onClear={onClearSearch}
      clearAriaLabel={t('cells.search.closeButton')}
      uieName="cells-search-input"
    />
  </div>
);
