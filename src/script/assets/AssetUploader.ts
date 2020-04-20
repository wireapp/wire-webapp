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
import {Asset} from '@wireapp/protocol-messaging';
import {AssetService, AssetUploadOptions} from './AssetService';

export interface UploadStatus {
  messageId: string;
  progress: ko.Observable<number>;
  xhr: XMLHttpRequest;
}

const uploadQueue: ko.ObservableArray<UploadStatus> = ko.observableArray();

export class AssetUploader {
  private readonly assetService: AssetService;

  constructor(assetService: AssetService) {
    this.assetService = assetService;
  }

  uploadAsset(messageId: string, file: Blob, options: AssetUploadOptions, asImage: boolean): Promise<Asset> {
    const uploadFunction = asImage ? this.assetService.uploadImageAsset : this.assetService.uploadAsset;

    return uploadFunction
      .call(this.assetService, file, options, (xhr: XMLHttpRequest) => {
        const progressObservable: ko.Observable<number> = ko.observable(0);
        uploadQueue.push({messageId, progress: progressObservable, xhr});
        xhr.upload.onprogress = event => {
          const progress = (event.loaded / event.total) * 100;
          progressObservable(progress);
        };
      })
      .then((asset: Asset) => {
        this._removeFromQueue(messageId);
        return asset;
      });
  }

  cancelUpload(messageId: string): void {
    const uploadStatus = this._findUploadStatus(messageId);
    if (uploadStatus) {
      uploadStatus.xhr.abort();
      this._removeFromQueue(messageId);
    }
  }

  getNumberOfOngoingUploads(): number {
    return uploadQueue().length;
  }

  getUploadProgress(messageId: string): ko.PureComputed<number> {
    return ko.pureComputed(() => {
      const uploadStatus = this._findUploadStatus(messageId);
      return uploadStatus ? uploadStatus.progress() : -1;
    });
  }

  _findUploadStatus(messageId: string): UploadStatus {
    return uploadQueue().find(upload => upload.messageId === messageId);
  }

  _removeFromQueue(messageId: string): void {
    uploadQueue(uploadQueue().filter(upload => upload.messageId !== messageId));
  }
}
