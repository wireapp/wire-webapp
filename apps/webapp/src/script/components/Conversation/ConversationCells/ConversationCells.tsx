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

import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsPagination} from './CellsPagination/CellsPagination';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {getLoadMoreOffset} from './common/loadMorePagination/loadMorePagination';
import {isInRecycleBin} from './common/recycleBin/recycleBin';
import {useCellsSorting} from './common/useCellsSorting/useCellsSorting';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {useConversationDriveFilters} from './common/useConversationDriveFilters/useConversationDriveFilters';
import {
  loadMoreErrorMessageStyles,
  loadMoreErrorWrapperStyles,
  loadMoreWrapperStyles,
  wrapperStyles,
} from './ConversationCells.styles';
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
  isSharedDriveSearchAndFiltersEnabled: boolean;
  isSearchViewOpen: boolean;
  onOpenSearchView: () => void;
  onCloseSearchView: () => void;
}

export const ConversationCells = memo(
  ({
    cellsRepository,
    userRepository,
    activeConversation,
    conversationRepository,
    isSharedDriveSearchAndFiltersEnabled,
    isSearchViewOpen,
    onOpenSearchView,
    onCloseSearchView,
  }: ConversationCellsProps) => {
    const {fireAndForgetInvoker, translate} = useApplicationContext();
    const {cellsState: initialCellState, name} = useKoSubscribableChildren(activeConversation, ['cellsState', 'name']);

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

    const {sort, getDirectionFor, toggleSort, resetSort} = useCellsSorting();

    const {refresh, setOffset} = useGetAllCellsNodes({
      cellsRepository,
      conversationQualifiedId,
      //Without this, the browse hook's hashchange handler would compete with
      // (and flap against) search results.
      enabled: isCellsStateReady && !isSearchViewOpen,
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
      enabled: isCellsStateReady && isSearchViewOpen,
      allowSearchWhenDisabled: !isSharedDriveSearchAndFiltersEnabled,
      fireAndForgetInvoker,
      userRepository,
      filters: filterState,
      onClear: refresh,
      sort,
    });

    // Search view open ⇒ load-more UI + search-hook data; closed ⇒ page-nav UI + browse-hook data.
    // The mode is owned by the view, not by whether the user has typed/filtered yet.
    const isInSearchMode = isSearchViewOpen;
    const wasSearchViewOpen = useRef(isSearchViewOpen);

    const handleClearSearch = useCallback((): void => {
      clearSearch();
    }, [clearSearch]);

    useEffect(() => {
      if (wasSearchViewOpen.current && !isSearchViewOpen) {
        // Search view just closed — reset any active search/filter and restore the
        // browse-mode dataset (handled by clearSearch's onClear callback → refresh).
        clearAll({conversationId});
        clearAllFilters();
        clearSearch({preserveFilters: false});
      }
      wasSearchViewOpen.current = isSearchViewOpen;
    }, [clearAll, clearAllFilters, clearSearch, conversationId, isSearchViewOpen]);

    // Sort is per-view: switching conversation or toggling between search and browse
    // returns to the default (unsorted) order.
    useEffect(() => {
      resetSort();
    }, [conversationId, isSearchViewOpen, resetSort]);

    // Navigating into a folder or the recycle bin happens via the URL hash without
    // remounting; reset the sort on those transitions too.
    useEffect(() => {
      const handleHashChange = (): void => resetSort();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, [resetSort]);

    const handleRefresh = useCallback((): void => {
      if (isInSearchMode) {
        fireAndForgetInvoker.fireAndForget(handleReload);
        return;
      }

      fireAndForgetInvoker.fireAndForget(refresh);
    }, [fireAndForgetInvoker, handleReload, isInSearchMode, refresh]);

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

    const handleSearchViewClosure = isSearchViewOpen ? onCloseSearchView : undefined;

    useOnPresignedUrlExpired({conversationId, refreshCallback: handleRefresh});

    const isLoading = nodesStatus === 'loading';
    const isFetchingMore = nodesStatus === 'fetchingMore';
    const isError = nodesStatus === 'error';
    const isSuccess = nodesStatus === 'success';

    const hasNodes = !!nodes.length;
    const emptyView = !isError && !hasNodes && isCellsStateReady;

    const isTableVisible = (isSuccess || isLoading || isFetchingMore) && isCellsStateReady;
    const isLoadingVisible = isLoading && isCellsStateReady;
    const isFetchingMoreVisible = isFetchingMore && isCellsStateReady && hasNodes;
    const isNoNodesVisible = !isLoading && !isFetchingMore && emptyView && !isInRecycleBin();
    const isEmptyRecycleBin = isInRecycleBin() && emptyView && !isLoading && !isFetchingMore;
    const hasMorePages = loadMoreOffset.isJust;
    const hasAppendError = isSuccess && hasNodes && storeError !== null;

    const isPaginationVisible = !isInSearchMode && !emptyView;
    const isLoadMoreVisible =
      isInSearchMode && !isLoading && !isFetchingMore && !emptyView && isSuccess && hasMorePages && !hasAppendError;
    const isLoadMoreErrorVisible = isInSearchMode && hasAppendError && hasMorePages;

    return (
      <div css={wrapperStyles}>
        <CellsHeader
          onRefresh={handleRefresh}
          conversationName={name}
          conversationQualifiedId={conversationQualifiedId}
          cellsRepository={cellsRepository}
          isSearchViewOpen={isSearchViewOpen}
          onOpenSearchView={onOpenSearchView}
          searchValue={searchValue}
          onSearchChange={handleSearch}
          onSearchClear={handleClearSearch}
          filters={filters}
        />
        {isTableVisible && (
          <CellsTable
            nodes={isLoading ? [] : nodes}
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            conversationName={name}
            onRefresh={handleRefresh}
            // opening a folder must close search view and open the browse view
            // with that folder (and breadcrumbs)
            onCloseSearchView={handleSearchViewClosure}
            getDirectionFor={getDirectionFor}
            isSortingEnabled={isSharedDriveSearchAndFiltersEnabled}
            onToggleSort={toggleSort}
          />
        )}
        {isCellsStatePending && !isRefreshing && (
          <CellsStateInfo
            heading={translate('cells.pending.heading')}
            description={translate('cells.pending.description')}
          />
        )}
        {isNoNodesVisible && (
          <CellsStateInfo
            heading={translate('cells.noNodes.heading')}
            description={translate('cells.noNodes.description')}
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
    );
  },
);

ConversationCells.displayName = 'ConversationCells';
