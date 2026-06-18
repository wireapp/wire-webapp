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

import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

import is from '@sindresorhus/is';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {useDebouncedCallback} from 'use-debounce';

import {FireAndForgetInvoker} from '@wireapp/core';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/userRepository';

import {createRequestVersionGate} from './requestVersionGate';

import {
  ConversationDriveFiltersState,
  hasActiveSearchParams,
  toConversationDriveSearchParams,
} from '../common/driveFilters/driveFilters';
import {getCellsApiPath} from '../common/getCellsApiPath/getCellsApiPath';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {LOAD_MORE_INCREMENT, LOAD_MORE_INITIAL_SIZE} from '../common/loadMorePagination/loadMorePagination';
import {RECYCLE_BIN_PATH} from '../common/recycleBin/recycleBin';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';
import {getUsersFromNodes} from '../useGetAllCellsNodes/getUsersFromNodes';
import {transformDataToCellsNodes, transformToCellPagination} from '../useGetAllCellsNodes/transformDataToCellsNodes';

interface UseConversationSearchFilesProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
  allowSearchWhenDisabled?: boolean;
  fireAndForgetInvoker: FireAndForgetInvoker;
  filters: ConversationDriveFiltersState;
  onClear?: () => void;
}

const DEBOUNCE_TIME = 300;

const normalizeSearchQuery = (query: string): string => (is.nonEmptyStringAndNotWhitespace(query) ? query.trim() : '');

export const useConversationSearchFiles = ({
  cellsRepository,
  userRepository,
  conversationQualifiedId,
  enabled,
  allowSearchWhenDisabled = false,
  fireAndForgetInvoker,
  filters,
  onClear,
}: UseConversationSearchFilesProps) => {
  const {setNodes, appendNodes, setStatus, setPagination, setError, clearAll} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const shouldPerformSearch = useRef(false);
  const hasFiredInitialFetchRef = useRef(false);
  const wasEnabledRef = useRef(false);
  const requestVersionGate = useRef(createRequestVersionGate());
  // Prevents stale in-flight responses from overwriting the store after the search view closes.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const allowSearchWhenDisabledRef = useRef(allowSearchWhenDisabled);
  allowSearchWhenDisabledRef.current = allowSearchWhenDisabled;

  const searchParams = useMemo(() => toConversationDriveSearchParams(filters), [filters]);
  const hasActiveParams = hasActiveSearchParams(searchParams);
  const hadActiveSearchParamsRef = useRef(hasActiveParams);

  const {id, domain} = conversationQualifiedId;

  const canSearchOwnResults = useCallback((): boolean => {
    return enabledRef.current === true || allowSearchWhenDisabledRef.current === true;
  }, []);

  const isCurrentSearchRequest = useCallback(
    (requestVersion: number): boolean => {
      return canSearchOwnResults() === true && requestVersionGate.current.isStale(requestVersion) === false;
    },
    [canSearchOwnResults],
  );

  const shouldRefreshSearchResultsAfterClearingInput = useCallback(
    ({
      preserveFilters,
      hasActiveParamsBeforeClear,
    }: {
      preserveFilters: boolean;
      hasActiveParamsBeforeClear: boolean;
    }): boolean => {
      if (preserveFilters === false) {
        return false;
      }

      if (enabledRef.current === true) {
        return true;
      }

      return allowSearchWhenDisabledRef.current === true && hasActiveParamsBeforeClear === true;
    },
    [],
  );

  const searchNodes = useCallback(
    async ({
      query,
      filters: filtersParam,
      offset = 0,
      append = false,
    }: {
      query: string;
      filters: ConversationDriveFiltersState;
      offset?: number;
      append?: boolean;
    }) => {
      const requestVersion = requestVersionGate.current.next();

      try {
        setError(null);
        setStatus(append ? 'fetchingMore' : 'loading');

        const searchParams = toConversationDriveSearchParams(filtersParam);

        // Recurse only when actually searching so the empty search view
        // matches the browse view: folders first, then files.
        const hasQuery = query.length > 0;
        const hasFilters = hasActiveSearchParams(searchParams);
        const isRecycleBin = getCellsFilesPath() === RECYCLE_BIN_PATH;
        const isSearchingOrFiltering = hasQuery || hasFilters;

        // recency sort for searches inside the recycle bin only
        const forceRecencySort = isRecycleBin && hasQuery;

        // search scopes to the folder the user is browsing
        const searchRootPath = getCellsApiPath({conversationQualifiedId: {id, domain}});

        const result = await cellsRepository.searchNodes({
          query,
          recursive: isSearchingOrFiltering,
          limit: append ? LOAD_MORE_INCREMENT : LOAD_MORE_INITIAL_SIZE,
          offset,
          path: searchRootPath,
          sortBy: forceRecencySort ? 'mtime' : undefined,
          sortDirection: forceRecencySort ? 'desc' : undefined,
          deleted: isRecycleBin,
          ...searchParams,
        });

        if (!isCurrentSearchRequest(requestVersion)) {
          return;
        }

        if (result.Nodes === undefined || result.Nodes.length === 0) {
          if (!append) {
            setNodes({conversationId: id, nodes: []});
          }
          setPagination({conversationId: id, pagination: null});
          setStatus('success');
          return;
        }

        const users = await getUsersFromNodes({nodes: result.Nodes, userRepository});

        if (!isCurrentSearchRequest(requestVersion)) {
          return;
        }

        // filter out draft nodes from results
        const filteredNodes = result.Nodes.filter(node => node.IsDraft !== true);
        const transformedNodes = transformDataToCellsNodes({nodes: filteredNodes, users});

        if (append) {
          appendNodes({conversationId: id, nodes: transformedNodes});
        } else {
          setNodes({conversationId: id, nodes: transformedNodes});
        }

        const pagination = result.Pagination !== undefined ? transformToCellPagination(result.Pagination) : null;
        setPagination({conversationId: id, pagination});
        setStatus('success');
      } catch (error) {
        if (!isCurrentSearchRequest(requestVersion)) {
          return;
        }

        const wrappedError = error instanceof Error ? error : new Error('Failed to load files', {cause: error});
        setError(wrappedError);

        if (append) {
          // Keep existing list and pagination visible; surface the failure inline via store error.
          setStatus('success');
          return;
        }

        setStatus('error');
        setNodes({conversationId: id, nodes: []});
        setPagination({conversationId: id, pagination: null});
      }
    },
    // cellsRepository and userRepository are not dependencies because they're singletons
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appendNodes, setNodes, setPagination, setStatus, setError, id, domain, isCurrentSearchRequest],
  );

  useLayoutEffect(() => {
    if (!enabled) {
      wasEnabledRef.current = false;
      return;
    }

    if (wasEnabledRef.current) {
      return;
    }

    wasEnabledRef.current = true;

    // Clear stale browse rows before paint when the search view takes ownership of the shared store.
    clearAll({conversationId: id});
    setStatus('loading');
  }, [clearAll, enabled, id, setStatus]);

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
    requestVersionGate.current.invalidate();
    if (!preserveInputValue) {
      setSearchValue('');
    }
    setSearchQuery('');
    shouldPerformSearch.current = false;

    const shouldRefreshSearchResults = shouldRefreshSearchResultsAfterClearingInput({
      preserveFilters,
      hasActiveParamsBeforeClear: hasActiveParams,
    });

    if (shouldRefreshSearchResults === true) {
      fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
        await searchNodes({query: '', filters});
      });
      return;
    }

    // Search and browse share the same store. Clear search-owned rows before browse
    // takes control again so stale search results cannot render with browse pagination.
    clearAll({conversationId: id});
    onClear?.();
  };

  const handleReload = useCallback(async (): Promise<void> => {
    setStatus('loading');
    clearAll({conversationId: id});
    await searchNodes({query: normalizeSearchQuery(searchQuery), filters});
  }, [clearAll, filters, id, searchNodes, searchQuery, setStatus]);

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
      await searchNodes({query: normalizeSearchQuery(searchQuery), filters});
    });
  }, [searchNodes, searchQuery, enabled, filters, hasActiveParams, fireAndForgetInvoker]);

  // Fire an initial unfiltered fetch when the hook becomes enabled (search view opens) so
  // the load-more dataset is populated even before the user types or selects a filter.
  // The ref resets on disable so the next enable cycle (re-opening the search view) refetches.
  useEffect(() => {
    if (!enabled) {
      hasFiredInitialFetchRef.current = false;
      return;
    }
    if (hasFiredInitialFetchRef.current) {
      return;
    }
    hasFiredInitialFetchRef.current = true;
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await searchNodes({query: normalizeSearchQuery(searchQuery), filters});
    });
  }, [enabled, searchNodes, searchQuery, filters, fireAndForgetInvoker]);

  // When the search params transition from "active" to "none" with no search query,
  // restore the default unfiltered file list.
  useEffect(() => {
    const hasNoSearchQuery = normalizeSearchQuery(searchValue).length === 0;

    if (hadActiveSearchParamsRef.current === true && hasActiveParams === false && hasNoSearchQuery === true) {
      if (canSearchOwnResults() === true) {
        fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
          await searchNodes({query: '', filters});
        });
      } else {
        onClear?.();
      }
    }
    hadActiveSearchParamsRef.current = hasActiveParams;
  }, [canSearchOwnResults, filters, fireAndForgetInvoker, hasActiveParams, onClear, searchNodes, searchValue]);

  const loadMore = useCallback(
    async (offset: number): Promise<void> => {
      await searchNodes({query: normalizeSearchQuery(searchQuery), filters, offset, append: true});
    },
    [filters, searchNodes, searchQuery],
  );

  return {
    searchValue,
    handleSearch,
    handleReload,
    handleClearSearch,
    loadMore,
  };
};
