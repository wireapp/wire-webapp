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

import {imageStyles} from './ImagePreviewCard.styles';

import {MediaFilePreviewCard} from '../common/MediaFilePreviewCard/MediaFilePreviewCard';

interface ImagePreviewCardProps {
  src: string;
  onDelete: () => void;
  onRetry: () => void;
  isError: boolean;
  uploadProgress: number;
}

export const ImagePreviewCard = ({src, onDelete, onRetry, isError, uploadProgress}: ImagePreviewCardProps) => {
  return (
    <MediaFilePreviewCard
      label={t('conversationFileImagePreviewLabel', {src})}
      onDelete={onDelete}
      onRetry={onRetry}
      isError={isError}
      uploadProgress={uploadProgress}
    >
      <img src={src} alt="" css={imageStyles} />
    </MediaFilePreviewCard>
  );
};
