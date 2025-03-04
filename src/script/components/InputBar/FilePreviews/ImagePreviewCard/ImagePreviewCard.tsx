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

import {t} from 'Util/LocalizerUtil';

import {imageStyles, loaderWrapperStyles, wrapperStyles} from './ImagePreviewCard.styles';

import {FilePreviewDeleteButton} from '../common/FilePreviewDeleteButton/FilePreviewDeleteButton';
import {FilePreviewErrorMoreButton} from '../common/FilePreviewErrorMoreButton/FilePreviewErrorMoreButton';
import {FilePreviewSpinner} from '../common/FilePreviewSpinner/FilePreviewSpinner';
interface ImagePreviewCardProps {
  src: string;
  onDelete: () => void;
  onRetry: () => void;
  isLoading: boolean;
  isError: boolean;
}

export const ImagePreviewCard = ({src, onDelete, onRetry, isLoading, isError}: ImagePreviewCardProps) => {
  return (
    <article css={wrapperStyles} aria-label={t('conversationFileImagePreviewLabel', {src})}>
      <img
        src={src}
        alt=""
        css={imageStyles}
        onLoad={() => {
          URL.revokeObjectURL(src);
        }}
      />
      {isLoading && (
        <div css={loaderWrapperStyles}>
          <FilePreviewSpinner />
        </div>
      )}
      {isError && <FilePreviewErrorMoreButton onDelete={onDelete} onRetry={onRetry} />}
      {!isLoading && !isError && <FilePreviewDeleteButton onDelete={onDelete} />}
    </article>
  );
};
