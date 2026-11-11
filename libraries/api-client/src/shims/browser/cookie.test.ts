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

import {AxiosHeaders, AxiosResponse} from 'axios';
import nock from 'nock';

import {retrieveCookie, sendRequestWithCookie} from './cookie';

import {AccessTokenData} from '../../auth/accessTokenData';
import {AccessTokenStore} from '../../auth/accessTokenStore';
import {Cookie} from '../../auth/cookie';
import {CookieStore} from '../../auth/cookieStore';
import {HttpClient} from '../../http/httpClient';

describe('browser cookies', () => {
  afterEach(() => {
    CookieStore.deleteCookie();
    nock.cleanAll();
  });

  it('returns authentication tokens without reading response cookies into the Node cookie store', async () => {
    const existingCookie = new Cookie('existing-session', 'Infinity');
    CookieStore.setCookie(existingCookie);
    const accessToken: AccessTokenData = {
      access_token: 'access-token',
      expires_in: 900,
      token_type: 'Bearer',
      user: 'user-id',
    };
    const response: AxiosResponse<AccessTokenData> = {
      config: {headers: new AxiosHeaders()},
      data: accessToken,
      headers: {'set-cookie': ['zuid=replacement-session; Path=/access']},
      status: 200,
      statusText: 'OK',
    };

    const actualAccessToken = await retrieveCookie(response);

    expect(actualAccessToken).toBe(accessToken);
    expect(CookieStore.getCookie()).toBe(existingCookie);
  });

  it('preserves credentialed requests without adding a Cookie header from the Node cookie store', async () => {
    CookieStore.setCookie(new Cookie('node-session', 'Infinity'));
    const backendUrl = 'https://browser-cookie.example';
    const request = nock(backendUrl, {badheaders: ['Cookie']})
      .post('/access')
      .reply(200, {access_token: 'new-token'});
    const httpClient = new HttpClient({urls: {name: 'test', rest: backendUrl, ws: ''}}, new AccessTokenStore());

    const response = await sendRequestWithCookie<{access_token: string}>(httpClient, {
      method: 'post',
      url: '/access',
      withCredentials: true,
    });

    expect(response.data).toEqual({access_token: 'new-token'});
    expect(response.config.withCredentials).toBe(true);
    expect(request.isDone()).toBe(true);
  });
});
