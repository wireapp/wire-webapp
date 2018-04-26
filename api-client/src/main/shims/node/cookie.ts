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

import {AccessTokenData, AUTH_COOKIE_KEY, AUTH_TABLE_NAME, Cookie} from '../../auth';
import {AxiosPromise, AxiosRequestConfig, AxiosResponse} from 'axios';
import {Cookie as ToughCookie} from 'tough-cookie';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {error as StoreEngineError} from '@wireapp/store-engine';
import {HttpClient} from '../../http';

const COOKIE_NAME: string = 'zuid';

type PersistedCookie = {
  expiration: string;
  zuid: string;
};

const loadExistingCookie = async (engine: CRUDEngine): Promise<Cookie> => {
  return engine
    .read<PersistedCookie>(AUTH_TABLE_NAME, AUTH_COOKIE_KEY)
    .catch(error => {
      if (error instanceof StoreEngineError.RecordNotFoundError) {
        return new Cookie('', '0');
      }

      throw error;
    })
    .then((fileContent: PersistedCookie) => {
      return typeof fileContent === 'object'
        ? new Cookie(fileContent.zuid, fileContent.expiration)
        : new Cookie('', '0');
    });
};

const setInternalCookie = (cookie: Cookie, engine: CRUDEngine): Promise<string> => {
  const entity: PersistedCookie = {expiration: cookie.expiration, zuid: cookie.zuid};
  return engine.create(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity).catch(error => {
    if (error instanceof StoreEngineError.RecordAlreadyExistsError) {
      return engine.update(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
    } else {
      throw error;
    }
  });
};

export const retrieveCookie = async (response: AxiosResponse, engine: CRUDEngine): Promise<AccessTokenData> => {
  if (response.headers && response.headers['set-cookie']) {
    const cookies = response.headers['set-cookie'].map(ToughCookie.parse);
    for (const cookie of cookies) {
      // Don't store the cookie if persist=false (doesn't have an expiration time set by the server)
      if (cookie.key === COOKIE_NAME && String(cookie.expires) !== 'Infinity') {
        await setInternalCookie(new Cookie(cookie.value, cookie.expires), engine);
        break;
      }
    }
  }

  return response.data;
};

// https://github.com/wearezeta/backend-api-docs/wiki/API-User-Authentication#token-refresh
export const sendRequestWithCookie = (
  client: HttpClient,
  config: AxiosRequestConfig,
  engine: CRUDEngine
): AxiosPromise => {
  return loadExistingCookie(engine).then((cookie: Cookie) => {
    if (!cookie.isExpired) {
      config.headers = config.headers || {};
      config.headers['Cookie'] = `zuid=${cookie.zuid}`;
      config.withCredentials = true;
    }

    return client._sendRequest(config);
  });
};
