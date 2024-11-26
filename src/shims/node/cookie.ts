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

import {AxiosHeaders, AxiosRequestConfig, AxiosResponse} from 'axios';
import {Cookie as ToughCookie} from 'tough-cookie';

import {LogFactory} from '@wireapp/commons';

import {Cookie} from '../../auth/';
import {CookieStore} from '../../auth/CookieStore';
import {HttpClient} from '../../http/';
import {ObfuscationUtil} from '../../obfuscation/';

const logger = LogFactory.getLogger('@wireapp/api-client/shims/node/cookie');

export const retrieveCookie = async <T>(response: AxiosResponse<T>): Promise<T> => {
  if (response.headers?.['set-cookie']) {
    const cookies: ToughCookie[] = response.headers['set-cookie'].flatMap(cookieString => {
      const cookie = ToughCookie.parse(cookieString);
      return cookie ? [cookie] : [];
    });
    for (const cookie of cookies) {
      const cookieString = cookie.expires.toString();
      CookieStore.setCookie(new Cookie(cookie.value, cookieString));
      logger.info(
        `Saved internal cookie. It will expire on "${cookieString}".`,
        ObfuscationUtil.obfuscateCookie(cookie),
      );
    }
  }

  return response.data;
};

/**
 * @see https://github.com/wearezeta/backend-api-docs/wiki/API-User-Authentication#token-refresh
 */
export const sendRequestWithCookie = async <T>(
  client: HttpClient,
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const cookie = CookieStore.getCookie();
  if (cookie && !cookie.isExpired) {
    config.headers = new AxiosHeaders(config.headers as AxiosHeaders);
    config.headers.set('Cookie', `zuid=${cookie.zuid}`);
    config.withCredentials = true;
  }
  return client._sendRequest<T>({config});
};
