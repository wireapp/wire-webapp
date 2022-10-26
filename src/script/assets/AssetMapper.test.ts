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

import {UserAsset as APIClientUserAsset, UserAssetType} from '@wireapp/api-client/lib/user/';

import * as AssetMapper from './AssetMapper';

describe('AssetMapper', () => {
  describe('mapProfileAssets', () => {
    it('creates asset entities out of raw asset data', () => {
      const userId = {domain: 'domain', id: 'user-id'};
      const previewPictureId = '3-1-e705c3f5-7b4b-4136-a09b-01614cb355a1';
      const completePictureId = '3-1-d22e106a-3632-4280-8367-c14943e2eca2';
      const assets: APIClientUserAsset[] = [
        {
          key: previewPictureId,
          size: UserAssetType.PREVIEW,
          type: 'image',
        },
        {
          key: completePictureId,
          size: UserAssetType.COMPLETE,
          type: 'image',
        },
      ];

      const mappedAssets = AssetMapper.mapProfileAssets(userId, assets);

      expect(mappedAssets.medium['identifier']).toBe(completePictureId);
      expect(mappedAssets.preview['identifier']).toBe(previewPictureId);
    });
  });
});
