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

import {useCallback, useEffect, useRef, useState} from 'react';

import is from '@sindresorhus/is';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {useDebouncedCallback} from 'use-debounce';

import {FireAndForgetInvoker} from '@wireapp/core';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserRepository} from 'Repositories/user/userRepository';

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
  tags: string[];
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
  tags,
  onClear,
}: UseConversationSearchFilesProps) => {
  const {setNodes, setStatus, setPagination, clearAll} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const isInitialLoad = useRef(true);
  const shouldPerformSearch = useRef(false);
  const trimmedSearchQuery = searchQuery.trim();
  const wasTagFilterActiveRef = useRef(tags.length > 0);

  const {id} = conversationQualifiedId;
  const conversationPath = getCellsApiPath({conversationQualifiedId});

  const searchNodes = useCallback(
    async ({query, tags: tagsParam}: {query: string; tags: string[]}) => {
      try {
        setStatus('loading');

        const shouldSort = query.length === 0 || query === FETCH_ALL_QUERY;

        const result = await cellsRepository.searchNodes({
          query,
          path: conversationPath,
          sortBy: shouldSort ? 'mtime' : undefined,
          sortDirection: shouldSort ? 'desc' : undefined,
          type: 'file',
          tags: tagsParam.length > 0 ? tagsParam : undefined,
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
    await searchNodes({query: value, tags});
    shouldPerformSearch.current = true;
  }, DEBOUNCE_TIME);

  const handleSearch = (value: string): void => {
    setSearchValue(value);
    if (!is.nonEmptyString(value)) {
      searchNodesDebounced.cancel();
      handleClearSearch();
      return;
    }
    shouldPerformSearch.current = true;
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await searchNodesDebounced(value);
    });
  };

  const handleClearSearch = ({preserveFilters = true}: {preserveFilters?: boolean} = {}) => {
    searchNodesDebounced.cancel();
    setSearchValue('');
    setSearchQuery('');
    shouldPerformSearch.current = false;

    if (preserveFilters && tags.length > 0) {
      void searchNodes({query: FETCH_ALL_QUERY, tags});
      return;
    }

    onClear?.();
  };

  const handleReload = async (): Promise<void> => {
    setStatus('loading');
    clearAll({conversationId: id});
    await searchNodes({query: trimmedSearchQuery.length > 0 ? searchQuery : FETCH_ALL_QUERY, tags});
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Re-run search whenever typing has triggered it, a query is present, or tags are active.
    const hasActiveFilters = trimmedSearchQuery.length > 0 || tags.length > 0;
    if (!shouldPerformSearch.current && !hasActiveFilters) {
      return;
    }

    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await searchNodes({query: trimmedSearchQuery.length > 0 ? searchQuery : FETCH_ALL_QUERY, tags});
    });
  }, [enabled, fireAndForgetInvoker, searchNodes, searchQuery, tags, trimmedSearchQuery]);

  // When the last tag filter is removed with no search query active,
  // restore the default unfiltered file list.
  useEffect(() => {
    const isTagFilterActive = tags.length > 0;
    if (wasTagFilterActiveRef.current && !isTagFilterActive && !searchValue) {
      onClear?.();
    }
    wasTagFilterActiveRef.current = isTagFilterActive;
  }, [tags, searchValue, onClear]);

  return {
    searchValue,
    handleSearch,
    handleReload,
    handleClearSearch,
  };
};
