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

import {useCallback, useEffect, useState} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import {CellsRepository} from 'src/script/cells/CellsRepository';

import {useCellsStore, Status} from '../common/useCellsStore/useCellsStore';
import {transformCellsNodes} from '../transformCellsNodes/transformCellsNodes';
import {transformCellsPagination} from '../transformCellsPagination/transformCellsPagination';

interface UseSearchCellsNodesProps {
  cellsRepository: CellsRepository;
}

const PAGE_INITIAL_SIZE = 30;
const PAGE_SIZE_INCREMENT = 20;
const DEBOUNCE_TIME = 300;

export const useSearchCellsNodes = ({cellsRepository}: UseSearchCellsNodesProps) => {
  const {setNodes, setStatus, setPagination, clearAll} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [pageSize, setPageSize] = useState<number>(PAGE_INITIAL_SIZE);

  const searchNodes = useCallback(
    async ({query, status, limit = pageSize}: {query: string; status: Status; limit?: number}) => {
      try {
        setStatus(status);
        const result = await cellsRepository.searchNodes({query, limit, tags: ['kkk']});
        setNodes(transformCellsNodes(result.Nodes || []));
        if (result.Pagination) {
          setPagination(transformCellsPagination(result.Pagination));
        } else {
          setPagination(null);
        }
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setNodes([]);
        setPagination(null);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageSize, setNodes, setPagination, setStatus],
  );

  const searchNodesDebounced = useDebouncedCallback(searchNodes, DEBOUNCE_TIME);

  const handleSearch = (value: string) => {
    if (!value) {
      void handleClearSearch();
      return;
    }
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue(value);
    void searchNodesDebounced({query: value, status: 'loading'});
  };

  const handleClearSearch = async () => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue('');
    await searchNodes({query: '*', status: 'loading'});
  };

  const handleReload = async () => {
    setStatus('loading');
    clearAll();
    await searchNodes({query: searchValue || '*', status: 'loading'});
  };

  const increasePageSize = useCallback(async () => {
    setStatus('fetchingMore');
    setPageSize(pageSize + PAGE_SIZE_INCREMENT);
    await searchNodes({query: searchValue || '*', status: 'fetchingMore', limit: pageSize + PAGE_SIZE_INCREMENT});
  }, [pageSize, searchNodes, searchValue, setStatus]);

  useEffect(() => {
    void searchNodes({query: '*', status: 'loading'});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
