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

import {imageLargeStyles, imageLargeWrapperStyle, imageStyles} from './ImageAssetCard.styles';

import {MediaFilePreviewCard} from '../common/MediaFilePreviewCard/MediaFilePreviewCard';

interface ImageAssetCardProps {
  src?: string;
  size: 'small' | 'large';
  onRetry: () => void;
  isLoading: boolean;
  isError: boolean;
}

export const ImageAssetCard = ({src, size, onRetry, isLoading, isError}: ImageAssetCardProps) => {
  if (size === 'large') {
    return (
      <div css={imageLargeWrapperStyle}>
        <img src={src} alt="" css={imageLargeStyles} />
      </div>
    );
  }

  return (
    <MediaFilePreviewCard
      label={src ? t('conversationFileImagePreviewLabel', {src}) : 'Loading...'}
      onRetry={onRetry}
      isLoading={isLoading}
      isError={isError}
    >
      {!isLoading && src && <img src={src} alt="" css={imageStyles} />}
    </MediaFilePreviewCard>
  );
};
