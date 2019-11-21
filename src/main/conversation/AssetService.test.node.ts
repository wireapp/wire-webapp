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
import {MemoryEngine} from '@wireapp/store-engine';
import UUID from 'pure-uuid';
import {Account} from '../Account';

describe('AssetService', () => {
  let account: Account;

  beforeAll(async () => {
    const client = new APIClient({urls: APIClient.BACKEND.STAGING});
    account = new Account(client);
    await account.init(new MemoryEngine());
  });

  describe('"uploadImageAsset"', () => {
    it('builds an encrypted asset payload', async () => {
      const assetServerData = {
        key: `3-2-${new UUID(4).format()}`,
        keyBytes: Buffer.from(new UUID(4).format()),
        sha256: new UUID(4).format(),
        token: new UUID(4).format(),
      };

      const assetService = account.service!.conversation['assetService'];
      const image = {
        data: Buffer.from([1, 2, 3]),
        height: 600,
        type: 'image/png',
        width: 600,
      };

      spyOn<any>(assetService, 'postAsset').and.returnValue(Promise.resolve(assetServerData));

      const asset = await assetService.uploadImageAsset(image);

      expect(asset).toEqual(
        jasmine.objectContaining({
          key: assetServerData.key,
          keyBytes: assetServerData.keyBytes,
          sha256: assetServerData.sha256,
          token: assetServerData.token,
        }),
      );
    });
  });
});
