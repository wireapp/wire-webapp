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
import {useDebouncedCallback} from 'use-debounce';

import {FireAndForgetInvoker} from '@wireapp/core';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {UserRepository} from 'Repositories/user/UserRepository';

import {getConversationsFromNodes} from './getConversationsFromNodes';
import {getUsersFromNodes} from './getUsersFromNodes';

import {useCellsStore, Status} from '../common/useCellsStore/useCellsStore';
import {transformCellsNodes} from '../transformCellsNodes/transformCellsNodes';
import {transformCellsPagination} from '../transformCellsPagination/transformCellsPagination';

interface UseSearchCellsNodesProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  conversationRepository: ConversationRepository;
  fireAndForgetInvoker: FireAndForgetInvoker;
}

type SearchNodesProperties = {
  query: string;
  status: Status;
  limit?: number;
};

type UseSearchCellsNodesResult = {
  searchValue: string;
  pageSize: number;
  increasePageSize: () => Promise<void>;
  setPageSize: (pageSize: number) => void;
  handleSearch: (value: string) => void;
  handleReload: () => Promise<void>;
  handleClearSearch: () => Promise<void>;
};

const PAGE_INITIAL_SIZE = 30;
const PAGE_SIZE_INCREMENT = 20;
const DEBOUNCE_TIME = 300;
const FETCH_ALL_QUERY = '*';

export const useSearchCellsNodes = (properties: UseSearchCellsNodesProps): UseSearchCellsNodesResult => {
  const {cellsRepository, userRepository, conversationRepository, fireAndForgetInvoker} = properties;
  const {setNodes, setStatus, setPagination, clearAll, filters} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_INITIAL_SIZE);
  const isInitialLoad = useRef(true);
  const shouldPerformFullReload = useRef(true);

  const searchNodes = useCallback(
    async (properties: SearchNodesProperties): Promise<void> => {
      const {query, status, limit = pageSize} = properties;
      try {
        setStatus(status);

        const shouldSort = query.length === 0 || query === FETCH_ALL_QUERY;

        const result = await cellsRepository.searchNodes({
          query,
          limit,
          tags: filters.tags,
          path: filters.path,
          sortBy: shouldSort ? 'mtime' : undefined,
          sortDirection: shouldSort ? 'desc' : undefined,
          type: 'file',
        });

        const users = await getUsersFromNodes({
          nodes: result.Nodes ?? [],
          userRepository,
        });

        const conversations = await getConversationsFromNodes({
          nodes: result.Nodes ?? [],
          conversationRepository,
        });

        // filter out draft nodes from results
        const filteredNodes = result.Nodes?.filter(node => node.IsDraft !== true) ?? [];

        const transformedNodes = transformCellsNodes({
          nodes: filteredNodes,
          users,
          conversations,
        });

        setNodes(transformedNodes);
        if (result.Pagination !== undefined) {
          setPagination(transformCellsPagination(result.Pagination));
        } else {
          setPagination(null);
        }

        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        }

        setStatus('success');
      } catch {
        // If the user isn't part of any cells-enabled conversations, the user will not exist in Cells database
        // the search will return a 401 error
        const hasCellsConversations = conversationRepository.getAllCellEnabledGroupConversations().length > 0;
        if (!hasCellsConversations) {
          setStatus('success');
        } else {
          setStatus('error');
        }
        setNodes([]);
        setPagination(null);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageSize, setNodes, setPagination, setStatus, filters],
  );

  const searchNodesDebounced = useDebouncedCallback(async (value: string): Promise<void> => {
    shouldPerformFullReload.current = false;
    setSearchQuery(value);
    await searchNodes({query: value, status: 'loading'});
    shouldPerformFullReload.current = true;
  }, DEBOUNCE_TIME);

  const handleSearch = (value: string): void => {
    if (!is.nonEmptyString(value)) {
      fireAndForgetInvoker.fireAndForget(handleClearSearch);
      return;
    }
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue(value);
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await searchNodesDebounced(value);
    });
  };

  const handleClearSearch = async (): Promise<void> => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue('');
    setSearchQuery('');
    await searchNodes({query: FETCH_ALL_QUERY, status: 'loading'});
  };

  const handleReload = async (): Promise<void> => {
    setStatus('loading');
    clearAll();
    await searchNodes({query: searchQuery.length > 0 ? searchQuery : FETCH_ALL_QUERY, status: 'loading'});
  };

  const increasePageSize = useCallback(async (): Promise<void> => {
    shouldPerformFullReload.current = false;
    setStatus('fetchingMore');
    setPageSize(pageSize + PAGE_SIZE_INCREMENT);
    await searchNodes({
      query: searchQuery.length > 0 ? searchQuery : FETCH_ALL_QUERY,
      status: 'fetchingMore',
      limit: pageSize + PAGE_SIZE_INCREMENT,
    });
    shouldPerformFullReload.current = true;
  }, [pageSize, searchNodes, searchQuery, setStatus]);

  useEffect(() => {
    if (isInitialLoad.current || shouldPerformFullReload.current) {
      fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
        await searchNodes({query: searchQuery.length > 0 ? searchQuery : FETCH_ALL_QUERY, status: 'loading'});
      });
    }
  }, [fireAndForgetInvoker, searchNodes, searchQuery]);

  return {
    searchValue,
    pageSize,
    increasePageSize,
    setPageSize,
    handleSearch,
    handleReload,
    handleClearSearch,
  };
};
