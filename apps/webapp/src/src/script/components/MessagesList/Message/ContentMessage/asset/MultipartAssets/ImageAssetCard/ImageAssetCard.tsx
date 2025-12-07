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

import {ICellAsset} from '@wireapp/protocol-messaging';

import {ImageAssetLarge} from './ImageAssetLarge/ImageAssetLarge';
import {ImageAssetSmall} from './ImageAssetSmall/ImageAssetSmall';

interface ImageAssetCardProps {
  src?: string;
  name: string;
  extension: string;
  senderName: string;
  timestamp: number;
  metadata: ICellAsset['image'];
  variant: 'small' | 'large';
  isLoading: boolean;
  isError: boolean;
  id: string;
}

export const ImageAssetCard = ({
  id,
  src,
  name,
  extension,
  senderName,
  timestamp,
  metadata,
  variant,
  isLoading,
  isError,
}: ImageAssetCardProps) => {
  if (variant === 'large') {
    return (
      <ImageAssetLarge
        id={id}
        src={src}
        name={name}
        extension={extension}
        metadata={metadata}
        isError={isError}
        senderName={senderName}
        timestamp={timestamp}
      />
    );
  }

  return (
    <ImageAssetSmall
      id={id}
      src={src}
      name={name}
      extension={extension}
      isLoading={isLoading}
      isError={isError}
      senderName={senderName}
      timestamp={timestamp}
    />
  );
};
