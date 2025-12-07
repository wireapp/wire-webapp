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

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {UserRepository} from 'Repositories/user/UserRepository';
import {useDebouncedCallback} from 'use-debounce';

import {getConversationsFromNodes} from './getConversationsFromNodes';
import {getUsersFromNodes} from './getUsersFromNodes';

import {useCellsStore, Status} from '../common/useCellsStore/useCellsStore';
import {transformCellsNodes} from '../transformCellsNodes/transformCellsNodes';
import {transformCellsPagination} from '../transformCellsPagination/transformCellsPagination';

interface UseSearchCellsNodesProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  conversationRepository: ConversationRepository;
}

const PAGE_INITIAL_SIZE = 30;
const PAGE_SIZE_INCREMENT = 20;
const DEBOUNCE_TIME = 300;
const FETCH_ALL_QUERY = '*';

export const useSearchCellsNodes = ({
  cellsRepository,
  userRepository,
  conversationRepository,
}: UseSearchCellsNodesProps) => {
  const {setNodes, setStatus, setPagination, clearAll, filters} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_INITIAL_SIZE);
  const isInitialLoad = useRef(true);
  const shouldPerformFullReload = useRef(true);

  const searchNodes = useCallback(
    async ({query, status, limit = pageSize}: {query: string; status: Status; limit?: number}) => {
      try {
        setStatus(status);

        const shouldSort = !query || query === FETCH_ALL_QUERY;

        const result = await cellsRepository.searchNodes({
          query,
          limit,
          tags: filters.tags,
          sortBy: shouldSort ? 'mtime' : undefined,
          sortDirection: shouldSort ? 'desc' : undefined,
          type: 'file',
        });

        const users = await getUsersFromNodes({
          nodes: result.Nodes || [],
          userRepository,
        });

        const conversations = await getConversationsFromNodes({
          nodes: result.Nodes || [],
          conversationRepository,
        });

        // filter out draft nodes from results
        const filteredNodes = result.Nodes?.filter(node => !node.IsDraft);

        const transformedNodes = transformCellsNodes({
          nodes: filteredNodes || [],
          users,
          conversations,
        });

        setNodes(transformedNodes);
        if (result.Pagination) {
          setPagination(transformCellsPagination(result.Pagination));
        } else {
          setPagination(null);
        }

        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        }

        setStatus('success');
      } catch (error) {
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

  const searchNodesDebounced = useDebouncedCallback(async (value: string) => {
    shouldPerformFullReload.current = false;
    setSearchQuery(value);
    await searchNodes({query: value, status: 'loading'});
    shouldPerformFullReload.current = true;
  }, DEBOUNCE_TIME);

  const handleSearch = (value: string) => {
    if (!value) {
      void handleClearSearch();
      return;
    }
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue(value);
    void searchNodesDebounced(value);
  };

  const handleClearSearch = async () => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue('');
    setSearchQuery('');
    await searchNodes({query: FETCH_ALL_QUERY, status: 'loading'});
  };

  const handleReload = async () => {
    setStatus('loading');
    clearAll();
    await searchNodes({query: searchQuery || FETCH_ALL_QUERY, status: 'loading'});
  };

  const increasePageSize = useCallback(async () => {
    shouldPerformFullReload.current = false;
    setStatus('fetchingMore');
    setPageSize(pageSize + PAGE_SIZE_INCREMENT);
    await searchNodes({
      query: searchQuery || FETCH_ALL_QUERY,
      status: 'fetchingMore',
      limit: pageSize + PAGE_SIZE_INCREMENT,
    });
    shouldPerformFullReload.current = true;
  }, [pageSize, searchNodes, searchQuery, setStatus]);

  useEffect(() => {
    if (isInitialLoad.current || shouldPerformFullReload.current) {
      void searchNodes({query: searchQuery || FETCH_ALL_QUERY, status: 'loading'});
    }
  }, [searchNodes, searchQuery]);

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
