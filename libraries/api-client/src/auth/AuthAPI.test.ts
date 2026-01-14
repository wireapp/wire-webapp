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
import {ClientType} from '../client/ClientType';
import {StatusCode} from '../http';

describe('AuthAPI', () => {
  const apiClient = new APIClient();

  afterAll(() => {
    apiClient.disconnect();
  });

  it('sets the client to permanent', async () => {
    const data = {
      clientType: ClientType.PERMANENT,
      email: 'email@example.com',
      password: 'email@example.com',
    };

    jest.spyOn(apiClient.transport.http, 'sendJSON').mockReturnValue(
      Promise.resolve({
        config: {},
        data: '',
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
      }),
    );

    await apiClient.api.auth.postLogin(data);

    expect(apiClient.transport.http.sendJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          clientType: undefined,
          email: data.email,
          password: data.password,
        },
        params: {
          persist: true,
        },
      }),
    );
  });

  it('sets the client to temporary', async () => {
    const data = {
      clientType: ClientType.TEMPORARY,
      email: 'email@example.com',
      password: 'email@example.com',
    };

    jest.spyOn(apiClient.transport.http, 'sendJSON').mockReturnValue(
      Promise.resolve({
        config: {},
        data: '',
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
      }),
    );

    await apiClient.api.auth.postLogin(data);

    expect(apiClient.transport.http.sendJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          clientType: undefined,
          email: data.email,
          password: data.password,
        },
        params: {
          persist: false,
        },
      }),
    );
  });
});
