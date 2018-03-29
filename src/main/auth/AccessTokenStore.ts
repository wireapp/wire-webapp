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

const logdown = require('logdown');
import {AUTH_ACCESS_TOKEN_KEY, AUTH_TABLE_NAME, AccessTokenData} from '../auth';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error';
import EventEmitter = require('events');

class AccessTokenStore extends EventEmitter {
  private logger: any = logdown('@wireapp/api-client/AccessTokenStore', {
    logger: console,
    markdown: false,
  });

  public accessToken: AccessTokenData | undefined;

  public static TOPIC = {
    ACCESS_TOKEN_REFRESH: 'AccessTokenStore.TOPIC.ACCESS_TOKEN_REFRESH',
  };

  constructor(private engine: CRUDEngine) {
    super();
  }

  public async delete(): Promise<void> {
    this.logger.info(
      `Deleting access token in store "${
        this.engine.storeName
      }" on table "${AUTH_TABLE_NAME}" with key "${AUTH_ACCESS_TOKEN_KEY}"`
    );
    return this.engine.delete(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY).then(() => (this.accessToken = undefined));
  }

  public async updateToken(accessToken: AccessTokenData): Promise<AccessTokenData> {
    if (this.accessToken !== accessToken) {
      this.logger.info(
        `Updating access token in store "${
          this.engine.storeName
        }" on table "${AUTH_TABLE_NAME}" with key "${AUTH_ACCESS_TOKEN_KEY}"`
      );
      return this.engine
        .delete(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY)
        .then(() => this.engine.create(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY, accessToken))
        .then(() => (this.accessToken = accessToken));
    }
    return Promise.resolve(this.accessToken);
  }

  public async init(): Promise<AccessTokenData | undefined> {
    this.logger.info(
      `Initialising access token from store "${
        this.engine.storeName
      }" on table "${AUTH_TABLE_NAME}" with key "${AUTH_ACCESS_TOKEN_KEY}"`
    );
    return this.engine
      .read<AccessTokenData>(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY)
      .catch((error: Error) => {
        if (error.name === RecordNotFoundError.name) {
          return undefined;
        }

        throw error;
      })
      .then((accessToken: AccessTokenData | undefined) => (this.accessToken = accessToken));
  }
}

export {AccessTokenStore};
