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
import ko from 'knockout';
import {amplify} from 'amplify';

import {AssetTransferState} from '../../assets/AssetTransferState';
import {resolve, graph} from '../../config/appResolver';
import {WebAppEvents} from '../../event/WebApp';
import {AssetUploader} from '../../assets/AssetUploader';
import {AssetService} from '../../assets/AssetService';

export class AbstractAssetTransferStateTracker {
  constructor(message = {}) {
    this.assetUploader = new AssetUploader(new AssetService(resolve(graph.BackendClient)));
    this.uploadProgress = this.assetUploader.getUploadProgress(message.id);
    this.AssetTransferState = AssetTransferState;

    this.transferState = ko.pureComputed(() => {
      const asset = message.get_first_asset();
      return this.uploadProgress() > -1 ? AssetTransferState.UPLOADING : asset.status();
    });
  }

  isDownloading(transferState) {
    return transferState === AssetTransferState.DOWNLOADING;
  }

  isUploading(transferState) {
    return transferState === AssetTransferState.UPLOADING;
  }

  isUploaded(transferState) {
    return transferState === AssetTransferState.UPLOADED;
  }

  cancelUpload(message) {
    this.assetUploader.cancelUpload(message.id);
    amplify.publish(WebAppEvents.CONVERSATION.ASSET.CANCEL, message.id);
  }
}
