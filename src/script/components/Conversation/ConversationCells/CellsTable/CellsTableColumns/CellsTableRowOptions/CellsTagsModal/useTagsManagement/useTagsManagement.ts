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

import {useCallback, useState} from 'react';

import {ComboboxSelectOption} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {transformTagToSelectOption} from './transformTagToSelectOption/transformTagToSelectOption';
import {useGetAllTags} from './useGetAllTags/useGetAllTags';

interface UseTagsManagementProps {
  cellsRepository: CellsRepository;
  fetchTagsEnabled: boolean;
  initialSelectedTags: string[];
  onSuccess?: () => void;
}

export const useTagsManagement = ({
  cellsRepository,
  fetchTagsEnabled,
  initialSelectedTags,
  onSuccess,
}: UseTagsManagementProps) => {
  const [allTags, setAllTags] = useState<ComboboxSelectOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<ComboboxSelectOption[]>(
    initialSelectedTags.map(transformTagToSelectOption),
  );
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSetAllTags = useCallback((tags: string[]) => {
    setAllTags(tags.map(transformTagToSelectOption));
  }, []);

  const {isLoading: isLoadingAllTags, error: apiError} = useGetAllTags({
    cellsRepository,
    enabled: fetchTagsEnabled,
    onSuccess: handleSetAllTags,
  });

  const handleCreateOption = (inputValue: string) => {
    if (inputValue.trim() === '') {
      return;
    }

    if (inputValue.includes(',')) {
      setValidationError(t('cells.tagsModal.validationError.comma'));
      return;
    }

    setValidationError(null);

    const newOption = transformTagToSelectOption(inputValue);
    setAllTags(prev => [...prev, newOption]);
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
