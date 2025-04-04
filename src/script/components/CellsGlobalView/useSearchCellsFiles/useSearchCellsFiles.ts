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

import {useState} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import {transformNodesToCellsFiles} from 'Components/CellsGlobalView/useGetAllCellsFiles/transformNodesToCellsFiles';
import {CellsRepository} from 'src/script/cells/CellsRepository';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface UseSearchCellsFilesProps {
  cellsRepository: CellsRepository;
}

const PAGE_SIZE = 100;
const DEBOUNCE_TIME = 300;

export const useSearchCellsFiles = ({cellsRepository}: UseSearchCellsFilesProps) => {
  const {setFiles, setStatus, setPagination} = useCellsStore();

  const [searchValue, setSearchValue] = useState('');
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const searchFiles = useDebouncedCallback(async (query: string) => {
    try {
      setStatus('loading');
      const result = await cellsRepository.searchFiles({query, limit: pageSize});
      setFiles(transformNodesToCellsFiles(result.Nodes || []));
      setPagination(result.Pagination || null);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setFiles([]);
      setPagination(null);
    }
  }, DEBOUNCE_TIME);

  const handleSearch = async (value: string) => {
    setSearchValue(value);
    if (!value) {
      await searchFiles('*');
      return;
    }
    await searchFiles(value);
  };

  const handleClearSearch = async () => {
    setSearchValue('');
    await searchFiles('*');
  };

  return {
    searchValue,
    setPageSize,
    handleSearch,
    handleClearSearch,
  };
};
