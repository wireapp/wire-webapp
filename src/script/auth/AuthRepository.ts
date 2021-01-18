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

import type {Context} from '@wireapp/api-client/src/auth';
import {ClientType} from '@wireapp/api-client/src/client';
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import {StorageKey} from '../storage/StorageKey';
import {APIClient} from '../service/APIClientSingleton';

export class AuthRepository {
  private readonly logger: Logger;

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

  constructor(private readonly apiClient = container.resolve(APIClient)) {
    this.logger = getLogger('AuthRepository');
  }

  init(): Promise<Context> {
    const persist = loadValue(StorageKey.AUTH.PERSIST);
    const clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
    return this.apiClient.init(clientType);
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.auth.api.postLogout();
      return this.logger.info('Log out on backend successful');
    } catch (error) {
      return this.logger.warn(`Log out on backend failed: ${error.message}`, error);
    }
  }
}
