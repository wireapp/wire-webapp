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

import {useState} from 'react';

import {CSSObject} from '@emotion/react';
import {ICellAsset} from '@pydio/protocol-messaging';

import {t} from 'Util/LocalizerUtil';

import {imageStyles} from './ImageAssetCard.styles';

import {MediaFilePreviewCard} from '../common/MediaFilePreviewCard/MediaFilePreviewCard';

interface ImageAssetCardProps {
  src?: string;
  metadata: ICellAsset['image'];
  size: 'small' | 'large';
  isLoading: boolean;
  isError: boolean;
}

export const ImageAssetCard = ({src, metadata, size, isLoading, isError}: ImageAssetCardProps) => {
  console.log('ImageAssetCard metadata', metadata);

  if (size === 'large') {
    return <SingleImageAsset src={src} metadata={metadata} isLoading={isLoading} isError={isError} />;
  }
  return (
    <MediaFilePreviewCard
      label={src ? t('conversationFileImagePreviewLabel', {src}) : 'Loading...'}
      isLoading={isLoading}
      isError={isError}
    >
      {!isLoading && !isError && src && <img src={src} alt="" css={imageStyles} />}
    </MediaFilePreviewCard>
  );
};

const SingleImageAsset = ({
  src,
  metadata,
  isLoading,
  isError,
}: {
  src?: string;
  metadata: ICellAsset['image'];
  isLoading: boolean;
  isError: boolean;
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const imageContainerStyle: CSSObject = {
    maxWidth: 'var(--conversation-message-asset-width)',
    maxHeight: 'var(--conversation-message-image-asset-max-height)',
    backgroundColor: 'var(--foreground-fade-8)',
    border: 'none',
  };

  const imageStyle: CSSObject = {
    aspectRatio: metadata?.height ? metadata?.width / metadata?.height : undefined,
    maxWidth: '100%',
    maxHeight: '100%',
    width: metadata?.width,
    objectFit: 'contain',
    objectPosition: 'left',
    backgroundColor: 'var(--fade',
    border: 'none',
  };

  return (
    <div css={imageContainerStyle}>
      {!src && <div css={imageStyle} />}
      {src && (
        <img
          src={src}
          alt=""
          css={imageStyle}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => setIsImageLoaded(false)}
        />
      )}
    </div>
  );
};
