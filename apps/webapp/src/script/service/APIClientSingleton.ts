/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {singleton} from 'tsyringe';

import {APIClient as APIClientUnconfigured} from '@wireapp/api-client';

import {Config} from '../Config';

const wireClientHeaderName = 'Wire-Client';
const wireClientVersionHeaderName = 'Wire-Client-Version';
const wireClientIdentifier = 'Web';

type RetryBackoffResettableHttpClient = {
  readonly resetRetryBackoff: () => void;
};

@singleton()
export class APIClient extends APIClientUnconfigured {
  constructor() {
    const webAppConfiguration = Config.getConfig();

    const unconfiguredApiClientConfiguration = {
      headers: {
        [wireClientHeaderName]: wireClientIdentifier,
        [wireClientVersionHeaderName]: webAppConfiguration.VERSION,
      },
      urls: {
        name: webAppConfiguration.ENVIRONMENT,
        rest: webAppConfiguration.BACKEND_REST,
        ws: webAppConfiguration.BACKEND_WS,
      },
    };

    super(unconfiguredApiClientConfiguration);
  }

  public resetIncrementalRetryBackoff(): void {
    const retryBackoffResettableHttpClient = this.transport.http as unknown as RetryBackoffResettableHttpClient;

    retryBackoffResettableHttpClient.resetRetryBackoff();
  }
}
