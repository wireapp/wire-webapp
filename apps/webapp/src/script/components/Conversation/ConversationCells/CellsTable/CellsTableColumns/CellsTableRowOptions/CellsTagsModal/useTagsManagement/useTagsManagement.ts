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

import {useEffect, useMemo, useState} from 'react';

import {ComboboxSelectOption} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {transformTagToSelectOption} from './transformTagToSelectOption/transformTagToSelectOption';

import {sortTagsAlphabetically} from '../../../../../common/sortTagsAlphabetically/sortTagsAlphabetically';
import {useAllCellsTagsStore} from '../../../../../common/useAllCellsTagsStore/useAllCellsTagsStore';

interface UseTagsManagementProps {
  cellsRepository: CellsRepository;
  fetchTagsEnabled: boolean;
  initialSelectedTags: string[];
  onSuccess?: () => void;
  commaValidationError: string;
}

export const useTagsManagement = ({
  cellsRepository,
  fetchTagsEnabled,
  initialSelectedTags,
  onSuccess,
  commaValidationError,
}: UseTagsManagementProps) => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const tagNames = useAllCellsTagsStore(state => state.tags);
  const isLoadingAllTags = useAllCellsTagsStore(state => state.isLoading);
  const apiError = useAllCellsTagsStore(state => state.error);
  const hasFetchedTags = useAllCellsTagsStore(state => state.hasFetched);
  const fetchAllTags = useAllCellsTagsStore(state => state.fetch);

  const [createdTags, setCreatedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<ComboboxSelectOption[]>(
    initialSelectedTags.map(transformTagToSelectOption),
  );
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!fetchTagsEnabled || hasFetchedTags) {
      return;
    }

    fireAndForgetInvoker.fireAndForget(() => fetchAllTags(cellsRepository));
    // cellsRepository is a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAllTags, fetchTagsEnabled, hasFetchedTags]);

  const allTags = useMemo(() => {
    const allTagNames = [...tagNames, ...createdTags];
    const uniqueTagNames = Array.from(new Set(allTagNames));
    return sortTagsAlphabetically(uniqueTagNames).map(transformTagToSelectOption);
  }, [createdTags, tagNames]);

  const handleCreateOption = (inputValue: string) => {
    if (inputValue.trim() === '') {
      return;
    }

    if (inputValue.includes(',')) {
      setValidationError(commaValidationError);
      return;
    }

    setValidationError(null);

    const newOption = transformTagToSelectOption(inputValue);
    setCreatedTags(prev => [...prev, inputValue]);
    setSelectedTags(prev => [...prev, newOption]);
  };

  const handleChange = (value: ComboboxSelectOption | ComboboxSelectOption[]) => {
    setSelectedTags(Array.isArray(value) ? value : [value]);
    setValidationError(null);
  };

  const handleUpdateTags = async (uuid: string) => {
    setIsUpdatingTags(true);
    await cellsRepository.setNodeTags({
      uuid,
      tags: selectedTags.map(option => option.value as string).filter(Boolean),
    });
    // Invalidate the centralized tags cache so the filter bar (and other views) pick up new tags.
    fireAndForgetInvoker.fireAndForget(() => useAllCellsTagsStore.getState().fetch(cellsRepository));
    onSuccess?.();
    setIsUpdatingTags(false);
  };

  return {
    allTags,
    selectedTags,
    isUpdatingTags,
    isLoadingAllTags,
    apiError,
    validationError,
    handleCreateOption,
    handleChange,
    handleUpdateTags,
  };
};
