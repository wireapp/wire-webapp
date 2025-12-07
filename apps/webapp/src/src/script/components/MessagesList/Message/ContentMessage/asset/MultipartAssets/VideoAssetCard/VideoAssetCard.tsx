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

import {VideoAssetPlayer} from './VideoAssetPlayer/VideoAssetPlayer';
import {VideoAssetSmall} from './VideoAssetSmall/VideoAssetSmall';

interface VideoAssetCardProps {
  variant: 'large' | 'small';
  src?: string;
  extension: string;
  name: string;
  size: string;
  isLoading: boolean;
  isError: boolean;
  senderName: string;
  timestamp: number;
  id: string;
}

export const VideoAssetCard = ({
  variant,
  src,
  extension,
  name,
  size,
  isLoading,
  isError,
  senderName,
  timestamp,
  id,
}: VideoAssetCardProps) => {
  if (variant === 'large') {
    return (
      <VideoAssetPlayer
        id={id}
        url={src}
        isFileShareRestricted={false}
        extension={extension}
        name={name}
        size={size}
        isLoading={isLoading}
        isError={isError}
        senderName={senderName}
        timestamp={timestamp}
      />
    );
  }

  return (
    <VideoAssetSmall
      id={id}
      extension={extension}
      fileName={name}
      senderName={senderName}
      timestamp={timestamp}
      src={src}
      isLoading={isLoading}
      isError={isError}
    />
  );
};
