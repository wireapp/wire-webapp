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

import type {
  FilterConfig,
  FilterItem,
} from 'Components/Conversation/ConversationCells/common/CellsFiltersBar/filterConfig';
import {
  type GlobalDriveFiltersState,
  getActiveGlobalDriveFilterType,
  isFilterTypeDisabled,
} from 'Components/Conversation/ConversationCells/common/driveFilters/driveFilters';
import {FILE_TYPE_CATALOG} from 'Components/Conversation/ConversationCells/common/driveFilters/fileTypeCatalog';
import {useDriveEnabledParticipantFilterItems} from 'Components/Conversation/ConversationCells/common/useDriveEnabledParticipantFilterItems/useDriveEnabledParticipantFilterItems';
import {useGetAllTags} from 'Components/Conversation/ConversationCells/common/useGetAllTags/useGetAllTags';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {t} from 'Util/localizerUtil';

// ---------------------------------------------------------------------------
// Mock data — replace each array with an API call in the integration sprint.
// ---------------------------------------------------------------------------

const MOCK_CONVERSATIONS: FilterItem[] = [
  {id: 'conv-1', label: 'Marketing Team'},
  {id: 'conv-2', label: 'Engineering'},
  {id: 'conv-3', label: 'Design'},
];

// ---------------------------------------------------------------------------

export const useGlobalDriveFilters = ({
  cellsRepository,
  conversationRepository,
}: {
  cellsRepository: CellsRepository;
  conversationRepository: ConversationRepository;
}): {filters: FilterConfig[]; filterState: GlobalDriveFiltersState} => {
  const {tags: allTags} = useGetAllTags({cellsRepository});
  const creatorItems = useDriveEnabledParticipantFilterItems({conversationRepository});

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<string[]>([]);
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [isSharedViaLink, setIsSharedViaLink] = useState(false);

  const toggleSharedViaLink = useCallback(() => setIsSharedViaLink(prev => !prev), []);
  const filterState = useMemo<GlobalDriveFiltersState>(
    () => ({
      selectedTagIds,
      selectedFileTypeIds,
      selectedCreatorIds,
      selectedConversationIds,
      isSharedViaLink,
    }),
    [isSharedViaLink, selectedConversationIds, selectedCreatorIds, selectedFileTypeIds, selectedTagIds],
  );

  const tagItems = useMemo<FilterItem[]>(() => allTags.map(tag => ({id: tag, label: tag})), [allTags]);
  const activeFilterType = useMemo(() => getActiveGlobalDriveFilterType(filterState), [filterState]);

  const fileTypes = useMemo<FilterItem[]>(
    () =>
      FILE_TYPE_CATALOG.map(({id, labelKey, Icon}) => ({
        id,
        label: t(labelKey),
        startContent: <Icon />,
      })),
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: 'popover',
        id: 'tags',
        label: t('cells.filter.tags'),
        items: tagItems,
        selectedIds: selectedTagIds,
        onSelectionChange: setSelectedTagIds,
        disabled: isFilterTypeDisabled('tags', activeFilterType),
        singleSelect: false,
      },
      {
        type: 'popover',
        id: 'fileType',
        label: t('cells.filter.fileType'),
        items: fileTypes,
        selectedIds: selectedFileTypeIds,
        onSelectionChange: setSelectedFileTypeIds,
        disabled: isFilterTypeDisabled('fileType', activeFilterType),
        singleSelect: false,
      },
      {
        type: 'popover',
        id: 'conversation',
        label: t('cells.filter.conversation'),
        items: MOCK_CONVERSATIONS,
        selectedIds: selectedConversationIds,
        onSelectionChange: setSelectedConversationIds,
        disabled: isFilterTypeDisabled('conversation', activeFilterType),
        singleSelect: true,
      },
      {
        type: 'popover',
        id: 'createdBy',
        label: t('cells.filter.createdBy'),
        items: creatorItems,
        selectedIds: selectedCreatorIds,
        onSelectionChange: setSelectedCreatorIds,
        disabled: isFilterTypeDisabled('createdBy', activeFilterType),
        singleSelect: false,
      },
      {
        type: 'toggle',
        id: 'sharedViaLink',
        label: t('cells.filter.sharedViaLink'),
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
      selectedConversationIds,
      selectedCreatorIds,
      isSharedViaLink,
      toggleSharedViaLink,
    ],
  );

  return {filters, filterState};
};
