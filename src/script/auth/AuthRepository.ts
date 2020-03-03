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

import {AccessTokenData, Context, LoginData} from '@wireapp/api-client/dist/auth';
import {Logger, getLogger} from 'Util/Logger';
import {APIClient} from '@wireapp/api-client';
import {loadValue, resetStoreValue, storeValue} from 'Util/StorageUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {ClientType} from '../client/ClientType';
import {StorageKey} from '../storage/StorageKey';

export class AuthRepository {
  private readonly apiClient: APIClient;
  private readonly logger: Logger;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      REFRESH_THRESHOLD: TIME_IN_MILLIS.MINUTE,
    };
  }

  static get ACCESS_TOKEN_TRIGGER(): {
    IMMEDIATE: string;
    SCHEDULED: string;
    TEAMS_REGISTRATION: string;
    UNAUTHORIZED_REQUEST: string;
    WEB_SOCKET: string;
  } {
    return {
      IMMEDIATE: 'AuthRepository.ACCESS_TOKEN_TRIGGER.IMMEDIATE',
      SCHEDULED: 'AuthRepository.ACCESS_TOKEN_TRIGGER.SCHEDULED',
      TEAMS_REGISTRATION: 'AuthRepository.ACCESS_TOKEN_TRIGGER.TEAMS_REGISTRATION',
      UNAUTHORIZED_REQUEST: 'AuthRepository.ACCESS_TOKEN_TRIGGER.UNAUTHORIZED_REQUEST',
      WEB_SOCKET: 'AuthRepository.ACCESS_TOKEN_TRIGGER.WEB_SOCKET',
    };
  }

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
    this.logger = getLogger('AuthRepository');
  }

  login(login: LoginData, persist: boolean): Promise<AccessTokenData> {
    return this.apiClient.auth.api
      .postLogin({...login, clientType: persist ? ClientType.PERMANENT : ClientType.TEMPORARY})
      .then(accessTokenResponse => {
        storeValue(StorageKey.AUTH.PERSIST, persist);
        storeValue(StorageKey.AUTH.SHOW_LOGIN, true);
        return accessTokenResponse;
      });
  }

  init(): Promise<Context> {
    const persist = loadValue(StorageKey.AUTH.PERSIST);
    const clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
    return this.apiClient.init(clientType);
  }

  logout(): Promise<void> {
    return this.apiClient.auth.api
      .postLogout()
      .then(() => this.logger.info('Log out on backend successful'))
      .catch(error => this.logger.warn(`Log out on backend failed: ${error.message}`, error));
  }

  deleteAccessToken(): void {
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.VALUE);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.TTL);
    resetStoreValue(StorageKey.AUTH.ACCESS_TOKEN.TYPE);
  }
}
