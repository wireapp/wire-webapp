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

import {
  ArchiveFileIcon,
  AudioFileIcon,
  CodeFileIcon,
  DocumentFileIcon,
  FolderIcon,
  ImageFileIcon,
  OtherFileIcon,
  PdfFileIcon,
  PresentationFileIcon,
  SpreadsheetFileIcon,
  VideoFileIcon,
} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {t} from 'Util/localizerUtil';

import type {FilterConfig, FilterItem} from '../CellsFiltersBar/filterConfig';
import {useGetAllTags} from '../useGetAllTags/useGetAllTags';

// ---------------------------------------------------------------------------
// Mock data — replace each array with an API call in the integration sprint.
// ---------------------------------------------------------------------------

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
  clearAllFilters: () => void;
}

export const useConversationDriveFilters = ({
  cellsRepository,
}: {
  cellsRepository: CellsRepository;
}): UseConversationDriveFiltersResult => {
  const {tags: allTags} = useGetAllTags({cellsRepository});

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [isSharedViaLink, setIsSharedViaLink] = useState(false);

  const toggleSharedViaLink = useCallback(() => setIsSharedViaLink(prev => !prev), []);
  const clearAllFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedFileTypeIds([]);
    setSelectedCreatorIds([]);
    setIsSharedViaLink(false);
  }, []);

  const tagItems = useMemo<FilterItem[]>(() => allTags.map(tag => ({id: tag, label: tag})), [allTags]);

  const fileTypes = useMemo<FilterItem[]>(
    () => [
      {id: 'pictures', label: t('cells.fileType.pictures'), startContent: <ImageFileIcon />},
      {id: 'spreadsheets', label: t('cells.fileType.spreadsheets'), startContent: <SpreadsheetFileIcon />},
      {id: 'presentations', label: t('cells.fileType.presentations'), startContent: <PresentationFileIcon />},
      {id: 'documents', label: t('cells.fileType.documents'), startContent: <DocumentFileIcon />},
      {id: 'pdfs', label: t('cells.fileType.pdfs'), startContent: <PdfFileIcon />},
      {id: 'audio', label: t('cells.fileType.audio'), startContent: <AudioFileIcon />},
      {id: 'videos', label: t('cells.fileType.videos'), startContent: <VideoFileIcon />},
      {id: 'archives', label: t('cells.fileType.archives'), startContent: <ArchiveFileIcon />},
      {id: 'code', label: t('cells.fileType.code'), startContent: <CodeFileIcon />},
      {id: 'others', label: t('cells.fileType.others'), startContent: <OtherFileIcon />},
      {id: 'folders', label: t('cells.fileType.folders'), startContent: <FolderIcon />},
    ],
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
      },
      {
        type: 'popover',
        id: 'fileType',
        label: t('cells.filter.fileType'),
        items: fileTypes,
        selectedIds: selectedFileTypeIds,
        onSelectionChange: setSelectedFileTypeIds,
      },
      {
        type: 'popover',
        id: 'createdBy',
        label: t('cells.filter.createdBy'),
        items: MOCK_CREATORS,
        selectedIds: selectedCreatorIds,
        onSelectionChange: setSelectedCreatorIds,
      },
      {
        type: 'toggle',
        id: 'sharedViaLink',
        label: t('cells.filter.sharedViaLink'),
        isActive: isSharedViaLink,
        onToggle: toggleSharedViaLink,
      },
    ],
    [
      fileTypes,
      tagItems,
      selectedTagIds,
      selectedFileTypeIds,
      selectedCreatorIds,
      isSharedViaLink,
      toggleSharedViaLink,
    ],
  );

  return {
    filters,
    filterState: {selectedTagIds, selectedFileTypeIds, selectedCreatorIds, isSharedViaLink},
    clearAllFilters,
  };
};
