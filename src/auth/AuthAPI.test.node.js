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

const {APIClient} = require('@wireapp/api-client');
const {ClientType} = require('@wireapp/api-client/dist/client/');

describe('AuthAPI', () => {
  const apiClient = new APIClient();

  it('sets the client to permanent', async () => {
    const data = {
      clientType: ClientType.PERMANENT,
      email: 'email@example.com',
      password: 'email@example.com',
    };

    spyOn(apiClient.transport.http, 'sendJSON').and.returnValue(Promise.resolve({data: ''}));

    await apiClient.auth.api.postLogin(data);

    expect(apiClient.transport.http.sendJSON).toHaveBeenCalledWith(
      jasmine.objectContaining({
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

    spyOn(apiClient.transport.http, 'sendJSON').and.returnValue(Promise.resolve({data: ''}));

    await apiClient.auth.api.postLogin(data);

    expect(apiClient.transport.http.sendJSON).toHaveBeenCalledWith(
      jasmine.objectContaining({
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
