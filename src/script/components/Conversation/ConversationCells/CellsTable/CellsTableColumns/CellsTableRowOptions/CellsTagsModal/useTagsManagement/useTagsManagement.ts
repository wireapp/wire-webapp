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

import {ComboboxSelectOption} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'src/script/cells/CellsRepository';

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

  const {isLoading, error} = useGetAllTags({
    cellsRepository,
    enabled: fetchTagsEnabled,
    onSuccess: tags => setAllTags(tags.map(transformTagToSelectOption)),
  });

  const handleCreateOption = (inputValue: string) => {
    if (inputValue.trim() === '') {
      return;
    }

    const newOption = transformTagToSelectOption(inputValue);
    setAllTags(prev => [...prev, newOption]);
    setSelectedTags(prev => [...prev, newOption]);
  };

  const handleChange = (value: ComboboxSelectOption | ComboboxSelectOption[]) => {
    setSelectedTags(Array.isArray(value) ? value : [value]);
  };

  const handleUpdateTags = async (uuid: string) => {
    await cellsRepository.setNodeTags({
      uuid,
      tags: selectedTags.map(option => option.value as string).filter(Boolean),
    });
    onSuccess?.();
  };

  return {
    allTags,
    selectedTags,
    isLoading,
    error,
    handleCreateOption,
    handleChange,
    handleUpdateTags,
  };
};
