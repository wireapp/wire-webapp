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

import {
  isVideo,
  buildMetadataImage,
  buildMetadataVideo,
  isImage,
  isAudio,
  buildMetadataAudio,
} from 'Repositories/assets/AssetMetaDataBuilder';

export const buildCellFileMetadata = async (file: File) => {
  if (isImage(file)) {
    const imageMetadata = await buildMetadataImage(file);
    return {
      image: {
        width: imageMetadata.width,
        height: imageMetadata.height,
      },
    };
  }
  if (isVideo(file)) {
    const videoMetadata = await buildMetadataVideo(file);
    return {
      video: {
        width: videoMetadata.width,
        height: videoMetadata.height,
        durationInMillis: videoMetadata.durationInMillis,
      },
    };
  }
  if (isAudio(file)) {
    const audioMetadata = await buildMetadataAudio(file);
    return {
      audio: {
        durationInMillis: audioMetadata.durationInMillis,
        normalizedLoudness: audioMetadata.normalizedLoudness,
      },
    };
  }
  return Promise.resolve();
};
