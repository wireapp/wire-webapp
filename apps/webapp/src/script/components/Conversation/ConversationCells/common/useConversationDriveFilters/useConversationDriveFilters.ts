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

import {useCallback, useState} from 'react';

import type {FilterConfig, FilterItem} from '../CellsFiltersBar/filterConfig';

// ---------------------------------------------------------------------------
// Mock data — replace each array with an API call in the integration sprint.
// ---------------------------------------------------------------------------

const MOCK_TAGS: FilterItem[] = [
  {id: 'a-tag', label: 'A tag'},
  {id: 'hello-tag', label: 'Hello tag'},
  {id: 'b-tag', label: 'B tag'},
  {id: 'new-tag-1', label: 'New tag 1'},
  {id: 'e-tag', label: 'E Tag'},
];

const MOCK_FILE_TYPES: FilterItem[] = [
  {id: 'document', label: 'Document'},
  {id: 'spreadsheet', label: 'Spreadsheet'},
  {id: 'presentation', label: 'Presentation'},
  {id: 'image', label: 'Image'},
  {id: 'video', label: 'Video'},
  {id: 'audio', label: 'Audio'},
  {id: 'pdf', label: 'PDF'},
  {id: 'other', label: 'Other'},
];

const MOCK_CREATORS: FilterItem[] = [
  {id: 'a-user', label: 'A User', subLabel: '@auser'},
  {id: 'hello-user', label: 'Hello User', subLabel: '@hellouser'},
  {id: 'b-user', label: 'B User', subLabel: '@buser'},
];

// ---------------------------------------------------------------------------

export interface ConversationDriveFiltersState {
  selectedTagIds: string[];
  selectedFileTypeIds: string[];
  selectedCreatorIds: string[];
  isSharedViaLink: boolean;
}

export interface UseConversationDriveFiltersResult {
  filters: FilterConfig[];
  filterState: ConversationDriveFiltersState;
}

export const useConversationDriveFilters = (): UseConversationDriveFiltersResult => {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [isSharedViaLink, setIsSharedViaLink] = useState(false);

  const toggleSharedViaLink = useCallback(() => setIsSharedViaLink(prev => !prev), []);

  const filters: FilterConfig[] = [
    {
      type: 'popover',
      id: 'tags',
      label: 'Tags',
      items: MOCK_TAGS,
      selectedIds: selectedTagIds,
      onSelectionChange: setSelectedTagIds,
    },
    {
      type: 'popover',
      id: 'fileType',
      label: 'File type',
      items: MOCK_FILE_TYPES,
      selectedIds: selectedFileTypeIds,
      onSelectionChange: setSelectedFileTypeIds,
    },
    {
      type: 'popover',
      id: 'createdBy',
      label: 'Created by',
      items: MOCK_CREATORS,
      selectedIds: selectedCreatorIds,
      onSelectionChange: setSelectedCreatorIds,
    },
    {
      type: 'toggle',
      id: 'sharedViaLink',
      label: 'Shared via link',
      isActive: isSharedViaLink,
      onToggle: toggleSharedViaLink,
    },
  ];

  return {
    filters,
    filterState: {selectedTagIds, selectedFileTypeIds, selectedCreatorIds, isSharedViaLink},
  };
};
