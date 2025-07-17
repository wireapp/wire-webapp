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

import type {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset as FileAssetType} from 'Repositories/entity/message/FileAsset';

import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';
import {FileAssetCard} from '../FileAsset/FileAssetCard/FileAssetCard';
import {FileAssetRestricted} from '../FileAsset/FileAssetRestricted/FileAssetRestricted';
import {getFileAssetMetadata} from '../FileAsset/getFileAssetMetadata/getFileAssetMetadata';
import {getFileAssetStatus} from '../FileAsset/getFileAssetStatus/getAssetStatus';

interface FileAssetV2Props {
  message: ContentMessage;
  isFileShareRestricted: boolean;
}

export const FileAssetV2 = ({message, isFileShareRestricted}: FileAssetV2Props) => {
  const asset = message.getFirstAsset() as FileAssetType;

  const {isUploading, transferState, uploadProgress} = useAssetTransfer(message);

  const {name, extension, size} = getFileAssetMetadata({asset, transferState});

  const {isLoading, isError} = getFileAssetStatus({uploadProgress, transferState});

  if (isFileShareRestricted) {
    return <FileAssetRestricted />;
  }

  if (isError) {
    return <FileAssetCard extension={extension} name={name} size={size} isError />;
  }

  if (isLoading) {
    return (
      <FileAssetCard
        extension={extension}
        name={name}
        size={size}
        isLoading
        // eslint-disable-next-line no-magic-numbers
        loadingProgress={isUploading ? uploadProgress : 100}
      />
    );
  }

  return <FileAssetCard extension={extension} name={name} size={size} />;
};
