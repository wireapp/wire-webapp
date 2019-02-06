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

const uploadQueue = ko.observableArray();

export default class AssetUploader {
  constructor(assetService) {
    this.assetService = assetService;
  }

  /**
   * Starts uploading an asset.
   *
   * Will also keep track of this upload
   * @param {string} messageId - id of the message the asset belongs to
   * @param {Blob} file - file to upload
   * @param {Object} options - upload options
   * @returns {Promise<Asset>} Promise that resolves when the upload is done
   */
  uploadAsset(messageId, file, options) {
    return this.assetService
      .uploadAsset(file, options, xhr => {
        const progressObservable = ko.observable(0);
        uploadQueue.push({messageId, progress: progressObservable, xhr});
        xhr.upload.onprogress = event => {
          const progress = (event.loaded / event.total) * 100;
          progressObservable(progress);
        };
      })
      .then(asset => {
        this._removeFromQueue(messageId);
        return asset;
      });
  }

  /**
   * Cancels an upload in progress
   *
   * @param {string} messageId - id the the message the asset belongs to
   * @returns {void} nothing
   */
  cancelUpload(messageId) {
    const uploadStatus = this._findUploadStatus(messageId);
    if (uploadStatus) {
      uploadStatus.xhr.abort();
      this._removeFromQueue(messageId);
    }
  }

  /**
   * Returns the number of current uploads that are tracked
   *
   * @returns {number} the number of uploads
   */
  getNumberOfOngoingUploads() {
    return uploadQueue().length;
  }

  /**
   * Get the current upload progress of an asset depending on the message id the asset belongs to.
   *
   * @param {string} messageId - the id of the message to which the asset belongs to
   * @returns {Observable} an observable that contains the upload progress
   */
  getUploadProgress(messageId) {
    return ko.pureComputed(() => {
      const uploadStatus = this._findUploadStatus(messageId);
      return uploadStatus ? uploadStatus.progress() : -1;
    });
  }

  _findUploadStatus(messageId) {
    return uploadQueue().find(upload => upload.messageId === messageId);
  }

  _removeFromQueue(messageId) {
    uploadQueue(uploadQueue().filter(upload => upload.messageId !== messageId));
  }
}
