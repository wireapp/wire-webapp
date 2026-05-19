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

import {CellsFiltersBar} from 'Components/conversation/conversationCells/common/cellsFiltersBar/cellsFiltersBar';
import type {FilterConfig} from 'Components/conversation/conversationCells/common/cellsFiltersBar/filterConfig';
import {t} from 'Util/localizerUtil';

import {contentStyles, headingStyles, titleRowStyles, wrapperStyles} from './cellsHeader.styles';
import {CellsRefresh} from './cellsRefresh/cellsRefresh';
import {CellsSearch} from './cellsSearch/cellsSeach';

import {CellsTableLoader} from '../common/cellsTableLoader/cellsTableLoader';

interface CellsHeaderProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  searchStatus: 'idle' | 'loading' | 'fetchingMore' | 'success' | 'error';
  filters: FilterConfig[];
}

export const CellsHeader = ({
  searchValue,
  onSearch,
  onClearSearch,
  onRefresh,
  searchStatus,
  filters,
}: CellsHeaderProps) => {
  return (
    <header css={wrapperStyles}>
      <div css={titleRowStyles}>
        <h2 css={headingStyles}>{t('cells.heading')}</h2>
        <CellsRefresh onRefresh={onRefresh} />
      </div>
      <div css={contentStyles}>
        <CellsSearch searchValue={searchValue} onSearch={onSearch} onClearSearch={onClearSearch} />
        <CellsFiltersBar filters={filters} />
        {searchStatus === 'loading' && <CellsTableLoader />}
        {searchStatus === 'error' && <p>{t('cells.search.failed')}</p>}
      </div>
    </header>
  );
};
