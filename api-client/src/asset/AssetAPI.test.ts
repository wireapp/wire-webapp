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

import {APIClient} from '../APIClient';
import {StatusCode} from '../http';

describe('"AssetAPI"', () => {
  const apiClient = new APIClient();

  it('adds token parameters', async () => {
    await apiClient.useVersion(4, 5);
    jest.spyOn(apiClient.transport.http, 'sendRequest').mockReturnValue(
      Promise.resolve({
        config: {},
        data: '',
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
      }),
    );
    const assetId = 'my-asset-id';
    const assetToken = 'my-asset-token';

    let errorMessage;
    try {
      await apiClient.api.asset.getAssetV3(assetId, assetToken);
    } catch (error) {
      errorMessage = error.message;
    } finally {
      expect(errorMessage).toContain('Asset v3 is not supported on backend');
    }
  });
});
