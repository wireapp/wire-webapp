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
import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';

import {AssetService} from '../../assets/AssetService';
import {AssetTransferState} from '../../assets/AssetTransferState';
import {AssetUploader} from '../../assets/AssetUploader';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {File as FileAsset} from '../../entity/message/File';
import {APIClientSingleton} from '../../service/APIClientSingleton';
import {BackendClient} from '../../service/BackendClient';

export abstract class AbstractAssetTransferStateTracker {
  AssetTransferState: typeof AssetTransferState;
  assetUploader: AssetUploader;
  transferState: ko.PureComputed<AssetTransferState>;
  uploadProgress: ko.PureComputed<number>;

  constructor(message?: ContentMessage) {
    this.assetUploader = new AssetUploader(
      new AssetService(container.resolve(APIClientSingleton).getClient(), container.resolve(BackendClient)),
    );
    this.uploadProgress = this.assetUploader.getUploadProgress(message?.id);
    this.AssetTransferState = AssetTransferState;

    this.transferState = ko.pureComputed(() => {
      const asset = message?.get_first_asset() as FileAsset;
      return this.uploadProgress() > -1 ? AssetTransferState.UPLOADING : asset?.status();
    });
  }

  isDownloading(transferState: AssetTransferState): boolean {
    return transferState === AssetTransferState.DOWNLOADING;
  }

  isUploading(transferState: AssetTransferState): boolean {
    return transferState === AssetTransferState.UPLOADING;
  }

  isUploaded(transferState: AssetTransferState): boolean {
    return transferState === AssetTransferState.UPLOADED;
  }

  cancelUpload(message: ContentMessage): void {
    this.assetUploader.cancelUpload(message.id);
    amplify.publish(WebAppEvents.CONVERSATION.ASSET.CANCEL, message.id);
  }
}
