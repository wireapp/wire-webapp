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

import type {FileAsset as FileAssetType} from 'src/script/entity/message/FileAsset';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

interface UseVideoMetadataParams {
  asset: FileAssetType;
}

export const useVideoMetadata = ({asset}: UseVideoMetadataParams) => {
  const name = trimFileExtension(asset.file_name);
  const extension = getFileExtension(asset.file_name!);
  const size = formatBytes(asset.file_size);
  const type = asset.file_type || '';
  const duration = asset?.meta?.duration ?? 0;

  return {
    name,
    extension,
    size,
    type,
    duration,
  };
};
