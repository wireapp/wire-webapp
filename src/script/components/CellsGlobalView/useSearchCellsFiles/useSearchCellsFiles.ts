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

import {CellsRepository} from 'src/script/cells/CellsRepository';

interface UseSearchCellsFilesProps {
  cellsRepository: CellsRepository;
}

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

const DEBOUNCE_TIME = 300;

export const useSearchCellsFiles = ({cellsRepository}: UseSearchCellsFilesProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');

  const searchFiles = useDebouncedCallback(async (query: string) => {
    try {
      setStatus('loading');
      const result = await cellsRepository.searchFiles({query});
      const searchedFileIds = result.Nodes?.map(node => node.Uuid) || [];
      setSearchResults(searchedFileIds);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setSearchResults([]);
    }
  }, DEBOUNCE_TIME);

  const handleSearch = async (value: string) => {
    setSearchValue(value);
    if (!value) {
      setStatus('idle');
      setSearchResults([]);
      return;
    }
    await searchFiles(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setSearchResults([]);
    setStatus('idle');
  };

  return {
    searchValue,
    searchResults,
    status,
    handleSearch,
    handleClearSearch,
  };
};
