/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {AssetUploadData} from '@wireapp/api-client/lib/asset/';
import {container} from 'tsyringe';

import {createUuid} from 'Util/uuid';

import {AssetRemoteData} from './AssetRemoteData';
import {AssetRepository, AssetUploadOptions} from './AssetRepository';

import {Core} from '../../service/CoreSingleton';

describe('AssetRepository', () => {
  let assetRepository: AssetRepository;
  const messageId = createUuid();
  const file = new Blob();
  const options = {} as AssetUploadOptions;
  let isAuditLogEnabled: boolean = false;
  let core: Core;

  beforeEach(async () => {
    core = container.resolve(Core);
    assetRepository = new AssetRepository(core);
  });

  describe('load unencrypted v1 asset', () => {
    let remote_data: AssetRemoteData;

    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(() => {
      const conversation_id = createUuid();
      const asset_id = createUuid();
      remote_data = AssetRemoteData.v1(conversation_id, asset_id);
      jest.spyOn(assetRepository as any, 'loadBuffer').mockReturnValue({
        response: Promise.resolve({buffer: video_bytes.buffer, mimeType: video_type}),
      });
    });

    it('should load and decrypt v1 asset', async () => {
      const blob = await assetRepository.load(remote_data);
      expect<void | Blob>(new Blob([video_bytes], {type: video_type})).toEqual(blob);
    });
  });

  describe('load encrypted v2 asset', () => {
    let remote_data: AssetRemoteData;
    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(async () => {
      const cipherText = new Uint8Array();
      const keyBytes = new Uint8Array();
      const sha256 = new Uint8Array();
      const conversation_id = createUuid();
      const asset_id = createUuid();
      remote_data = AssetRemoteData.v2(conversation_id, asset_id, new Uint8Array(keyBytes), new Uint8Array(sha256));
      jest.spyOn(assetRepository as any, 'loadBuffer').mockReturnValue({
        response: Promise.resolve({buffer: cipherText, mimeType: video_type}),
      });
    });

    it('should load and decrypt v2 asset', async () => {
      const blob = await assetRepository.load(remote_data);
      expect<void | Blob>(new Blob([video_bytes], {type: video_type})).toEqual(blob);
    });
  });

  it('keeps track of current uploads and removes it once finished', async () => {
    spyOn(core.service!.asset, 'uploadAsset').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    await assetRepository.uploadFile(file, messageId, options, isAuditLogEnabled);
    expect(assetRepository.getNumberOfOngoingUploads()).toBe(0);
  });

  it('removes cancelled uploads and cancels upload', () => {
    spyOn(core.service!.asset, 'uploadAsset').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    const uploadedPromise = assetRepository.uploadFile(file, messageId, options, isAuditLogEnabled);

    assetRepository.cancelUpload(messageId);
    expect(assetRepository.getNumberOfOngoingUploads()).toBe(0);
    return uploadedPromise;
  });

  it('updates the upload progress while the file is being uploaded', async () => {
    spyOn(core.service!.asset, 'uploadAsset').and.callFake((_asset, _options, callback) => {
      const uploadProgress = assetRepository.getUploadProgress(messageId);

      callback(0.1);
      expect(uploadProgress()).toBe(10);

      callback(0.5);
      expect(uploadProgress()).toBe(50);

      callback(1);
      expect(uploadProgress()).toBe(100);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });
    await assetRepository.uploadFile(file, messageId, options, isAuditLogEnabled);
  });

  it('uploads assets with audit log enabled when specified if required metadata is present', async () => {
    isAuditLogEnabled = true;
    const assetAuditData = {
      convId: {domain: 'domain', id: 'id'},
      filename: 'filename',
      filetype: 'filetype',
    };
    options.auditData = assetAuditData;
    const uploadAssetSpy = spyOn(core.service!.asset, 'uploadAsset').and.callFake(() => {
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    await expect(assetRepository.uploadFile(file, messageId, options, isAuditLogEnabled)).resolves.toBeDefined();
    expect(uploadAssetSpy).toHaveBeenCalled();
  });

  it('does not upload asset when audit log is enabled and required metadata is missing', async () => {
    isAuditLogEnabled = true;
    const assetAuditData = {
      convId: {domain: 'domain', id: 'id'},
      filename: 'filename',
      filetype: '',
    };
    options.auditData = assetAuditData;

    const uploadAssetSpy = spyOn(core.service!.asset, 'uploadAsset').and.callFake(() => {
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });
    await expect(assetRepository.uploadFile(file, messageId, options, isAuditLogEnabled)).rejects.toThrow();
    expect(uploadAssetSpy).not.toHaveBeenCalled();
  });
});
