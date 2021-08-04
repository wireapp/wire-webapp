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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';

import {AssetTransferState} from '../../assets/AssetTransferState';
import {AssetRepository} from '../../assets/AssetRepository';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {FileAsset} from '../../entity/message/FileAsset';
import {useMemo} from 'react';
import {useKoSubscribable, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';

export const useAssetTransfer = (message: ContentMessage, assetRepository = container.resolve(AssetRepository)) => {
  const asset = useMemo(() => message?.getFirstAsset() as FileAsset, [message]);
  const uploadProgressComputed = useMemo(() => assetRepository.getUploadProgress(message?.id), [message]);
  const uploadProgress = useKoSubscribable(uploadProgressComputed);
  const {status} = useKoSubscribableChildren(asset, ['status']);
  const transferState = uploadProgress > -1 ? AssetTransferState.UPLOADING : status;
  return {
    cancelUpload: () => {
      assetRepository.cancelUpload(message.id);
      amplify.publish(WebAppEvents.CONVERSATION.ASSET.CANCEL, message.id);
    },
    downloadAsset: (asset: FileAsset) => assetRepository.downloadFile(asset),
    isDownloading: transferState === AssetTransferState.DOWNLOADING,
    isUploaded: transferState === AssetTransferState.UPLOADED,
    isUploading: transferState === AssetTransferState.UPLOADING,
    loadAsset: (resource: AssetRemoteData) => assetRepository.load(resource),
    transferState,
    uploadProgress,
  };
};
