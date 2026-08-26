/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useCallback, useMemo, useState} from 'react';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {RootContextValue} from 'src/script/page/rootProvider';

import type {FilterConfig, FilterItem} from '../cellsFiltersBar/filterConfig';
import {
  type ConversationDriveFiltersState,
  getActiveConversationDriveFilterType,
  isFilterTypeDisabled,
} from '../driveFilters/driveFilters';
import {FILE_TYPE_CATALOG} from '../driveFilters/fileTypeCatalog';
import {useDriveEnabledParticipantFilterItems} from '../useDriveEnabledParticipantFilterItems/useDriveEnabledParticipantFilterItems';
import {useGetAllTags} from '../useGetAllTags/useGetAllTags';

export interface UseConversationDriveFiltersResult {
  filters: FilterConfig[];
  filterState: ConversationDriveFiltersState;
  clearAllFilters: () => void;
}

export const useConversationDriveFilters = ({
  cellsRepository,
  conversationRepository,
  translate,
}: {
  cellsRepository: CellsRepository;
  conversationRepository: ConversationRepository;
  translate: RootContextValue['translate'];
}): UseConversationDriveFiltersResult => {
  const {tags: allTags} = useGetAllTags({cellsRepository});
  const creatorItems = useDriveEnabledParticipantFilterItems({conversationRepository});

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [isSharedViaLink, setIsSharedViaLink] = useState(false);

  const toggleSharedViaLink = useCallback(() => setIsSharedViaLink(prev => !prev), []);
  const filterState = useMemo<ConversationDriveFiltersState>(
    () => ({
      selectedTagIds,
      selectedFileTypeIds,
      selectedCreatorIds,
      isSharedViaLink,
    }),
    [isSharedViaLink, selectedCreatorIds, selectedFileTypeIds, selectedTagIds],
  );
  const clearAllFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedFileTypeIds([]);
    setSelectedCreatorIds([]);
    setIsSharedViaLink(false);
  }, []);

  const tagItems = useMemo<FilterItem[]>(() => allTags.map(tag => ({id: tag, label: tag})), [allTags]);
  const activeFilterType = useMemo(() => getActiveConversationDriveFilterType(filterState), [filterState]);

  const fileTypes = useMemo<FilterItem[]>(
    () =>
      FILE_TYPE_CATALOG.map(({id, labelKey, Icon}) => ({
        id,
        label: translate(labelKey),
        startContent: <Icon />,
      })),
    [translate],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: 'popover',
        id: 'tags',
        label: translate('cells.filter.tags'),
        items: tagItems,
        selectedIds: selectedTagIds,
        onSelectionChange: setSelectedTagIds,
        disabled: isFilterTypeDisabled('tags', activeFilterType),
        singleSelect: false,
      },
      {
        type: 'popover',
        id: 'fileType',
        label: translate('cells.filter.fileType'),
        items: fileTypes,
        selectedIds: selectedFileTypeIds,
        onSelectionChange: setSelectedFileTypeIds,
        disabled: isFilterTypeDisabled('fileType', activeFilterType),
        singleSelect: false,
      },
      {
        type: 'popover',
        id: 'createdBy',
        label: translate('cells.filter.createdBy'),
        items: creatorItems,
        selectedIds: selectedCreatorIds,
        onSelectionChange: setSelectedCreatorIds,
        disabled: isFilterTypeDisabled('createdBy', activeFilterType),
        singleSelect: false,
      },
      {
        type: 'toggle',
        id: 'sharedViaLink',
        label: translate('cells.filter.sharedViaLink'),
        isActive: isSharedViaLink,
        onToggle: toggleSharedViaLink,
        disabled: isFilterTypeDisabled('sharedViaLink', activeFilterType),
      },
    ],
    [
      activeFilterType,
      creatorItems,
      fileTypes,
      tagItems,
      selectedTagIds,
      selectedFileTypeIds,
      selectedCreatorIds,
      isSharedViaLink,
      toggleSharedViaLink,
      translate,
    ],
  );

  return {
    filters,
    filterState,
    clearAllFilters,
  };
};
