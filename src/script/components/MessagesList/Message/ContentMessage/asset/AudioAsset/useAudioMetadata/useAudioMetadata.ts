/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useMemo} from 'react';

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import {t} from 'Util/LocalizerUtil';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

interface AudioMetadataParams {
  asset: FileAsset;
  transferState: AssetTransferState;
}

export const useAudioMetadata = ({asset, transferState}: AudioMetadataParams) => {
  const name = trimFileExtension(asset.file_name);
  const extension = getFileExtension(asset.file_name!);
  const size = formatBytes(asset.file_size);
  const duration = asset?.meta?.duration ?? 0;
  const loudnessPreview = !!(asset.meta?.loudness?.length ?? 0 > 0);

  const formattedName = useMemo(() => {
    const transferNames = {
      [AssetTransferState.UPLOAD_PENDING]: t('conversationAudioAssetUploading', {name}),
      [AssetTransferState.UPLOAD_FAILED]: t('conversationAudioAssetUploadFailed', {name}),
    };
    return transferNames[transferState as keyof typeof transferNames] ?? name;
  }, [name, transferState]);

  return {
    name: formattedName,
    extension,
    size,
    duration,
    loudnessPreview,
  };
};
