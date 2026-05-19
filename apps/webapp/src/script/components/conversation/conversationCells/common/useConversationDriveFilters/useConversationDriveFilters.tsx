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
import {t} from 'Util/localizerUtil';

import type {FilterConfig, FilterItem} from '../cellsFiltersBar/filterConfig';
import {
  type ConversationDriveFiltersState,
  getActiveConversationDriveFilterType,
  isFilterTypeDisabled,
} from '../driveFilters/driveFilters';
import {FILE_TYPE_CATALOG} from '../driveFilters/fileTypeCatalog';
import {useGetAllTags} from '../useGetAllTags/useGetAllTags';

const MOCK_CREATORS: FilterItem[] = [
  {id: 'a-user', label: 'A User', subLabel: '@auser'},
  {id: 'hello-user', label: 'Hello User', subLabel: '@hellouser'},
  {id: 'b-user', label: 'B User', subLabel: '@buser'},
];

export const useConversationDriveFilters = ({
  cellsRepository,
}: {
  cellsRepository: CellsRepository;
}): {
  filters: FilterConfig[];
  filterState: ConversationDriveFiltersState;
  clearAllFilters: () => void;
} => {
  const {tags: allTags} = useGetAllTags({cellsRepository});

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [isSharedViaLink, setIsSharedViaLink] = useState(false);

  const toggleSharedViaLink = useCallback(() => {
    setIsSharedViaLink(previousValue => {
      return !previousValue;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedFileTypeIds([]);
    setSelectedCreatorIds([]);
    setIsSharedViaLink(false);
  }, []);

  const filterState = useMemo<ConversationDriveFiltersState>(() => {
    return {
      selectedTagIds,
      selectedFileTypeIds,
      selectedCreatorIds,
      isSharedViaLink,
    };
  }, [isSharedViaLink, selectedCreatorIds, selectedFileTypeIds, selectedTagIds]);

  const tagItems = useMemo<FilterItem[]>(() => {
    return allTags.map(tag => {
      return {id: tag, label: tag};
    });
  }, [allTags]);

  const fileTypes = useMemo<FilterItem[]>(() => {
    return FILE_TYPE_CATALOG.map(({id, labelKey, Icon}) => {
      return {
        id,
        label: t(labelKey),
        startContent: <Icon />,
      };
    });
  }, []);

  const activeFilterType = useMemo(() => {
    return getActiveConversationDriveFilterType(filterState);
  }, [filterState]);

  const filters = useMemo<FilterConfig[]>(() => {
    return [
      {
        type: 'popover',
        id: 'tags',
        label: t('cells.filter.tags'),
        items: tagItems,
        selectedIds: selectedTagIds,
        onSelectionChange: setSelectedTagIds,
        disabled: isFilterTypeDisabled('tags', activeFilterType),
      },
      {
        type: 'popover',
        id: 'fileType',
        label: t('cells.filter.fileType'),
        items: fileTypes,
        selectedIds: selectedFileTypeIds,
        onSelectionChange: setSelectedFileTypeIds,
        disabled: isFilterTypeDisabled('fileType', activeFilterType),
      },
      {
        type: 'popover',
        id: 'createdBy',
        label: t('cells.filter.createdBy'),
        items: MOCK_CREATORS,
        selectedIds: selectedCreatorIds,
        onSelectionChange: setSelectedCreatorIds,
        disabled: isFilterTypeDisabled('createdBy', activeFilterType),
      },
      {
        type: 'toggle',
        id: 'sharedViaLink',
        label: t('cells.filter.sharedViaLink'),
        isActive: isSharedViaLink,
        onToggle: toggleSharedViaLink,
        disabled: isFilterTypeDisabled('sharedViaLink', activeFilterType),
      },
    ];
  }, [
    activeFilterType,
    fileTypes,
    isSharedViaLink,
    selectedCreatorIds,
    selectedFileTypeIds,
    selectedTagIds,
    tagItems,
    toggleSharedViaLink,
  ]);

  return {filters, filterState, clearAllFilters};
};
