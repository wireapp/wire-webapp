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

import {PlayIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {getFileExtension} from 'Util/util';

import {
  imagePreviewStyles,
  imagePreviewWrapperStyles,
  mobileName,
  playIconStyles,
  wrapperStyles,
} from './CellsTableNameColumn.styles';

interface CellsTableNameColumnProps {
  name: string;
  previewUrl?: string | null;
  mimeType?: string | null;
}

export const CellsTableNameColumn = ({name, previewUrl, mimeType}: CellsTableNameColumnProps) => {
  const isImage = mimeType?.startsWith('image');
  const isVideo = mimeType?.startsWith('video');

  const shouldDisplayImagePreview = (isImage || isVideo) && previewUrl;

  return (
    <>
      <span css={mobileName}>{name}</span>
      <div css={wrapperStyles}>
        {shouldDisplayImagePreview ? (
          <div css={imagePreviewWrapperStyles}>
            <img src={previewUrl} alt="" width={24} height={24} css={imagePreviewStyles} />
            {isVideo && <PlayIcon css={playIconStyles} width={16} height={16} />}
          </div>
        ) : (
          <FileTypeIcon extension={getFileExtension(name)} size={24} />
        )}
        <span>{name}</span>
      </div>
    </>
  );
};
