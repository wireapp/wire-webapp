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
import {transformNodesToCellsFiles, transformToCellPagination} from '../useGetAllCellsFiles/transformNodesToCellsFiles';

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

  const searchNow = useCallback(
    async (query: string, status: Status, limit = pageSize) => {
      try {
        setStatus(status);
        const result = await cellsRepository.searchFiles({query, limit});
        setFiles(transformNodesToCellsFiles(result.Nodes || []));
        if (result.Pagination) {
          setPagination(transformToCellPagination(result.Pagination));
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
    [pageSize],
  );

  const searchFiles = useDebouncedCallback(searchNow, DEBOUNCE_TIME);

  useEffect(() => {
    const value = searchValue || '*';
    searchFiles(value, 'loading');
  }, [searchValue]);

  const handleSearch = (value: string) => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue(value);
  };

  const handleClearSearch = () => {
    setPageSize(PAGE_INITIAL_SIZE);
    setSearchValue('');
  };

  const handleReload = async () => {
    setStatus('loading');
    clearAll();
    await searchNow(searchValue || '*', 'loading');
  };

  const increasePageSize = useCallback(async () => {
    setStatus('load-more');
    setPageSize(pageSize + PAGE_SIZE_INCREMENT);
    await searchNow(searchValue || '*', 'load-more', pageSize + PAGE_SIZE_INCREMENT);
  }, [pageSize, searchValue]);

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
