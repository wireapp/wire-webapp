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

import {ComponentType} from 'react';

import {
  ArchiveFileIcon,
  AudioFileIcon,
  DocumentFileIcon,
  ImageFileIcon,
  PdfFileIcon,
  PresentationFileIcon,
  SpreadsheetFileIcon,
  TextFileIcon,
  VideoFileIcon,
} from '@wireapp/react-ui-kit';

import type {StringIdentifier} from 'Util/localizerUtil';

type FileTypeLabelKey = Extract<StringIdentifier, `cells.fileType.${string}`>;

export interface FileTypeCatalogEntry {
  readonly id: string;
  readonly labelKey: FileTypeLabelKey;
  readonly Icon: ComponentType;
  readonly mimeTerms: readonly string[];
}

export const FILE_TYPE_CATALOG: readonly FileTypeCatalogEntry[] = [
  {id: 'pictures', labelKey: 'cells.fileType.pictures', Icon: ImageFileIcon, mimeTerms: ['image/*']},
  {
    id: 'spreadsheets',
    labelKey: 'cells.fileType.spreadsheets',
    Icon: SpreadsheetFileIcon,
    mimeTerms: ['*spreadsheet*', '*excel*'],
  },
  {
    id: 'presentations',
    labelKey: 'cells.fileType.presentations',
    Icon: PresentationFileIcon,
    mimeTerms: ['*presentation*', '*powerpoint*'],
  },
  {id: 'documents', labelKey: 'cells.fileType.documents', Icon: DocumentFileIcon, mimeTerms: ['*word*']},
  {id: 'pdfs', labelKey: 'cells.fileType.pdfs', Icon: PdfFileIcon, mimeTerms: ['application/pdf']},
  {id: 'audio', labelKey: 'cells.fileType.audio', Icon: AudioFileIcon, mimeTerms: ['audio/*']},
  {id: 'videos', labelKey: 'cells.fileType.videos', Icon: VideoFileIcon, mimeTerms: ['video/*']},
  {
    id: 'archives',
    labelKey: 'cells.fileType.archives',
    Icon: ArchiveFileIcon,
    mimeTerms: [
      'application/zip',
      'application/vnd.rar',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-bzip2',
    ],
  },
  {id: 'text', labelKey: 'cells.fileType.text', Icon: TextFileIcon, mimeTerms: ['*text/plain*']},
];
