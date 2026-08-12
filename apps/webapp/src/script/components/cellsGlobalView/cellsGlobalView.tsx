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

import {ReactElement} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {hasActiveGlobalDriveFilters} from 'Components/Conversation/ConversationCells/common/driveFilters/driveFilters';
import {useCellsSorting} from 'Components/Conversation/ConversationCells/common/useCellsSorting/useCellsSorting';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {UserState} from 'Repositories/user/userState';

import {loadMoreWrapperStyles, wrapperStyles} from './cellsGlobalView.styles';
import {CellsHeader} from './cellsHeader/cellsHeader';
import {CellsLoader} from './cellsLoader/cellsLoader';
import {CellsStateInfo} from './cellsStateInfo/cellsStateInfo';
import {CellsTable} from './cellsTable/cellsTable';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {useGlobalDriveFilters} from './common/useGlobalDriveFilters/useGlobalDriveFilters';
import {useOnPresignedUrlExpired} from './useOnPresignedUrlExpired/useOnPresignedUrlExpired';
import {useSearchCellsNodes} from './useSearchCellsNodes/useSearchCellsNodes';

import {useApplicationContext} from '../../page/rootProvider';

interface CellsGlobalViewProps {
  cellsRepository?: CellsRepository;
  userRepository?: UserRepository;
  conversationRepository?: ConversationRepository;
  userState?: UserState;
}

export const CellsGlobalView = (properties: CellsGlobalViewProps): ReactElement => {
  const defaultGlobalFilesSort = {field: 'mtime', direction: 'desc'} as const;
  const {
    cellsRepository = container.resolve(CellsRepository),
    userRepository = container.resolve(UserRepository),
    conversationRepository = container.resolve(ConversationRepository),
    userState = container.resolve(UserState),
  } = properties;
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const {nodes, status: nodesStatus, pagination} = useCellsStore();

  const {filters, filterState} = useGlobalDriveFilters({cellsRepository, conversationRepository, translate});
  const {sort, getDirectionFor, toggleSort} = useCellsSorting('default', defaultGlobalFilesSort);

  const {searchValue, handleSearch, handleClearSearch, handleReload, increasePageSize} = useSearchCellsNodes({
    cellsRepository,
    userRepository,
    conversationRepository,
    fireAndForgetInvoker,
    filters: filterState,
    sort,
    selfUserTeamId: userState.self().teamId,
  });

  useOnPresignedUrlExpired({refreshCallback: handleReload});

  const isLoading = nodesStatus === 'loading';
  const isFetchingMore = nodesStatus === 'fetchingMore';
  const isError = nodesStatus === 'error';
  const isSuccess = nodesStatus === 'success';
  const hasFiles = nodes.length > 0;
  const hasActiveSearchCriteria = isNonEmptyString(searchValue) || hasActiveGlobalDriveFilters(filterState);
  const emptySearchResults = hasActiveSearchCriteria && nodesStatus === 'success' && nodes.length === 0;

  const showTable =
    (isSuccess || (pagination !== undefined && pagination !== null && isFetchingMore)) && !emptySearchResults;
  const showNoFiles = !isLoading && !isFetchingMore && !isError && !hasFiles && !emptySearchResults;
  const showLoader = isFetchingMore && nodes.length > 0;

  const showLoadMore =
    !isLoading &&
    !isFetchingMore &&
    !emptySearchResults &&
    isSuccess &&
    pagination !== undefined &&
    pagination !== null &&
    pagination.currentPage < pagination.totalPages;

  return (
    <div css={wrapperStyles}>
      <CellsHeader
        searchValue={searchValue}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onRefresh={handleReload}
        searchStatus={nodesStatus}
        filters={filters}
      />
      {emptySearchResults && (
        <CellsStateInfo
          variant="search"
          heading={translate('cells.emptySearchResults.heading')}
          description={translate('cells.emptySearchResults.description')}
        />
      )}
      {showTable && (
        <CellsTable
          nodes={nodes}
          cellsRepository={cellsRepository}
          getDirectionFor={getDirectionFor}
          isSortingEnabled
          onToggleSort={toggleSort}
        />
      )}
      {showNoFiles && (
        <CellsStateInfo
          heading={translate('cells.noNodes.global.heading')}
          description={translate('cells.noNodes.global.description')}
        />
      )}
      {showLoader && <CellsLoader />}
      {isError && (
        <CellsStateInfo heading={translate('cells.error.heading')} description={translate('cells.error.description')} />
      )}
      {showLoadMore && (
        <div css={loadMoreWrapperStyles}>
          <Button variant={ButtonVariant.TERTIARY} onClick={increasePageSize}>
            {translate('cells.pagination.loadMoreResults')}
          </Button>
        </div>
      )}
    </div>
  );
};
