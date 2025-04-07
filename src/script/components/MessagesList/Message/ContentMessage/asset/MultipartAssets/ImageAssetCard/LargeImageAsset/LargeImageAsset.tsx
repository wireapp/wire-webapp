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

import {CSSProperties, useState} from 'react';

import {ICellAsset} from '@pydio/protocol-messaging';

import {
  containerStyles,
  imageStyle,
  imageWrapperStyles,
  loaderIconStyles,
  loaderOverlayStyles,
  loaderWrapperStyles,
} from './LargeImageAsset.styles';

interface LargeImageAssetProps {
  src?: string;
  metadata: ICellAsset['image'];
  isLoading: boolean;
  isError: boolean;
}

export const LargeImageAsset = ({src, metadata, isLoading, isError}: LargeImageAssetProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div
      css={containerStyles}
      style={
        {
          '--aspect-ratio': metadata?.height ? metadata?.width / metadata?.height : undefined,
        } as CSSProperties
      }
    >
      {!isImageLoaded && (
        <div css={loaderOverlayStyles}>
          <div css={loaderWrapperStyles}>
            <div className="icon-spinner spin" css={loaderIconStyles} />
          </div>
        </div>
      )}
      <div css={imageWrapperStyles}>
        <img
          src={src}
          alt=""
          css={imageStyle}
          style={
            {
              '--opacity': isImageLoaded ? 1 : 0,
            } as CSSProperties
          }
          width={metadata?.width}
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>
    </div>
  );
};
