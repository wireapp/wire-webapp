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

import {memo, useCallback, useEffect, useRef} from 'react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {UserRepository} from 'Repositories/user/userRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {CellsHeader} from './cellsHeader/cellsHeader';
import {CellsLoader} from './cellsLoader/cellsLoader';
import {CellsPagination} from './cellsPagination/cellsPagination';
import {CellsStateInfo} from './cellsStateInfo/cellsStateInfo';
import {CellsTable} from './cellsTable/cellsTable';
import {
  CellsSelfUserDriveRoleProvider,
  getSelfUserDriveRole,
} from './common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {getCellsApiPath} from './common/getCellsApiPath/getCellsApiPath';
import {getCellsFilesPath} from './common/getCellsFilesPath/getCellsFilesPath';
import {getLoadMoreOffset} from './common/loadMorePagination/loadMorePagination';
import {isInRecycleBin as isCurrentPathInRecycleBin} from './common/recycleBin/recycleBin';
import {useCellsSorting} from './common/useCellsSorting/useCellsSorting';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {useConversationDriveFilters} from './common/useConversationDriveFilters/useConversationDriveFilters';
import {
  loadMoreErrorMessageStyles,
  loadMoreErrorWrapperStyles,
  loadMoreWrapperStyles,
  wrapperStyles,
} from './conversationCells.styles';
import {useSharedDriveUploadController} from './sharedDriveUploadContext';
import {handleSharedDriveUploadInput} from './sharedDriveUploadInput';
import {useCellsPagination} from './useCellsPagination/useCellsPagination';
import {useConversationSearchFiles} from './useConversationSearch/useConversationSearchFiles';
import {useGetAllCellsNodes} from './useGetAllCellsNodes/useGetAllCellsNodes';
import {useOnPresignedUrlExpired} from './useOnPresignedUrlExpired/useOnPresignedUrlExpired';
import {useRefreshCellsState} from './useRefreshCellsState/useRefreshCellsState';

interface ConversationCellsProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  isSearchViewOpen: boolean;
  onOpenSearchView: () => void;
  onCloseSearchView: () => void;
  onUploadFolder: () => void;
  isUploadFilesEnabled: boolean;
  showViewerPermission: boolean;
}

export const ConversationCells = memo(
  ({
    cellsRepository,
    userRepository,
    activeConversation,
    conversationRepository,
    isSearchViewOpen,
    onOpenSearchView,
    onCloseSearchView,
    onUploadFolder,
    isUploadFilesEnabled,
    showViewerPermission,
  }: ConversationCellsProps) => {
    const {fireAndForgetInvoker, translate} = useApplicationContext();
    const sharedDriveUploadController = useSharedDriveUploadController();
    const uploadInput = useRef<HTMLInputElement>(null);
    const onUploadFiles = () => uploadInput.current?.click();
    const {
      cellsState: initialCellState,
      name,
      selfUser,
    } = useKoSubscribableChildren(activeConversation, ['cellsState', 'name', 'selfUser']);

    const {getNodes, status: nodesStatus, getPagination, error: storeError, clearAll} = useCellsStore();

    const conversationId = activeConversation.id;
    const conversationQualifiedId = activeConversation.qualifiedId;

    const {cellsState, isRefreshing} = useRefreshCellsState({
      initialCellState,
      conversationRepository,
      conversationQualifiedId,
      fireAndForgetInvoker,
    });

    const isCellsStateReady = cellsState === CONVERSATION_CELLS_STATE.READY;
    const isCellsStatePending = cellsState === CONVERSATION_CELLS_STATE.PENDING;
    const isInRecycleBin = isCurrentPathInRecycleBin();
    const isSearchMode = isSearchViewOpen && !isInRecycleBin;

    const sortScopeKey = `${conversationId}:${isSearchMode ? 'search' : 'browse'}`;
    const {sort, setSort, getDirectionFor, toggleSort} = useCellsSorting(sortScopeKey);

    const {refresh, setOffset} = useGetAllCellsNodes({
      cellsRepository,
      conversationQualifiedId,
      //Without this, the browse hook's hashchange handler would compete with
      // (and flap against) search results.
      enabled: isCellsStateReady && !isSearchMode,
      fireAndForgetInvoker,
      userRepository,
      sort,
    });

    const {filters, filterState, clearAllFilters} = useConversationDriveFilters({
      cellsRepository,
      conversationRepository,
      translate,
    });

    const {
      searchValue,
      handleSearch,
      handleReload,
      handleClearSearch: clearSearch,
      loadMore: loadMoreSearchResults,
    } = useConversationSearchFiles({
      cellsRepository,
      conversationQualifiedId,
      enabled: isCellsStateReady && isSearchMode,
      fireAndForgetInvoker,
      userRepository,
      filters: filterState,
      onClear: refresh,
      sort,
    });

    // Search view open ⇒ load-more UI + search-hook data; closed ⇒ page-nav UI + browse-hook data.
    // The mode is owned by the view, not by whether the user has typed/filtered yet.
    const wasSearchViewOpen = useRef(isSearchMode);

    const handleClearSearch = useCallback((): void => {
      clearSearch();
    }, [clearSearch]);

    useEffect(() => {
      if (wasSearchViewOpen.current && !isSearchMode) {
        // Search view just closed — reset any active search/filter and restore the
        // browse-mode dataset (handled by clearSearch's onClear callback → refresh).
        clearAll({conversationId});
        clearAllFilters();
        clearSearch({preserveFilters: false});
      }
      wasSearchViewOpen.current = isSearchMode;
    }, [clearAll, clearAllFilters, clearSearch, conversationId, isSearchMode]);

    // Navigating into a folder or the recycle bin happens via the URL hash without
    // remounting; reset the sort on those transitions too.
    useEffect(() => {
      const closeSearchInRecycleBin = (): void => {
        if (isSearchViewOpen && isCurrentPathInRecycleBin()) {
          onCloseSearchView();
        }
      };
      const handleHashChange = (): void => {
        setSort(null);
        closeSearchInRecycleBin();
      };

      closeSearchInRecycleBin();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, [isSearchViewOpen, onCloseSearchView, setSort]);

    const handleRefresh = useCallback((): void => {
      if (isSearchMode) {
        fireAndForgetInvoker.fireAndForget(handleReload);
        return;
      }

      fireAndForgetInvoker.fireAndForget(refresh);
    }, [fireAndForgetInvoker, handleReload, isSearchMode, refresh]);

    const sharedDriveUploadPath = getCellsApiPath({conversationQualifiedId, currentPath: getCellsFilesPath()});
    const handleUploadFiles = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void =>
        handleSharedDriveUploadInput(event, {
          fireAndForgetInvoker,
          onRefresh: handleRefresh,
          sharedDriveUploadController,
          uploadPath: sharedDriveUploadPath,
        }),
      [fireAndForgetInvoker, handleRefresh, sharedDriveUploadController, sharedDriveUploadPath],
    );

    const nodes = getNodes({conversationId});
    const pagination = getPagination({conversationId});
    const loadMoreOffset = getLoadMoreOffset(pagination);

    const {goToPage, getPaginationProps} = useCellsPagination({
      pagination,
      conversationId,
      setOffset,
      currentNodesCount: nodes.length,
    });

    const handleLoadMore = useCallback(async (): Promise<void> => {
      await loadMoreOffset.match({
        Just: offset => loadMoreSearchResults(offset),
        Nothing: () => Promise.resolve(),
      });
    }, [loadMoreOffset, loadMoreSearchResults]);

    const handleSearchViewClosure = isSearchMode ? onCloseSearchView : undefined;

    useOnPresignedUrlExpired({conversationId, refreshCallback: handleRefresh});

    const isLoading = nodesStatus === 'loading';
    const isFetchingMore = nodesStatus === 'fetchingMore';
    const isError = nodesStatus === 'error';
    const isSuccess = nodesStatus === 'success';

    const hasNodes = !!nodes.length;
    const emptyView = !isError && !hasNodes && isCellsStateReady;

    const isLoadingVisible = isLoading && isCellsStateReady;
    const isFetchingMoreVisible = isFetchingMore && isCellsStateReady && hasNodes;
    const isNoNodesVisible = !isLoading && !isFetchingMore && emptyView && !isInRecycleBin;
    const isEmptyRecycleBin = isInRecycleBin && emptyView && !isLoading && !isFetchingMore;
    const isEmptySearchResultsVisible = isSearchMode && isNoNodesVisible;
    const isTableVisible =
      (isSuccess || isLoading || isFetchingMore) && isCellsStateReady && !isEmptySearchResultsVisible;
    const hasMorePages = loadMoreOffset.isJust;
    const hasAppendError = isSuccess && hasNodes && storeError !== null;

    const isPaginationVisible = !isSearchMode && !emptyView;
    const isLoadMoreVisible =
      isSearchMode && !isLoading && !isFetchingMore && !emptyView && isSuccess && hasMorePages && !hasAppendError;
    const isLoadMoreErrorVisible = isSearchMode && hasAppendError && hasMorePages;
    const selfUserDriveRole = getSelfUserDriveRole({
      conversationTeamId: activeConversation.teamId,
      selfUserTeamId: selfUser?.teamId,
    });

    return (
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={selfUserDriveRole}>
        <div css={wrapperStyles}>
          <input ref={uploadInput} type="file" multiple hidden onChange={handleUploadFiles} />
          <CellsHeader
            onRefresh={handleRefresh}
            conversationName={name}
            conversationQualifiedId={conversationQualifiedId}
            cellsRepository={cellsRepository}
            isSearchViewOpen={isSearchMode}
            isInRecycleBin={isInRecycleBin}
            onOpenSearchView={onOpenSearchView}
            searchValue={searchValue}
            onSearchChange={handleSearch}
            onSearchClear={handleClearSearch}
            onUploadFiles={onUploadFiles}
            onUploadFolder={onUploadFolder}
            isUploadFilesEnabled={isUploadFilesEnabled}
            filters={filters}
            showViewerPermission={showViewerPermission}
          />
          {isTableVisible && (
            <CellsTable
              nodes={isLoading ? [] : nodes}
              cellsRepository={cellsRepository}
              conversation={activeConversation}
              conversationQualifiedId={conversationQualifiedId}
              conversationName={name}
              onRefresh={handleRefresh}
              // opening a folder must close search view and open the browse view
              // with that folder (and breadcrumbs)
              onCloseSearchView={handleSearchViewClosure}
              getDirectionFor={getDirectionFor}
              isSortingEnabled={!isInRecycleBin}
              onToggleSort={toggleSort}
            />
          )}
          {isCellsStatePending && !isRefreshing && (
            <CellsStateInfo
              heading={translate('cells.pending.heading')}
              description={translate('cells.pending.description')}
            />
          )}
          {isNoNodesVisible && !isEmptySearchResultsVisible && (
            <CellsStateInfo
              heading={translate('cells.noNodes.heading')}
              description={translate('cells.noNodes.description')}
            />
          )}
          {isEmptySearchResultsVisible && (
            <CellsStateInfo
              variant="search"
              heading={translate('cells.emptySearchResults.heading')}
              description={translate('cells.emptySearchResults.description')}
            />
          )}
          {isEmptyRecycleBin && <CellsStateInfo description={translate('cells.emptyRecycleBin.description')} />}
          {(isLoadingVisible || isRefreshing || isFetchingMoreVisible) && <CellsLoader />}
          {isError && (
            <CellsStateInfo
              heading={translate('cells.error.heading')}
              description={translate('cells.error.description')}
            />
          )}
          {isPaginationVisible && <CellsPagination {...getPaginationProps()} goToPage={goToPage} />}
          {isLoadMoreVisible && (
            <div css={loadMoreWrapperStyles}>
              <Button variant={ButtonVariant.TERTIARY} onClick={handleLoadMore}>
                {translate('cells.pagination.loadMoreResults')}
              </Button>
            </div>
          )}
          {isLoadMoreErrorVisible && (
            <div css={loadMoreErrorWrapperStyles} role="alert">
              <span css={loadMoreErrorMessageStyles}>{translate('cells.pagination.loadMoreError.heading')}</span>
              <Button variant={ButtonVariant.TERTIARY} onClick={handleLoadMore}>
                {translate('cells.pagination.loadMoreError.retry')}
              </Button>
            </div>
          )}
        </div>
      </CellsSelfUserDriveRoleProvider>
    );
  },
);

ConversationCells.displayName = 'ConversationCells';
