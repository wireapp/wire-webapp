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

    // Mock the asset service
    core.service = {
      asset: {
        uploadAsset: jest.fn(),
        downloadAsset: jest.fn(),
        downloadRawAsset: jest.fn(),
      },
    } as any;

    assetRepository = new AssetRepository(core);
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
      conversationId: {domain: 'domain', id: 'id'},
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
      conversationId: {domain: 'domain', id: 'id'},
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

  it('loads an encrypted asset and returns a blob', async () => {
    const mockBuffer = new ArrayBuffer(8);
    const mockMimeType = 'image/png';
    const otrKey = new Uint8Array([1, 2, 3, 4]);
    const sha256 = new Uint8Array([5, 6, 7, 8]);

    const mockAsset = {
      identifier: 'test-asset-id',
      otrKey,
      sha256,
      urlData: {key: 'test-key', token: 'test-token'},
      updateProgress: jest.fn(),
      cancelDownload: null as (() => void) | null,
    };

    spyOn(core.service!.asset, 'downloadAsset').and.returnValue({
      cancel: jest.fn(),
      response: Promise.resolve({buffer: mockBuffer, mimeType: mockMimeType}),
    });

    const result = await assetRepository.load(mockAsset as any);

    expect(core.service!.asset.downloadAsset).toHaveBeenCalledWith(
      mockAsset.urlData,
      otrKey,
      sha256,
      jasmine.any(Function),
    );
    expect(result).toBeInstanceOf(Blob);
    expect(result?.type).toBe(mockMimeType);
  });

  it('loads an unencrypted asset and returns a blob', async () => {
    const mockBuffer = new ArrayBuffer(8);
    const mockMimeType = 'application/pdf';

    const mockAsset = {
      identifier: 'test-asset-id',
      otrKey: undefined as Uint8Array | undefined,
      sha256: undefined as Uint8Array | undefined,
      urlData: {key: 'test-key', token: 'test-token'},
      updateProgress: jest.fn(),
      cancelDownload: null as (() => void) | null,
    };

    spyOn(core.service!.asset, 'downloadRawAsset').and.returnValue({
      cancel: jest.fn(),
      response: Promise.resolve({buffer: mockBuffer, mimeType: mockMimeType}),
    });

    const result = await assetRepository.load(mockAsset as any);

    expect(core.service!.asset.downloadRawAsset).toHaveBeenCalledWith(mockAsset.urlData, jasmine.any(Function));
    expect(result).toBeInstanceOf(Blob);
    expect(result?.type).toBe(mockMimeType);
  });

  it('returns undefined when asset loading fails with 404', async () => {
    const mockAsset = {
      identifier: 'test-asset-id',
      otrKey: new Uint8Array([1, 2, 3, 4]),
      sha256: new Uint8Array([5, 6, 7, 8]),
      urlData: {key: 'test-key', token: 'test-token'},
      updateProgress: jest.fn(),
      cancelDownload: null as (() => void) | null,
    };

    spyOn(core.service!.asset, 'downloadAsset').and.returnValue({
      cancel: jest.fn(),
      response: Promise.reject(new Error('Asset not found: 404')),
    });

    const result = await assetRepository.load(mockAsset as any);

    expect(result).toBeUndefined();
  });
});
