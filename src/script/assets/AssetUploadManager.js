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

//const logger = new z.util.Logger('AssetUploadManager', z.config.LOGGER.OPTIONS);

const uploadQueue = new Map();

export default class AssetUploadManager {
  constructor(assetService) {
    this.assetService = assetService;
  }

  startUpload(assetId, file, options) {
    return this.asset_service.uploadAsset(file, options, xhr => {
      uploadQueue.set(assetId, {progress: 0, xhr});
      xhr.upload.onprogress = event =>
        uploadQueue.set(assetId, {progress: Math.round((event.loaded / event.total) * 100), xhr});
    });
  }

  cancelUpload(assetId) {
    const upload = uploadQueue.get(assetId);
    if (upload) {
      upload.xhr.abort();
      uploadQueue.delete(assetId);
    }
  }
}
