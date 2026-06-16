/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {APIClient} from '../apiClient';
import {Config, MINIMUM_API_VERSION} from '../config';

describe('MeetingsAPI', () => {
  const testConfig: Config = {urls: {rest: 'https://test.zinfra.io', ws: '', name: 'test'}};

  it('sends meeting requests through the versioned HTTP client', async () => {
    const client = new APIClient(testConfig);
    jest.spyOn(client.transport.http, 'sendRequest').mockResolvedValue({
      data: {supported: [MINIMUM_API_VERSION, 16], domain: 'test.zinfra.io'},
    } as never);

    await client.useVersion(MINIMUM_API_VERSION, 16);

    const sendJSONSpy = jest.spyOn(client.transport.http, 'sendJSON').mockResolvedValue({data: []} as never);

    await client.api.meetings.getMeetingsList();

    expect(client.transport.http.getBaseUrl()).toBe('https://test.zinfra.io/v16');
    expect(sendJSONSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/meetings/list',
      }),
    );
  });
});
