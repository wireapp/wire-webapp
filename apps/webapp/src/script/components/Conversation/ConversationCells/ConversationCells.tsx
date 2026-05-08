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

import {memo, useEffect, useRef} from 'react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {UserRepository} from 'Repositories/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {t} from 'Util/localizerUtil';

import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsPagination} from './CellsPagination/CellsPagination';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {isInRecycleBin} from './common/recycleBin/recycleBin';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {useConversationDriveFilters} from './common/useConversationDriveFilters/useConversationDriveFilters';
import {
  searchIdleDescriptionStyles,
  searchIdleHeadingStyles,
  searchIdleStateStyles,
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
  isSearchViewOpen: boolean;
  onOpenSearchView: () => void;
}

export const ConversationCells = memo(
  ({
    cellsRepository,
    userRepository,
    activeConversation,
    conversationRepository,
    isSearchViewOpen,
    onOpenSearchView,
  }: ConversationCellsProps) => {
    const {cellsState: initialCellState, name} = useKoSubscribableChildren(activeConversation, ['cellsState', 'name']);

    const {getNodes, status: nodesStatus, getPagination} = useCellsStore();

    const conversationId = activeConversation.id;
    const conversationQualifiedId = activeConversation.qualifiedId;

    const {cellsState, isRefreshing} = useRefreshCellsState({
      initialCellState,
      conversationRepository,
      conversationQualifiedId,
    });

    const isCellsStateReady = cellsState === CONVERSATION_CELLS_STATE.READY;
    const isCellsStatePending = cellsState === CONVERSATION_CELLS_STATE.PENDING;

    const {refresh, setOffset} = useGetAllCellsNodes({
      cellsRepository,
      conversationQualifiedId,
      enabled: isCellsStateReady,
      userRepository,
    });

    const {
      searchValue,
      handleSearch,
      handleClearSearch: clearSearch,
    } = useConversationSearchFiles({
      cellsRepository,
      conversationQualifiedId,
      enabled: isCellsStateReady,
      userRepository,
      onClear: refresh,
    });

    const trimmedSearchValue = searchValue.trim();
    const isSearchActive = !!trimmedSearchValue;
    const isSearchViewIdle = isSearchViewOpen && !trimmedSearchValue;
    const wasSearchViewOpen = useRef(isSearchViewOpen);

    const handleClearSearch = () => {
      clearSearch();
      void refresh();
    };

    useEffect(() => {
      if (wasSearchViewOpen.current && !isSearchViewOpen && searchValue) {
        handleClearSearch();
      }
      wasSearchViewOpen.current = isSearchViewOpen;
    }, [isSearchViewOpen, searchValue]);

    // When search is active, refresh should trigger search reload
    const handleRefresh = isSearchActive ? () => handleSearch(searchValue) : refresh;

    const {filters} = useConversationDriveFilters();

    const nodes = getNodes({conversationId});
    const pagination = getPagination({conversationId});

    const {goToPage, getPaginationProps} = useCellsPagination({
      pagination,
      conversationId,
      setOffset,
      currentNodesCount: nodes.length,
    });

    useOnPresignedUrlExpired({conversationId, refreshCallback: refresh});

    const isLoading = nodesStatus === 'loading';
    const isError = nodesStatus === 'error';
    const isSuccess = nodesStatus === 'success';

    const hasNodes = !!nodes.length;
    const emptyView = !isError && !hasNodes && isCellsStateReady;

    const isTableVisible = (isSuccess || isLoading) && isCellsStateReady && !isSearchViewIdle;
    const isLoadingVisible = isLoading && isCellsStateReady && !isSearchViewIdle;
    const isNoNodesVisible = !isLoading && emptyView && !isInRecycleBin() && !isSearchViewIdle;
    const isPaginationVisible = !emptyView && !isSearchViewIdle;
    const isEmptyRecycleBin = isInRecycleBin() && emptyView && !isLoading && !isSearchViewIdle;

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
          />
        )}
        {isSearchViewIdle && (
          <div css={searchIdleStateStyles}>
            <p css={searchIdleHeadingStyles}>{t('cells.search.idle.heading')}</p>
            <p css={searchIdleDescriptionStyles}>{t('cells.search.idle.description')}</p>
          </div>
        )}
        {isCellsStatePending && !isRefreshing && (
          <CellsStateInfo heading={t('cells.pending.heading')} description={t('cells.pending.description')} />
        )}
        {isNoNodesVisible && (
          <CellsStateInfo heading={t('cells.noNodes.heading')} description={t('cells.noNodes.description')} />
        )}
        {isEmptyRecycleBin && <CellsStateInfo description={t('cells.emptyRecycleBin.description')} />}
        {(isLoadingVisible || (isRefreshing && !isSearchViewIdle)) && <CellsLoader />}
        {isError && <CellsStateInfo heading={t('cells.error.heading')} description={t('cells.error.description')} />}
        {isPaginationVisible && <CellsPagination {...getPaginationProps()} goToPage={goToPage} />}
      </div>
    );
  },
);

ConversationCells.displayName = 'ConversationCells';
