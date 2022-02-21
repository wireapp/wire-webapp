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

import {APIClient} from '@wireapp/api-client';
import UUID from 'uuidjs';
import {AssetService} from './AssetService';

describe('AssetService', () => {
  describe('"uploadAsset"', () => {
    it('builds an encrypted asset payload', async () => {
      const apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const assetServerData = {
        key: `3-2-${UUID.genV4().toString()}`,
        token: UUID.genV4().toString(),
        expires: '',
      };

      spyOn(apiClient.api.asset, 'postAsset').and.returnValue({
        cancel: () => {},
        response: Promise.resolve(assetServerData),
      });

      const asset = await (await assetService.uploadAsset(Buffer.from([1, 2, 3]))).response;

      expect(asset).toEqual(
        jasmine.objectContaining({
          key: assetServerData.key,
          keyBytes: jasmine.any(Buffer),
          sha256: jasmine.any(Buffer),
          token: assetServerData.token,
        }),
      );
    });

    it('allows cancelling asset upload', async () => {
      const apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const apiUpload = {
        cancel: jasmine.createSpy(),
        response: Promise.resolve({} as any),
      };

      spyOn(apiClient.api.asset, 'postAsset').and.returnValue(apiUpload);

      const asset = await assetService.uploadAsset(Buffer.from([1, 2, 3]));
      asset.cancel();
      expect(apiUpload.cancel).toHaveBeenCalled();
    });

    it('exposes upload progress', async () => {
      const apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const apiUpload = {
        cancel: jasmine.createSpy(),
        response: Promise.resolve({} as any),
      };

      spyOn(apiClient.api.asset, 'postAsset').and.callFake((_asset, _options, progressCallback) => {
        progressCallback?.(1);
        return apiUpload;
      });

      const onProgress = jasmine.createSpy();
      await assetService.uploadAsset(Buffer.from([1, 2, 3]), {}, onProgress);
      expect(onProgress).toHaveBeenCalledWith(1);
    });
  });
});
