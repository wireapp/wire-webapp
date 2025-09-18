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

import {ComponentType, CSSProperties} from 'react';

import {
  SVGIconProps,
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
} from '@wireapp/react-ui-kit/lib';

import {FileType} from 'Util/getFileTypeFromExtension/fileType';
import {getFileTypeFromExtension} from 'Util/getFileTypeFromExtension/getFileTypeFromExtension';

import {iconStyles, wrapperStyles} from './FileTypeIcon.styles';

interface FileTypeIconProps {
  extension: string;
  size?: number;
}

export const FileTypeIcon = ({extension, size = 16}: FileTypeIconProps) => {
  const type = getFileTypeFromExtension(extension);
  const Icon = fileIcons[type];

  return (
    <div css={wrapperStyles} style={{'--size': `${size}px`} as CSSProperties}>
      <Icon width={size} height={size} css={iconStyles} />
    </div>
  );
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
