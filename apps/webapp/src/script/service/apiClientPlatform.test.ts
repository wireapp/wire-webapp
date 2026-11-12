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

import {APIClient} from '../apiClient/apiClient';
import {AccessTokenData} from '../apiClient/auth/accessTokenData';
import {Cookie} from '../apiClient/auth/cookie';
import {CookieStore} from '../apiClient/auth/cookieStore';
import {ClientType} from '../apiClient/client/clientType';
import {browserPlatform} from '../apiClient/shims/browser/platform';

const {AxiosHeaders} = jest.requireActual<typeof import('axios')>('axios');

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const contents = reader.result;
      if (contents instanceof ArrayBuffer) {
        resolve(contents);
      } else {
        reject(new Error('Expected binary Blob contents'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read Blob'));
    };
    reader.readAsArrayBuffer(blob);
  });
}

describe('browser API-client platform', () => {
  afterEach(() => {
    CookieStore.deleteCookie();
    jest.restoreAllMocks();
  });

  it('provides the browser WebSocket constructor', () => {
    expect(browserPlatform.websocket.WebSocket).toBe(window.WebSocket);
  });

  it('preserves binary message string conversion rather than decoding UTF-8', () => {
    const messageBytes = new Uint8Array([195, 169]);

    expect(browserPlatform.websocket.bufferToString(messageBytes.buffer)).toBe('\u00c3\u00a9');
  });

  it('computes the existing base64 MD5 checksum', () => {
    const assetBytes = new Uint8Array([8, 8]);

    expect(browserPlatform.buffer.base64MD5FromBuffer(assetBytes.buffer)).toBe('w+7NCDwPSCf1JgWbA7deTA==');
  });

  it('assembles multipart bytes in a browser Blob', async () => {
    const assetBytes = new Uint8Array([0, 128, 255]);
    const multipartBody = browserPlatform.buffer.concatToBuffer('header\r\n', assetBytes, '\r\nfooter');

    expect(multipartBody).toBeInstanceOf(Blob);
    if (multipartBody instanceof Blob === false) {
      throw new Error('Expected a browser Blob for multipart uploads');
    }

    const actualBytes = new Uint8Array(await readBlob(multipartBody));
    const expectedBytes = new Uint8Array([
      104, 101, 97, 100, 101, 114, 13, 10, 0, 128, 255, 13, 10, 102, 111, 111, 116, 101, 114,
    ]);

    expect(actualBytes).toEqual(expectedBytes);
  });

  it('uses browser cookie handling for login, token refresh, and logout', async () => {
    using client = new APIClient({platform: browserPlatform});
    const existingCookie = new Cookie('node-session', 'Infinity');
    CookieStore.setCookie(existingCookie);
    const accessToken: AccessTokenData = {
      access_token: 'access-token',
      expires_in: 900,
      token_type: 'Bearer',
      user: 'user-id',
    };
    const response = {
      config: {headers: new AxiosHeaders()},
      data: accessToken,
      headers: {'set-cookie': ['zuid=replacement-session; Path=/access']},
      status: 200,
      statusText: 'OK',
    };
    jest.spyOn(client.transport.http, 'sendJSON').mockResolvedValue(response);
    const sendRequest = jest.spyOn(client.transport.http, '_sendRequest').mockResolvedValue(response);

    const loginToken = await client.api.auth.postLogin({
      clientType: ClientType.PERMANENT,
      email: 'person@example.test',
      password: 'test-password',
    });
    const refreshedToken = await client.transport.http.postAccess();
    await client.api.auth.postLogout();

    expect(loginToken).toBe(accessToken);
    expect(refreshedToken).toBe(accessToken);
    expect(CookieStore.getCookie()).toBe(existingCookie);
    expect(sendRequest).toHaveBeenCalledTimes(2);
    expect(sendRequest).toHaveBeenNthCalledWith(1, {
      config: expect.objectContaining({url: '/access', headers: {}, withCredentials: true}),
    });
    expect(sendRequest).toHaveBeenNthCalledWith(2, {
      config: expect.objectContaining({url: '/access/logout', withCredentials: true}),
    });
    for (const [request] of sendRequest.mock.calls) {
      const headerNames = Object.keys(request.config.headers ?? {}).map(headerName => {
        return headerName.toLowerCase();
      });

      expect(headerNames).not.toContain('cookie');
    }
  });
});
