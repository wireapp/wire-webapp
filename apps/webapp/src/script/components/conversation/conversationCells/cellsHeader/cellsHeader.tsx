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
import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellsViewerAccessLabel} from 'Components/conversation/conversationCells/common/cellsViewerAccessLabel';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  actionsStyles,
  breadcrumbsRowStyles,
  contentStyles,
  searchWrapperStyles,
  wrapperStyles,
} from './cellsHeader.styles';
import {CellsMoreMenu} from './cellsMoreMenu/cellsMoreMenu';
import {CellsNewMenu} from './cellsNewMenu/cellsNewMenu';
import {CellsRefresh} from './cellsRefresh/cellsRefresh';
import {CellsRootHomeIcon} from './cellsRootHomeIcon';

import {ConversationViewerPermissionBanner} from '../../conversationViewerPermissionBanner/conversationViewerPermissionBanner';
import {CellsBreadcrumbs} from '../common/cellsBreadcrumbs/cellsBreadcrumbs';
import {CellsFiltersBar} from '../common/cellsFiltersBar/cellsFiltersBar';
import type {FilterConfig} from '../common/cellsFiltersBar/filterConfig';
import {getBreadcrumbsFromPath} from '../common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {openBreadcrumb} from '../common/openBreadcrumb/openBreadcrumb';

interface CellsHeaderProps {
  onRefresh: () => void;
  conversationName: string;
  conversationQualifiedId: QualifiedId;
  cellsRepository: CellsRepository;
  isSearchViewOpen: boolean;
  isInRecycleBin: boolean;
  onOpenSearchView: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  filters: FilterConfig[];
  showViewerPermission: boolean;
}

export const CellsHeader = ({
  onRefresh,
  conversationName,
  conversationQualifiedId,
  cellsRepository,
  isSearchViewOpen,
  isInRecycleBin,
  onOpenSearchView,
  searchValue,
  onSearchChange,
  onSearchClear,
  filters,
  showViewerPermission,
}: CellsHeaderProps) => {
  const {translate} = useApplicationContext();
  const canPerformCellsAction = useCellsActionPermissions();
  const breadcrumbs = getBreadcrumbsFromPath({
    baseCrumb: translate('cells.breadcrumb.files', {conversationName}),
    currentPath: getCellsFilesPath(),
    recycleBinLabel: translate('cells.recycleBin.breadcrumb'),
  });
  const isRootLevel = breadcrumbs.length === 1;
  const shouldShowViewerAccessLabel = !isInRecycleBin && !canPerformCellsAction(CELLS_ACTION.CREATE);

  return (
    <div css={wrapperStyles}>
      <div css={contentStyles}>
        {!isInRecycleBin && (
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
        )}

        {isSearchViewOpen && !isInRecycleBin ? (
          <CellsFiltersBar filters={filters} />
        ) : (
          <div css={actionsStyles}>
            {!isInRecycleBin && (
              <CellsNewMenu
                cellsRepository={cellsRepository}
                conversationQualifiedId={conversationQualifiedId}
                onRefresh={onRefresh}
              />
            )}
            {shouldShowViewerAccessLabel && (
              <CellsViewerAccessLabel label={translate('cells.sharedDriveAccess.viewerAccess')} />
            )}
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

      {showViewerPermission && !isSearchViewOpen && !isInRecycleBin && <ConversationViewerPermissionBanner />}
    </div>
  );
};
