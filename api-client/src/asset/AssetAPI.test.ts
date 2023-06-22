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

    await apiClient.api.asset.getAssetV3(assetId, assetToken);

    expect(apiClient.transport.http.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          asset_token: assetToken,
        },
        url: expect.stringMatching(new RegExp(assetId)),
      }),
      true,
    );
  });

  it('removes token parameters', async () => {
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

    await apiClient.api.asset.getAssetV3(assetId);

    expect(apiClient.transport.http.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {},
        url: expect.stringMatching(new RegExp(assetId)),
      }),
      true,
    );
  });
});
