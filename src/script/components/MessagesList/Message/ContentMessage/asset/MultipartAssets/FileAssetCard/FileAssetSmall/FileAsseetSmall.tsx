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

import {FileCard} from 'Components/FileCard/FileCard';

import {FileAssetOptions} from '../common/FileAssetOptions/FileAssetOptions';

interface FileAssetSmallProps {
  src?: string;
  extension: string;
  name: string;
  size: string;
  isError: boolean;
  senderName: string;
  timestamp: number;
}

export const FileAssetSmall = ({src, extension, name, size, isError, senderName, timestamp}: FileAssetSmallProps) => {
  return (
    <FileCard.Root extension={extension} name={name} size={size}>
      <FileCard.Header>
        <FileCard.Icon type={isError ? 'unavailable' : 'file'} />
        {!isError && <FileCard.Type />}
        <FileAssetOptions src={src} name={name} extension={extension} senderName={senderName} timestamp={timestamp} />
      </FileCard.Header>
      <FileCard.Name variant={isError ? 'secondary' : 'primary'} />
    </FileCard.Root>
  );
};
