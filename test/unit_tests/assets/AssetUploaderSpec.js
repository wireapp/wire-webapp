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

import {container} from 'tsyringe';
import UUID from 'uuidjs';

import {AssetUploader} from 'src/script/assets/AssetUploader';
import {AssetService} from 'src/script/assets/AssetService';
import {APIClientSingleton} from 'src/script/service/APIClientSingleton';
import {BackendClient} from 'src/script/service/BackendClient';

const messageId = UUID.genV4().hexString;
const file = new Blob();
const options = {};

describe('AssetsUploader', () => {
  const assetUploader = new AssetUploader(
    new AssetService(container.resolve(APIClientSingleton), container.resolve(BackendClient)),
  );
  it('starts uploading when given an asset message', () => {
    spyOn(assetUploader.assetService, 'uploadAsset').and.returnValue(Promise.resolve());
    assetUploader.uploadAsset(messageId, file, options);

    expect(assetUploader.assetService.uploadAsset).toHaveBeenCalledWith(file, options, jasmine.any(Function));
  });

  it('keeps track of current uploads', () => {
    const xhr = {upload: {}};
    spyOn(assetUploader.assetService, 'uploadAsset').and.callFake((fileParam, optionsParam, callback) => {
      callback(xhr);
      return Promise.resolve();
    });

    assetUploader.uploadAsset(messageId, file, options);

    expect(assetUploader.getNumberOfOngoingUploads()).toBe(1);
    expect(xhr.upload.onprogress).toBeDefined();
  });

  it('removes finished uploads', () => {
    const xhr = {upload: {}};
    spyOn(assetUploader.assetService, 'uploadAsset').and.callFake((fileParam, optionsParam, callback) => {
      callback(xhr);
      return new Promise(resolve => setTimeout(resolve));
    });

    const uploadPromise = assetUploader.uploadAsset(messageId, file, options);

    expect(assetUploader.getNumberOfOngoingUploads()).toBe(1);

    return uploadPromise.then(() => {
      expect(assetUploader.getNumberOfOngoingUploads()).toBe(0);
    });
  });

  it('removes cancelled uploads and cancels upload', () => {
    const xhr = {abort: () => {}, upload: {}};
    spyOn(xhr, 'abort');
    spyOn(assetUploader.assetService, 'uploadAsset').and.callFake((fileParam, optionsParam, callback) => {
      callback(xhr);
      return new Promise(() => {});
    });

    assetUploader.uploadAsset(messageId, file, options);

    expect(assetUploader.getNumberOfOngoingUploads()).toBe(1);

    assetUploader.cancelUpload(messageId);

    expect(assetUploader.getNumberOfOngoingUploads()).toBe(0);
    expect(xhr.abort).toHaveBeenCalled();
  });

  it('updates the upload progress while the file is being uploaded', () => {
    const xhr = {abort: () => {}, upload: {}};
    spyOn(assetUploader.assetService, 'uploadAsset').and.callFake((fileParam, optionsParam, callback) => {
      callback(xhr);
      return new Promise(() => {});
    });
    const uploadStates = [
      {expected: 10, loaded: 10, total: 100},
      {expected: 50, loaded: 50, total: 100},
      {expected: 100, loaded: 100, total: 100},
    ];

    assetUploader.uploadAsset(messageId, file, options);
    const uploadProgress = assetUploader.getUploadProgress(messageId);

    uploadStates.forEach(({loaded, total, expected}) => {
      xhr.upload.onprogress({loaded, total});

      expect(uploadProgress()).toBe(expected);
    });
  });
});
