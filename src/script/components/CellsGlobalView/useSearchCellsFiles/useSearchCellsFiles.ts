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
import {transformCellsFiles} from '../transformCellsFiles/transformCellsFiles';
import {transformCellsPagination} from '../transformCellsPagination/transformCellsPagination';

interface UseSearchCellsFilesProps {
  cellsRepository: CellsRepository;
}

const PAGE_INITIAL_SIZE = 30;
const PAGE_SIZE_INCREMENT = 20;
const DEBOUNCE_TIME = 300;

export const useSearchCellsFiles = ({cellsRepository}: UseSearchCellsFilesProps) => {
  const {setFiles, setStatus, setPagination, clearAll} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [pageSize, setPageSize] = useState<number>(PAGE_INITIAL_SIZE);

  const searchFiles = useCallback(
    async ({query, status, limit = pageSize}: {query: string; status: Status; limit?: number}) => {
      try {
        setStatus(status);
        const result = await cellsRepository.searchFiles({query, limit});
        setFiles(transformCellsFiles(result.Nodes || []));
        if (result.Pagination) {
          setPagination(transformCellsPagination(result.Pagination));
        } else {
          setPagination(null);
        }
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setFiles([]);
        setPagination(null);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageSize, setFiles, setPagination, setStatus],
  );

  const searchFilesDebounced = useDebouncedCallback(searchFiles, DEBOUNCE_TIME);

  const handleSearch = (value: string) => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue(value);
    void searchFilesDebounced({query: value, status: 'loading'});
  };

  const handleClearSearch = () => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue('');
  };

  const handleReload = async () => {
    setStatus('loading');
    clearAll();
    await searchFiles({query: searchValue || '*', status: 'loading'});
  };

  const increasePageSize = useCallback(async () => {
    setStatus('fetchingMore');
    setPageSize(pageSize + PAGE_SIZE_INCREMENT);
    await searchFiles({query: searchValue || '*', status: 'fetchingMore', limit: pageSize + PAGE_SIZE_INCREMENT});
  }, [pageSize, searchFiles, searchValue, setStatus]);

  useEffect(() => {
    setStatus('loading');
    void searchFiles({query: '*', status: 'loading'});
  }, [searchFiles, setStatus]);

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
