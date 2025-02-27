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

import {ComponentType} from 'react';

import {SVGIconProps} from '@wireapp/react-ui-kit/lib/Icon/SVGIcon';

import {
  PdfFileIcon,
  ImageFileIcon,
  VideoFileIcon,
  AudioFileIcon,
  DocumentFileIcon,
  PresentationFileIcon,
  SpreadsheetFileIcon,
  TextFileIcon,
  CodeFileIcon,
  ArchiveFileIcon,
  OtherFileIcon,
} from '@wireapp/react-ui-kit';

import {FileType} from './fileType';
import {getFileTypeFromExtension} from './getFileTypeFromExtension/getFileTypeFromExtension';

interface FileTypeIconProps {
  extension: string;
  size?: number;
}

export const FileTypeIcon = ({extension, size = 16}: FileTypeIconProps) => {
  const type = getFileTypeFromExtension(extension);
  const Icon = fileIcons[type];

  return <Icon width={size} height={size} />;
};

const fileIcons: Record<FileType, ComponentType<SVGIconProps>> = {
  pdf: PdfFileIcon,
  image: ImageFileIcon,
  video: VideoFileIcon,
  audio: AudioFileIcon,
  document: DocumentFileIcon,
  presentation: PresentationFileIcon,
  spreadsheet: SpreadsheetFileIcon,
  text: TextFileIcon,
  code: CodeFileIcon,
  archive: ArchiveFileIcon,
  other: OtherFileIcon,
};
