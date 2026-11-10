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

import type {FunctionComponent} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CellsEmptyBinAction} from './cellsEmptyBinAction/cellsEmptyBinAction';
import {
  actionsStyles,
  breadcrumbsRowStyles,
  contentStyles,
  searchWrapperStyles,
  selectionBarBreadcrumbAnchorStyles,
  wrapperStyles,
} from './cellsHeader.styles';
import {CellsMoreMenu} from './cellsMoreMenu/cellsMoreMenu';
import {CellsNewMenu} from './cellsNewMenu/cellsNewMenu';
import {CellsRefresh} from './cellsRefresh/cellsRefresh';
import {CellsRootHomeIcon} from './cellsRootHomeIcon';

import {driveBulkActionsFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from '../../../../page/rootProvider';
import {CellsRepository} from '../../../../repositories/cells/cellsRepository';
import {CellsSearchInput} from '../../../cellsSearchInput/cellsSearchInput';
import {ConversationViewerPermissionBanner} from '../../conversationViewerPermissionBanner/conversationViewerPermissionBanner';
import {CellsBreadcrumbs} from '../common/cellsBreadcrumbs/cellsBreadcrumbs';
import {CellsFiltersBar} from '../common/cellsFiltersBar/cellsFiltersBar';
import type {FilterConfig} from '../common/cellsFiltersBar/filterConfig';
import {CELLS_ACTION, useCellsActionPermissions} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellsViewerAccessLabel} from '../common/cellsViewerAccessLabel';
import {getBreadcrumbsFromPath} from '../common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';
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
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  isUploadFilesEnabled: boolean;
  filters: FilterConfig[];
  showViewerPermission: boolean;
  onSelectionBarAnchorChange?: (anchor: HTMLDivElement | null) => void;
  onRefreshAfterEmptyBinOutcome: () => Promise<boolean>;
  onEmptyBinSubmitted: () => void;
  onEmptyBinInProgressChange: (isInProgress: boolean) => void;
  getCurrentCellsPath: () => string;
}

export const CellsHeader: FunctionComponent<CellsHeaderProps> = ({
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
  onUploadFiles,
  onUploadFolder,
  isUploadFilesEnabled,
  filters,
  showViewerPermission,
  onSelectionBarAnchorChange,
  onRefreshAfterEmptyBinOutcome,
  onEmptyBinSubmitted,
  onEmptyBinInProgressChange,
  getCurrentCellsPath,
}: CellsHeaderProps) => {
  const {translate, isFeatureToggleEnabled} = useApplicationContext();
  const isSelectionBarEnabled = isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const canPerformCellsAction = useCellsActionPermissions();
  const currentPath = getCurrentCellsPath();
  const breadcrumbs = getBreadcrumbsFromPath({
    baseCrumb: translate('cells.breadcrumb.files', {conversationName}, undefined, true),
    currentPath,
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
          <>
            {isInRecycleBin && (
              <CellsEmptyBinAction
                key={`${conversationQualifiedId.id}@${conversationQualifiedId.domain}`}
                cellsRepository={cellsRepository}
                conversationQualifiedId={conversationQualifiedId}
                getCurrentCellsPath={getCurrentCellsPath}
                onRefreshAfterEmptyBinOutcome={onRefreshAfterEmptyBinOutcome}
                onEmptyBinSubmitted={onEmptyBinSubmitted}
                onInProgressChange={onEmptyBinInProgressChange}
              />
            )}
            <div css={actionsStyles}>
              {!isInRecycleBin && (
                <CellsNewMenu
                  cellsRepository={cellsRepository}
                  conversationQualifiedId={conversationQualifiedId}
                  onRefresh={onRefresh}
                  onUploadFiles={onUploadFiles}
                  onUploadFolder={onUploadFolder}
                  isUploadFilesEnabled={isUploadFilesEnabled}
                />
              )}
              {shouldShowViewerAccessLabel && (
                <CellsViewerAccessLabel label={translate('cells.sharedDriveAccess.viewerAccess')} />
              )}
              <CellsRefresh onRefresh={onRefresh} />
              <CellsMoreMenu conversationQualifiedId={conversationQualifiedId} />
            </div>
          </>
        )}
      </div>

      {!isSearchViewOpen && (
        <div css={breadcrumbsRowStyles} data-uie-name="cells-selection-overlay-row">
          {isRootLevel ? (
            <CellsRootHomeIcon />
          ) : (
            <CellsBreadcrumbs
              items={breadcrumbs}
              onItemClick={item => {
                return openBreadcrumb({
                  conversationQualifiedId,
                  path:
                    breadcrumbs.find(crumb => {
                      return crumb.name === item.name;
                    })?.path ?? '',
                });
              }}
            />
          )}
          {isSelectionBarEnabled && <div css={selectionBarBreadcrumbAnchorStyles} ref={onSelectionBarAnchorChange} />}
        </div>
      )}

      {showViewerPermission && !isSearchViewOpen && !isInRecycleBin && (
        <ConversationViewerPermissionBanner
          key={`${conversationQualifiedId.id}@${conversationQualifiedId.domain}`}
          conversationId={`${conversationQualifiedId.id}@${conversationQualifiedId.domain}`}
        />
      )}
    </div>
  );
};
