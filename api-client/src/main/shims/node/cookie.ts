//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

import {AccessTokenData} from '../../auth';
import {AxiosPromise, AxiosRequestConfig, AxiosResponse} from 'axios';
import {Cookie} from 'tough-cookie';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {HttpClient} from '../../http';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error';

const COOKIE_PRIMARY_KEY: string = 'cookie';
const COOKIE_NAME: string = 'zuid';
const TABLE_NAME: string = 'authentication';

const loadExistingCookie = (engine: CRUDEngine): Promise<object> => {
  return engine
    .read(TABLE_NAME, COOKIE_PRIMARY_KEY)
    .catch(error => {
      if (error.name === RecordNotFoundError.name) {
        return {isExpired: true};
      }

      throw error;
    })
    .then((fileContent: {expiration: string; zuid: string}) => {
      return typeof fileContent === 'object'
        ? {
            isExpired: new Date() > new Date(fileContent.expiration),
            ...fileContent,
          }
        : {
            isExpired: true,
          };
    });
};

const setInternalCookie = (zuid: string, expiration: Date, engine: CRUDEngine): Promise<string> =>
  engine.create(TABLE_NAME, COOKIE_PRIMARY_KEY, {zuid, expiration});

export const retrieveCookie = (response: AxiosResponse, engine: CRUDEngine): Promise<AccessTokenData> => {
  if (response.headers && response.headers['set-cookie']) {
    const cookies = response.headers['set-cookie'].map(Cookie.parse);
    for (const cookie of cookies) {
      // Don't store the cookie if it's on persist=false (don't have an expiration time set by the server)
      if (cookie.key === COOKIE_NAME && String(cookie.expires) !== 'Infinity') {
        return setInternalCookie(cookie.value, cookie.expires, engine).then(() => response.data);
      }
    }
  }

  return Promise.resolve(response.data);
};

export const sendRequestWithCookie = (
  client: HttpClient,
  config: AxiosRequestConfig,
  engine: CRUDEngine
): AxiosPromise => {
  return loadExistingCookie(engine).then(({isExpired, zuid}: {isExpired: string; zuid: string}) => {
    if (!isExpired) {
      // https://github.com/wearezeta/backend-api-docs/wiki/API-User-Authentication#token-refresh
      config.headers = config.headers || {};
      config.headers['Cookie'] = `zuid=${zuid}`;
      config.withCredentials = true;
    }

    return client._sendRequest(config);
  });
};
