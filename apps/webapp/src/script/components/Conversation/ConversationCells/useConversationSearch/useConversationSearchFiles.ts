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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import is from '@sindresorhus/is';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {useDebouncedCallback} from 'use-debounce';

import {FireAndForgetInvoker} from '@wireapp/core';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/userRepository';

import {
  ConversationDriveFiltersState,
  hasActiveSearchParams,
  toConversationDriveSearchParams,
} from '../common/driveFilters/driveFilters';
import {getCellsApiPath} from '../common/getCellsApiPath/getCellsApiPath';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';
import {getUsersFromNodes} from '../useGetAllCellsNodes/getUsersFromNodes';
import {transformDataToCellsNodes, transformToCellPagination} from '../useGetAllCellsNodes/transformDataToCellsNodes';

interface UseConversationSearchFilesProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
  fireAndForgetInvoker: FireAndForgetInvoker;
  filters: ConversationDriveFiltersState;
  onClear?: () => void;
}

const DEBOUNCE_TIME = 300;
const FETCH_ALL_QUERY = '*';

export const useConversationSearchFiles = ({
  cellsRepository,
  userRepository,
  conversationQualifiedId,
  enabled,
  fireAndForgetInvoker,
  filters,
  onClear,
}: UseConversationSearchFilesProps) => {
  const {setNodes, setStatus, setPagination, clearAll} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const isInitialLoad = useRef(true);
  const shouldPerformSearch = useRef(false);

  const searchParams = useMemo(() => toConversationDriveSearchParams(filters), [filters]);
  const hasActiveParams = hasActiveSearchParams(searchParams);
  const hadActiveSearchParamsRef = useRef(hasActiveParams);

  const {id} = conversationQualifiedId;
  const conversationPath = getCellsApiPath({conversationQualifiedId});

  const searchNodes = useCallback(
    async ({query, filters: filtersParam}: {query: string; filters: ConversationDriveFiltersState}) => {
      try {
        setStatus('loading');

        const shouldSort = query.length === 0 || query === FETCH_ALL_QUERY;
        const searchParams = toConversationDriveSearchParams(filtersParam);

        const result = await cellsRepository.searchNodes({
          query,
          path: conversationPath,
          sortBy: shouldSort ? 'mtime' : undefined,
          sortDirection: shouldSort ? 'desc' : undefined,
          type: 'file',
          ...searchParams,
        });

        if (result.Nodes === undefined || result.Nodes.length === 0) {
          setNodes({conversationId: id, nodes: []});
          setPagination({conversationId: id, pagination: null});
          setStatus('success');
          return;
        }

        const users = await getUsersFromNodes({nodes: result.Nodes, userRepository});

        // filter out draft nodes from results
        const filteredNodes = result.Nodes.filter(node => node.IsDraft !== true);

        const transformedNodes = transformDataToCellsNodes({
          nodes: filteredNodes,
          users,
        });

        setNodes({conversationId: id, nodes: transformedNodes});

        const pagination = result.Pagination !== undefined ? transformToCellPagination(result.Pagination) : null;
        setPagination({conversationId: id, pagination});

        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        }

        setStatus('success');
      } catch {
        setStatus('error');
        setNodes({conversationId: id, nodes: []});
        setPagination({conversationId: id, pagination: null});
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setNodes, setPagination, setStatus, id, conversationPath],
  );

  const searchNodesDebounced = useDebouncedCallback(async (value: string) => {
    shouldPerformSearch.current = false;
    setSearchQuery(value);
    await searchNodes({query: value, filters});
    shouldPerformSearch.current = true;
  }, DEBOUNCE_TIME);

  const handleSearch = (value: string): void => {
    setSearchValue(value);
    const isEmpty = value.length === 0;
    if (!is.nonEmptyStringAndNotWhitespace(value)) {
      if (isEmpty) {
        handleClearSearch();
      } else if (searchQuery.length > 0) {
        handleClearSearch({preserveInputValue: true});
      } else {
        searchNodesDebounced.cancel();
        shouldPerformSearch.current = false;
      }
      return;
    }
    shouldPerformSearch.current = true;
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await searchNodesDebounced(value);
    });
  };

  const handleClearSearch = ({
    preserveFilters = true,
    preserveInputValue = false,
  }: {preserveFilters?: boolean; preserveInputValue?: boolean} = {}) => {
    searchNodesDebounced.cancel();
    if (!preserveInputValue) {
      setSearchValue('');
    }
    setSearchQuery('');
    shouldPerformSearch.current = false;

    if (preserveFilters && hasActiveParams) {
      void searchNodes({query: FETCH_ALL_QUERY, filters});
      return;
    }

    onClear?.();
  };

  const handleReload = async (): Promise<void> => {
    setStatus('loading');
    clearAll({conversationId: id});
    await searchNodes({query: searchQuery.trim().length > 0 ? searchQuery : FETCH_ALL_QUERY, filters});
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Re-run search whenever typing has triggered it, a query is present,
    // or the mapped search params carry any filter.
    const hasSearchOrActiveParams = searchQuery.trim().length > 0 || hasActiveParams;
    if (!shouldPerformSearch.current && !hasSearchOrActiveParams) {
      return;
    }

    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await searchNodes({query: searchQuery.trim().length > 0 ? searchQuery : FETCH_ALL_QUERY, filters});
    });
  }, [searchNodes, searchQuery, enabled, filters, hasActiveParams, fireAndForgetInvoker]);

  // When the search params transition from "active" to "none" with no search query,
  // restore the default unfiltered file list.
  useEffect(() => {
    if (hadActiveSearchParamsRef.current && !hasActiveParams && !searchValue) {
      onClear?.();
    }
    hadActiveSearchParamsRef.current = hasActiveParams;
  }, [hasActiveParams, searchValue, onClear]);

  return {
    searchValue,
    handleSearch,
    handleReload,
    handleClearSearch,
  };
};
