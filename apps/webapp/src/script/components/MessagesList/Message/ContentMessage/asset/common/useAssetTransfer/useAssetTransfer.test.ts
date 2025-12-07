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

import {renderHook, waitFor} from '@testing-library/react';
import ko from 'knockout';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {createUuid} from 'Util/uuid';

import {useAssetTransfer} from './useAssetTransfer';

const assetRepository = {
  getUploadProgress: jest.fn().mockReturnValue(ko.pureComputed(() => 0)),
  load: jest.fn().mockResolvedValue(new Blob([], {type: 'image/png'})),
  cancelUpload: jest.fn(),
  downloadFile: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<AssetRepository>;

describe('useAssetTransfer', () => {
  const message = new ContentMessage(createUuid());
  const asset = new AssetRemoteData({
    assetKey: 'assetKey',
    assetDomain: 'domain',
    assetToken: 'assetToken',
    forceCaching: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    assetRepository.getUploadProgress.mockReturnValue(ko.pureComputed(() => 0));
    assetRepository.load.mockResolvedValue(new Blob([], {type: 'image/png'}));
  });

  describe('getAssetUrl', () => {
    beforeAll(() => {
      jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('assetUrl');
      jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    it('should return the asset url', async () => {
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      const assetUrl = await result.current.getAssetUrl(asset);
      expect(assetUrl).toEqual({url: 'assetUrl', dispose: expect.any(Function)});
    });

    it('should return the asset url with accepted mime types', async () => {
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      const assetUrl = await result.current.getAssetUrl(asset, ['image/png']);
      expect(assetUrl).toEqual({url: 'assetUrl', dispose: expect.any(Function)});
    });

    it('should throw an error if the asset could not be loaded', async () => {
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      assetRepository.load.mockResolvedValueOnce(undefined);
      await expect(result.current.getAssetUrl(asset)).rejects.toThrow('Asset could not be loaded');
    });

    it('should throw an error if the mime type is not accepted', async () => {
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      await expect(result.current.getAssetUrl(asset, ['image/jpeg'])).rejects.toThrow(
        'Mime type not accepted "image/png"',
      );
    });

    it('should revoke object URL when dispose is called', async () => {
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      const assetUrl = await result.current.getAssetUrl(asset);
      assetUrl.dispose();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('assetUrl');
    });
  });

  describe('upload progress', () => {
    it('should track upload progress changes', async () => {
      const progressObservable = ko.observable(0);
      const progressComputed = ko.pureComputed(() => progressObservable());
      assetRepository.getUploadProgress.mockReturnValue(progressComputed);

      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));

      expect(result.current.uploadProgress).toBe(0);

      progressObservable(50);
      await waitFor(() => {
        expect(result.current.uploadProgress).toBe(50);
      });

      progressObservable(100);
      await waitFor(() => {
        expect(result.current.uploadProgress).toBe(100);
      });
    });

    it('should indicate uploading state when upload progress is active', async () => {
      const progressObservable = ko.observable(50);
      const progressComputed = ko.pureComputed(() => progressObservable());
      assetRepository.getUploadProgress.mockReturnValue(progressComputed);

      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));

      await waitFor(() => {
        expect(result.current.isUploading).toBe(true);
      });
      expect(result.current.transferState).toBe(AssetTransferState.UPLOADING);
    });
  });

  describe('cancelUpload', () => {
    it('should call assetRepository.cancelUpload with message id', () => {
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      result.current.cancelUpload();
      expect(assetRepository.cancelUpload).toHaveBeenCalledWith(message.id);
    });

    it('should not throw when message is undefined', () => {
      const {result} = renderHook(() => useAssetTransfer(undefined, assetRepository));
      expect(() => result.current.cancelUpload()).not.toThrow();
    });
  });

  describe('downloadAsset', () => {
    it('should call assetRepository.downloadFile with the asset', async () => {
      const fileAsset = new FileAsset();
      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      await result.current.downloadAsset(fileAsset);
      expect(assetRepository.downloadFile).toHaveBeenCalledWith(fileAsset);
    });
  });

  describe('transfer state flags', () => {
    it('should indicate uploaded state', () => {
      const fileAsset = new FileAsset();
      fileAsset.status(AssetTransferState.UPLOADED);
      jest.spyOn(message, 'getFirstAsset').mockReturnValue(fileAsset);
      assetRepository.getUploadProgress.mockReturnValue(ko.pureComputed(() => -1));

      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      expect(result.current.isUploaded).toBe(true);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isDownloading).toBe(false);
    });

    it('should indicate downloading state', () => {
      const fileAsset = new FileAsset();
      fileAsset.status(AssetTransferState.DOWNLOADING);
      jest.spyOn(message, 'getFirstAsset').mockReturnValue(fileAsset);
      assetRepository.getUploadProgress.mockReturnValue(ko.pureComputed(() => -1));

      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      expect(result.current.isDownloading).toBe(true);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isUploaded).toBe(false);
    });

    it('should indicate pending upload state', () => {
      const fileAsset = new FileAsset();
      fileAsset.status(AssetTransferState.UPLOAD_PENDING);
      jest.spyOn(message, 'getFirstAsset').mockReturnValue(fileAsset);
      assetRepository.getUploadProgress.mockReturnValue(ko.pureComputed(() => -1));

      const {result} = renderHook(() => useAssetTransfer(message, assetRepository));
      expect(result.current.isPendingUpload).toBe(true);
      expect(result.current.isUploading).toBe(false);
    });
  });
});
