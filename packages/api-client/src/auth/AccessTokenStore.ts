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

import logdown from 'logdown';

import {EventEmitter} from 'events';

import {AccessTokenData} from '../auth/';

enum TOPIC {
  ACCESS_TOKEN_REFRESH = 'AccessTokenStore.TOPIC.ACCESS_TOKEN_REFRESH',
}

export interface AccessTokenStore {
  on(event: TOPIC.ACCESS_TOKEN_REFRESH, listener: (accessToken: AccessTokenData) => void): this;
}

export class AccessTokenStore extends EventEmitter {
  private readonly logger: logdown.Logger;

  public static readonly TOPIC = TOPIC;
  public accessToken?: AccessTokenData;
  /**
   * The date at which the token will be invalid. This value should be use with a grain of salt as there might be some time shift between browser and server time
   * It is suggested to add an error margin
   */
  public tokenExpirationDate?: number;

  constructor() {
    super();

    this.logger = logdown('@wireapp/api-client/AccessTokenStore', {
      logger: console,
      markdown: false,
    });
  }

  public async delete(): Promise<void> {
    this.logger.log('Deleting local access token');
    this.accessToken = undefined;
    this.tokenExpirationDate = undefined;
  }

  public async updateToken(accessToken: AccessTokenData): Promise<AccessTokenData> {
    if (this.accessToken !== accessToken) {
      this.logger.log('Saving local access token');
      this.tokenExpirationDate = Date.now() + accessToken.expires_in * 1000;
      this.accessToken = accessToken;
      this.emit(AccessTokenStore.TOPIC.ACCESS_TOKEN_REFRESH, this.accessToken);
    }
    return this.accessToken;
  }
}
