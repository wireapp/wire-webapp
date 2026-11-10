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

import {getCookieExpiration, retrieveCookie} from './cookie';

import {Cookie} from '../../auth/cookie';
import {CookieStore} from '../../auth/cookieStore';

describe('getCookieExpiration', () => {
  it.each([null, 'Infinity'] as const)('represents %s expiration as Infinity', expires => {
    const expiration = getCookieExpiration(expires);

    expect(expiration).toBe('Infinity');
  });

  it('preserves an explicit expiration date', () => {
    const expirationDate = new Date('2038-01-19T03:14:07.000Z');

    expect(getCookieExpiration(expirationDate)).toBe(expirationDate.toString());
  });
});

describe('retrieveCookie', () => {
  beforeEach(() => {
    CookieStore.deleteCookie();
  });

  afterEach(() => {
    CookieStore.deleteCookie();
  });

  function createResponse(cookieHeaders: readonly string[]): AxiosResponse<string> {
    return {
      config: {headers: new AxiosHeaders()},
      data: 'response-body',
      headers: {'set-cookie': [...cookieHeaders]},
      status: 200,
      statusText: 'OK',
    };
  }

  it.each(['zuid=session-value; Path=/access', 'zuid=session-value; Expires=invalid'])(
    'stores a usable session cookie from %s and returns the response body',
    async cookieHeader => {
      const responseBody = await retrieveCookie(createResponse([cookieHeader]));
      const storedCookie = CookieStore.getCookie();

      expect(responseBody).toBe('response-body');
      expect(storedCookie?.zuid).toBe('session-value');
      expect(storedCookie?.expiration).toBe('Infinity');
      expect(storedCookie?.isExpired).toBe(false);
    },
  );

  it('preserves a persistent cookie expiration', async () => {
    await retrieveCookie(createResponse(['zuid=persistent-value; Expires=Tue, 19 Jan 2038 03:14:07 GMT']));

    expect(CookieStore.getCookie()?.expiration).toBe(new Date('2038-01-19T03:14:07.000Z').toString());
    expect(CookieStore.getCookie()?.zuid).toBe('persistent-value');
  });

  it('ignores malformed cookie headers', async () => {
    const responseBody = await retrieveCookie(createResponse(['']));

    expect(responseBody).toBe('response-body');
    expect(CookieStore.getCookie()).toBeUndefined();
  });

  it('leaves the stored cookie unchanged when no cookies are returned', async () => {
    const existingCookie = new Cookie('existing-value', 'Infinity');
    CookieStore.setCookie(existingCookie);
    const response = createResponse([]);
    response.headers = {};

    expect(await retrieveCookie(response)).toBe('response-body');
    expect(CookieStore.getCookie()).toBe(existingCookie);
  });
});
