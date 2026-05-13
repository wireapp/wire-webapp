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

import type {
  FilterConfig,
  FilterItem,
} from 'Components/Conversation/ConversationCells/common/CellsFiltersBar/filterConfig';
import {useGetAllTags} from 'Components/Conversation/ConversationCells/common/useGetAllTags/useGetAllTags';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {t} from 'Util/localizerUtil';

import {useCellsStore} from '../useCellsStore/useCellsStore';

// ---------------------------------------------------------------------------
// Mock data — replace each array with an API call in the integration sprint.
// ---------------------------------------------------------------------------

const MOCK_CONVERSATIONS: FilterItem[] = [
  {id: 'conv-1', label: 'Marketing Team'},
  {id: 'conv-2', label: 'Engineering'},
  {id: 'conv-3', label: 'Design'},
];

const MOCK_CREATORS: FilterItem[] = [
  {id: 'a-user', label: 'A User', subLabel: '@auser'},
  {id: 'hello-user', label: 'Hello User', subLabel: '@hellouser'},
  {id: 'b-user', label: 'B User', subLabel: '@buser'},
];

// ---------------------------------------------------------------------------

export const useGlobalDriveFilters = ({
  cellsRepository,
}: {
  cellsRepository: CellsRepository;
}): {filters: FilterConfig[]} => {
  const {filters: cellsFilters} = useCellsStore();
  const {tags: allTags} = useGetAllTags({cellsRepository});

  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<string[]>([]);
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [isSharedViaLink, setIsSharedViaLink] = useState(false);

  const toggleSharedViaLink = useCallback(() => setIsSharedViaLink(prev => !prev), []);

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
        selectedIds: cellsFilters.tags,
        onSelectionChange: cellsFilters.setTags,
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
        id: 'conversation',
        label: t('cells.filter.conversation'),
        items: MOCK_CONVERSATIONS,
        selectedIds: selectedConversationIds,
        onSelectionChange: setSelectedConversationIds,
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
      cellsFilters.tags,
      cellsFilters.setTags,
      selectedFileTypeIds,
      selectedConversationIds,
      selectedCreatorIds,
      isSharedViaLink,
      toggleSharedViaLink,
    ],
  );

  return {filters};
};
