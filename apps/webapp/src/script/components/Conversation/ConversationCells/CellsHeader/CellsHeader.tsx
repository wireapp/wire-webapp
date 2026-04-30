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

import {SearchIcon} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {t} from 'Util/localizerUtil';

import {
  actionsStyles,
  breadcrumbsRowStyles,
  clearButtonStyles,
  contentStyles,
  searchIconStyles,
  searchInputStyles,
  searchNativeInputStyles,
  wrapperStyles,
} from './CellsHeader.styles';
import {CellsMoreMenu} from './CellsMoreMenu/CellsMoreMenu';
import {CellsNewMenu} from './CellsNewMenu/CellsNewMenu';
import {CellsRefresh} from './CellsRefresh/CellsRefresh';
import {CellsSearchClearIcon} from './CellsSearchClearIcon';
import {CellsRootHomeIcon} from './CellsRootHomeIcon';

import {CellsBreadcrumbs} from '../common/CellsBreadcrumbs/CellsBreadcrumbs';
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
}: CellsHeaderProps) => {
  const breadcrumbs = getBreadcrumbsFromPath({
    baseCrumb: t('cells.breadcrumb.files', {conversationName}),
    currentPath: getCellsFilesPath(),
  });
  const isRootLevel = breadcrumbs.length === 1;

  return (
    <div css={wrapperStyles}>
      <div css={contentStyles}>
        <div css={searchInputStyles}>
          <SearchIcon css={searchIconStyles} />

          <input
            css={searchNativeInputStyles}
            type="text"
            value={searchValue}
            aria-label={t('cells.search.placeholder')}
            placeholder={t('cells.search.placeholder')}
            onFocus={onOpenSearchView}
            onChange={event => onSearchChange(event.currentTarget.value)}
            data-uie-name="full-search-header-input"
          />

          {searchValue && (
            <button
              type="button"
              css={clearButtonStyles}
              data-uie-name="full-search-dismiss"
              aria-label={t('fullsearchCancelCloseBtn')}
              onClick={onSearchClear}
            >
              <CellsSearchClearIcon />
            </button>
          )}
        </div>
        {!isSearchViewOpen && (
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
