/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {container} from 'tsyringe';

import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

export type AssetUrl = {
  url: string;
  dispose: () => void;
};

export const useAssetTransfer = (message?: ContentMessage, assetRepository = container.resolve(AssetRepository)) => {
  const asset = message?.getFirstAsset() as FileAsset;
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    if (!message) {
      return () => {};
    }
    const progressSubscribable = assetRepository.getUploadProgress(message?.id);
    setUploadProgress(progressSubscribable());
    const subscription = progressSubscribable.subscribe(value => setUploadProgress(value));
    return () => {
      subscription.dispose();
    };
  }, [assetRepository, message]);

  const {status} = useKoSubscribableChildren(asset, ['status']);
  const transferState = uploadProgress > -1 ? AssetTransferState.UPLOADING : status;

  return {
    cancelUpload: () => message && assetRepository.cancelUpload(message?.id),
    downloadAsset: (asset: FileAsset) => assetRepository.downloadFile(asset),
    isDownloading: transferState === AssetTransferState.DOWNLOADING,
    isPendingUpload: transferState === AssetTransferState.UPLOAD_PENDING,
    isUploaded: transferState === AssetTransferState.UPLOADED,
    isUploading: transferState === AssetTransferState.UPLOADING,
    getAssetUrl: async (resource: AssetRemoteData, acceptedMimeTypes?: string[]): Promise<AssetUrl> => {
      const blob = await assetRepository.load(resource);
      if (!blob) {
        throw new Error(`Asset could not be loaded`);
      }
      if (acceptedMimeTypes && !acceptedMimeTypes?.includes(blob.type)) {
        throw new Error(`Mime type not accepted "${blob.type}"`);
      }
      const url = URL.createObjectURL(blob);
      return {
        dispose: () => URL.revokeObjectURL(url),
        url,
      };
    },
    transferState,
    uploadProgress,
  };
};
