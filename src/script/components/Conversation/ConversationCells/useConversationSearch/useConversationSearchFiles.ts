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

import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {useDebouncedCallback} from 'use-debounce';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {UserRepository} from 'Repositories/user/UserRepository';

import {getCellsApiPath} from '../common/getCellsApiPath/getCellsApiPath';
import {useCellsStore} from '../common/useCellsStore/useCellsStore';
import {getUsersFromNodes} from '../useGetAllCellsNodes/getUsersFromNodes';
import {transformDataToCellsNodes, transformToCellPagination} from '../useGetAllCellsNodes/transformDataToCellsNodes';

interface UseConversationSearchFilesProps {
  cellsRepository: CellsRepository;
  userRepository: UserRepository;
  conversationQualifiedId: QualifiedId;
  enabled: boolean;
  onClear?: () => void;
}

const DEBOUNCE_TIME = 300;
const FETCH_ALL_QUERY = '*';

export const useConversationSearchFiles = ({
  cellsRepository,
  userRepository,
  conversationQualifiedId,
  enabled,
  onClear,
}: UseConversationSearchFilesProps) => {
  const {setNodes, setStatus, setPagination, clearAll} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const isInitialLoad = useRef(true);
  const shouldPerformSearch = useRef(false);

  const {id} = conversationQualifiedId;
  const conversationPath = getCellsApiPath({conversationQualifiedId});

  const searchNodes = useCallback(
    async ({query}: {query: string}) => {
      try {
        setStatus('loading');

        const shouldSort = !query || query === FETCH_ALL_QUERY;

        const result = await cellsRepository.searchNodes({
          query,
          path: conversationPath,
          sortBy: shouldSort ? 'mtime' : undefined,
          sortDirection: shouldSort ? 'desc' : undefined,
          type: 'file',
        });

        if (!result.Nodes?.length) {
          setNodes({conversationId: id, nodes: []});
          setPagination({conversationId: id, pagination: null});
          setStatus('success');
          return;
        }

        const users = await getUsersFromNodes({nodes: result.Nodes, userRepository});

        // filter out draft nodes from results
        const filteredNodes = result.Nodes.filter(node => !node.IsDraft);

        const transformedNodes = transformDataToCellsNodes({
          nodes: filteredNodes,
          users,
        });

        setNodes({conversationId: id, nodes: transformedNodes});

        const pagination = result.Pagination ? transformToCellPagination(result.Pagination) : null;
        setPagination({conversationId: id, pagination});

        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        }

        setStatus('success');
      } catch (error) {
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
    await searchNodes({query: value});
    shouldPerformSearch.current = true;
  }, DEBOUNCE_TIME);

  const handleSearch = (value: string) => {
    if (!value) {
      handleClearSearch();
      onClear?.();
      return;
    }
    shouldPerformSearch.current = true;
    setSearchValue(value);
    void searchNodesDebounced(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setSearchQuery('');
    shouldPerformSearch.current = false;
  };

  const handleReload = async () => {
    setStatus('loading');
    clearAll({conversationId: id});
    await searchNodes({query: searchQuery || FETCH_ALL_QUERY});
  };

  useEffect(() => {
    if (!enabled || !shouldPerformSearch.current) {
      return;
    }

    void searchNodes({query: searchQuery || FETCH_ALL_QUERY});
  }, [searchNodes, searchQuery, enabled]);

  return {
    searchValue,
    handleSearch,
    handleReload,
    handleClearSearch,
  };
};
