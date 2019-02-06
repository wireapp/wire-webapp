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

import AssetUploader from '../../assets/AssetUploader';
import AssetTransferState from '../../assets/AssetTransferState';
import resolveDependency from '../../config/appResolver';

export default class AbstractAssetTransferStateTracker {
  constructor(message) {
    this.assetUploader = resolveDependency(AssetUploader);
    this.uploadProgress = this.assetUploader.getUploadProgress(message.id);
    this.AssetTransferState = AssetTransferState;

    this.transferState = ko.pureComputed(() => {
      const asset = message.get_first_asset();
      return this.uploadProgress() > -1 ? AssetTransferState.UPLOADING : asset.status();
    });
  }

  cancelUpload(message) {
    this.assetUploader.cancelUpload(message.id);
    amplify.publish(z.event.WebApp.CONVERSATION.ASSET.CANCEL, message.id);
  }
}
