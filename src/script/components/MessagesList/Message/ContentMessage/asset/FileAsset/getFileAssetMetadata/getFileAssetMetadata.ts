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

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import {t} from 'Util/LocalizerUtil';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

interface FileAssetMetadataParams {
  asset: FileAsset;
  transferState: AssetTransferState;
}

export const getFileAssetMetadata = ({asset, transferState}: FileAssetMetadataParams) => {
  const name = trimFileExtension(asset.file_name);
  const extension = getFileExtension(asset.file_name!);
  const size = formatBytes(asset.file_size);

  const transferNames = {
    [AssetTransferState.UPLOAD_PENDING]: t('conversationAssetUploadingV2', {name}),
    [AssetTransferState.UPLOAD_FAILED]: t('conversationAssetUploadFailedV2', {name}),
    [AssetTransferState.DOWNLOADING]: t('conversationAssetDownloadingV2', {name}),
    [AssetTransferState.DOWNLOAD_FAILED_DECRPYT]: t('conversationAssetFailedDecryptDownloadingV2'),
    [AssetTransferState.DOWNLOAD_FAILED_HASH]: t('conversationAssetFailedHashDownloadingV2'),
  };

  const formattedName = transferNames[transferState as keyof typeof transferNames] ?? name;

  return {
    name: formattedName,
    extension,
    size,
  };
};
