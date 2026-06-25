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

import {CellsFiltersBar} from 'Components/conversation/conversationcells/common/cellsfiltersbar/cellsfiltersbar';
import type {FilterConfig} from 'Components/conversation/conversationcells/common/cellsfiltersbar/filterconfig';
import {CellsRepository} from 'Repositories/cells/cellsrepository';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {CellsFilters} from './cellsfilters/cellsfilters';
import {contentStyles, headingStyles, titleRowStyles, wrapperStyles} from './cellsheader.styles';
import {CellsRefresh} from './cellsrefresh/cellsrefresh';
import {CellsSearch} from './cellssearch/cellsseach';

import {CellsTableLoader} from '../common/cellstableloader/cellstableloader';

interface CellsHeaderProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  searchStatus: 'idle' | 'loading' | 'fetchingMore' | 'success' | 'error';
  filters: FilterConfig[];
  cellsRepository: CellsRepository;
  isSharedDriveSearchAndFiltersEnabled: boolean;
}

export const CellsHeader = ({
  searchValue,
  onSearch,
  onClearSearch,
  onRefresh,
  searchStatus,
  filters,
  cellsRepository,
  isSharedDriveSearchAndFiltersEnabled,
}: CellsHeaderProps) => {
  const {translate} = useApplicationContext();

  return (
    <header css={wrapperStyles}>
      <div css={titleRowStyles}>
        <h2 css={headingStyles}>{translate('cells.heading')}</h2>
        <CellsRefresh onRefresh={onRefresh} />
      </div>
      <div css={contentStyles}>
        <CellsSearch searchValue={searchValue} onSearch={onSearch} onClearSearch={onClearSearch} />
        {isSharedDriveSearchAndFiltersEnabled ? (
          <CellsFiltersBar filters={filters} />
        ) : (
          <CellsFilters cellsRepository={cellsRepository} />
        )}
        {searchStatus === 'loading' && <CellsTableLoader />}
        {searchStatus === 'error' && <p>{translate('cells.search.failed')}</p>}
      </div>
    </header>
  );
};
