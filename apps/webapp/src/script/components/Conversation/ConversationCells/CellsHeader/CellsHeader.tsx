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

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellsSearchInput} from 'Components/cellsSearchInput/cellsSearchInput';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  actionsStyles,
  breadcrumbsRowStyles,
  contentStyles,
  searchWrapperStyles,
  wrapperStyles,
} from './CellsHeader.styles';
import {CellsMoreMenu} from './CellsMoreMenu/CellsMoreMenu';
import {CellsNewMenu} from './CellsNewMenu/CellsNewMenu';
import {CellsRefresh} from './CellsRefresh/CellsRefresh';
import {CellsRootHomeIcon} from './CellsRootHomeIcon';

import {CellsBreadcrumbs} from '../common/CellsBreadcrumbs/CellsBreadcrumbs';
import {CellsFiltersBar} from '../common/CellsFiltersBar/CellsFiltersBar';
import type {FilterConfig} from '../common/CellsFiltersBar/filterConfig';
import {getBreadcrumbsFromPath} from '../common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {openBreadcrumb} from '../common/openBreadcrumb/openBreadcrumb';

interface CellsHeaderProps {
  onRefresh: () => void;
  conversationName: string;
  conversationQualifiedId: QualifiedId;
  cellsRepository: CellsRepository;
  isSearchViewOpen: boolean;
  onOpenSearchView: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  filters: FilterConfig[];
}

export const CellsHeader = ({
  onRefresh,
  conversationName,
  conversationQualifiedId,
  cellsRepository,
  isSearchViewOpen,
  onOpenSearchView,
  searchValue,
  onSearchChange,
  onSearchClear,
  filters,
}: CellsHeaderProps) => {
  const {translate} = useApplicationContext();
  const breadcrumbs = getBreadcrumbsFromPath({
    baseCrumb: translate('cells.breadcrumb.files', {conversationName}),
    currentPath: getCellsFilesPath(),
    recycleBinLabel: translate('cells.recycleBin.breadcrumb'),
  });
  const isRootLevel = breadcrumbs.length === 1;

  return (
    <div css={wrapperStyles}>
      <div css={contentStyles}>
        <div css={searchWrapperStyles}>
          <CellsSearchInput
            value={searchValue}
            placeholder={translate('cells.search.placeholder')}
            onChange={onSearchChange}
            onClear={onSearchClear}
            onFocus={onOpenSearchView}
            clearAriaLabel={translate('fullsearchCancelCloseBtn')}
            uieName="full-search-header-input"
          />
        </div>

        {isSearchViewOpen ? (
          <CellsFiltersBar filters={filters} />
        ) : (
          <div css={actionsStyles}>
            <CellsNewMenu
              cellsRepository={cellsRepository}
              conversationQualifiedId={conversationQualifiedId}
              onRefresh={onRefresh}
            />
            <CellsRefresh onRefresh={onRefresh} />
            <CellsMoreMenu conversationQualifiedId={conversationQualifiedId} />
          </div>
        )}
      </div>

      {!isSearchViewOpen && (
        <div css={breadcrumbsRowStyles}>
          {isRootLevel ? (
            <CellsRootHomeIcon />
          ) : (
            <CellsBreadcrumbs
              items={breadcrumbs}
              onItemClick={item =>
                openBreadcrumb({
                  conversationQualifiedId,
                  path: breadcrumbs.find(crumb => crumb.name === item.name)?.path ?? '',
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
