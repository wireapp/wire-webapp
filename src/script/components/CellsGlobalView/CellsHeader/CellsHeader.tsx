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

import {t} from 'Util/LocalizerUtil';

import {contentStyles, headingStyles, searchWrapperStyles, wrapperStyles} from './CellsHeader.styles';
import {CellsRefresh} from './CellsRefresh/CellsRefresh';
import {CellsSearch} from './CellsSearch/CellsSeach';

import {CellsTableLoader} from '../common/CellsTableLoader/CellsTableLoader';

interface CellsHeaderProps {
  searchValue: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  searchStatus: 'idle' | 'loading' | 'fetchingMore' | 'success' | 'error';
}

export const CellsHeader = ({searchValue, onSearch, onClearSearch, onRefresh, searchStatus}: CellsHeaderProps) => {
  return (
    <header css={wrapperStyles}>
      <h2 css={headingStyles}>{t('cells.heading')}</h2>
      <div css={contentStyles}>
        <div css={searchWrapperStyles}>
          <CellsSearch searchValue={searchValue} onSearch={onSearch} onClearSearch={onClearSearch} />
          {searchStatus === 'loading' && <CellsTableLoader />}
          {searchStatus === 'error' && <p>{t('cells.search.failed')}</p>}
        </div>
        <CellsRefresh onRefresh={onRefresh} />
      </div>
    </header>
  );
};
