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

import {containerStyle, imageStyle} from './LargeImageAsset.styles';

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
      css={containerStyle}
      style={
        {
          aspectRatio: metadata?.height ? metadata?.width / metadata?.height : undefined,
          backgroundColor: isLoading ? 'var(--foreground-fade-8)' : 'transparent',
        } as CSSProperties
      }
    >
      <img
        src={src}
        alt=""
        css={imageStyle}
        style={
          {
            aspectRatio: metadata?.height ? metadata?.width / metadata?.height : undefined,
            width: metadata?.width,
          } as CSSProperties
        }
        onLoad={() => setIsImageLoaded(true)}
        onError={() => setIsImageLoaded(false)}
      />
    </div>
  );
};
