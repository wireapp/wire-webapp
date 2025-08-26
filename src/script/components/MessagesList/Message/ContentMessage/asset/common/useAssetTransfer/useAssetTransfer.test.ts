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

import {renderHook} from '@testing-library/react';
import ko from 'knockout';

import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {createUuid} from 'Util/uuid';

import {useAssetTransfer} from './useAssetTransfer';

const assetRepository = {
  getUploadProgress: jest.fn().mockReturnValue(ko.observable(0)),
  load: jest.fn().mockResolvedValue(new Blob([], {type: 'image/png'})),
} as unknown as jest.Mocked<AssetRepository>;

describe('useAssetTransfer', () => {
  const message = new ContentMessage(createUuid());
  const asset = new AssetRemoteData(createUuid(), {
    assetKey: 'assetKey',
    assetToken: 'assetToken',
    forceCaching: false,
    version: 3,
  });

  describe('getAssetUrl', () => {
    beforeAll(() => {
      jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('assetUrl');
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
  });
});
