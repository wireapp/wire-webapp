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

import {ComponentType, CSSProperties, type FunctionComponent} from 'react';

import {iconStyles, wrapperStyles} from './fileTypeIcon.styles';

import {ArchiveFileIcon} from '../../../../uiKit/dataDisplay/icon/files/archiveFileIcon';
import {AudioFileIcon} from '../../../../uiKit/dataDisplay/icon/files/audioFileIcon';
import {CodeFileIcon} from '../../../../uiKit/dataDisplay/icon/files/codeFileIcon';
import {DocumentFileIcon} from '../../../../uiKit/dataDisplay/icon/files/documentFileIcon';
import {ImageFileIcon} from '../../../../uiKit/dataDisplay/icon/files/imageFileIcon';
import {OtherFileIcon} from '../../../../uiKit/dataDisplay/icon/files/otherFileIcon';
import {PdfFileIcon} from '../../../../uiKit/dataDisplay/icon/files/pdfFileIcon';
import {PresentationFileIcon} from '../../../../uiKit/dataDisplay/icon/files/presentationFileIcon';
import {SpreadsheetFileIcon} from '../../../../uiKit/dataDisplay/icon/files/spreadsheetFileIcon';
import {TextFileIcon} from '../../../../uiKit/dataDisplay/icon/files/textFileIcon';
import {VideoFileIcon} from '../../../../uiKit/dataDisplay/icon/files/videoFileIcon';
import {SVGIconProps} from '../../../../uiKit/dataDisplay/icon/svgIcon';
import {FileType} from '../../../../util/getFileTypeFromExtension/fileType';
import {getFileTypeFromExtension} from '../../../../util/getFileTypeFromExtension/getFileTypeFromExtension';

interface FileTypeIconProps {
  extension: string;
  size?: number;
}

export const FileTypeIcon: FunctionComponent<FileTypeIconProps> = ({extension, size = 16}: FileTypeIconProps) => {
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
