/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {v4 as uuidv4} from 'uuid';

import {APIClient} from '@wireapp/api-client';

import {AssetService} from './AssetService';

describe('AssetService', () => {
  describe('"uploadAsset"', () => {
    let apiClient: APIClient;

    afterEach(() => {
      apiClient?.disconnect();
    });

    it('builds an encrypted asset payload', async () => {
      apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const assetServerData = {
        domain: 'asset-server.test.wire.com',
        key: `3-2-${uuidv4()}`,
        token: uuidv4(),
        expires: '',
      };

      jest.spyOn(apiClient.api.asset, 'postAsset').mockReturnValue({
        cancel: () => {},
        response: Promise.resolve(assetServerData),
      });

      const asset = await (await assetService.uploadAsset(Buffer.from([1, 2, 3]))).response;

      expect(asset).toEqual(
        expect.objectContaining({
          key: assetServerData.key,
          keyBytes: expect.any(Buffer),
          sha256: expect.any(Buffer),
          token: assetServerData.token,
        }),
      );
    });

    it('allows cancelling asset upload', async () => {
      apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const apiUpload = {
        cancel: jest.fn(),
        response: Promise.resolve({} as any),
      };

      jest.spyOn(apiClient.api.asset, 'postAsset').mockReturnValue(apiUpload);

      const asset = await assetService.uploadAsset(Buffer.from([1, 2, 3]));
      asset.cancel();
      expect(apiUpload.cancel).toHaveBeenCalled();
    });

    it('exposes upload progress', async () => {
      apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const apiUpload = {
        cancel: jest.fn(),
        response: Promise.resolve({} as any),
      };

      jest.spyOn(apiClient.api.asset, 'postAsset').mockImplementation((_asset, _options, progressCallback) => {
        progressCallback?.(1);
        return apiUpload;
      });

      const onProgress = jest.fn();
      await assetService.uploadAsset(Buffer.from([1, 2, 3]), {}, onProgress);
      expect(onProgress).toHaveBeenCalledWith(1);
    });
  });
});
