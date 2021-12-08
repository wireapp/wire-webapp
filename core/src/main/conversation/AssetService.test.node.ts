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
  describe('"uploadImageAsset"', () => {
    it('builds an encrypted asset payload', async () => {
      const apiClient = new APIClient();
      const assetService = new AssetService(apiClient);

      const assetServerData = {
        key: `3-2-${UUID.genV4().toString()}`,
        token: UUID.genV4().toString(),
        expires: '',
      };

      const image = {
        data: Buffer.from([1, 2, 3]),
        height: 600,
        type: 'image/png',
        width: 600,
      };

      spyOn(apiClient.asset.api, 'postAsset').and.returnValue(
        Promise.resolve({
          cancel: () => {},
          response: Promise.resolve(assetServerData),
        }),
      );

      const asset = await assetService.uploadImageAsset(image);

      expect(asset).toEqual(
        jasmine.objectContaining({
          key: assetServerData.key,
          keyBytes: jasmine.any(Buffer),
          sha256: jasmine.any(Buffer),
          token: assetServerData.token,
        }),
      );
    });
  });
});
