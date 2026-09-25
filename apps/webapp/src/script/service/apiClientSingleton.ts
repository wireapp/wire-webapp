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

import {createClock, type Clock, type IntervalIdentifier, type TimeoutIdentifier} from '@enormora/clock/clock';
import type {ReconnectingWebsocketWallClock} from '@wireapp/api-client/lib/tcp';
import {singleton} from 'tsyringe';

import {APIClient as APIClientUnconfigured} from '@wireapp/api-client';

import {Config} from '../Config';

const wireClientHeaderName = 'Wire-Client';
const wireClientVersionHeaderName = 'Wire-Client-Version';
const wireClientIdentifier = 'Web';

type APIClientProperties = {
  readonly clock?: Clock;
};

type RetryBackoffResettableHttpClient = {
  readonly resetRetryBackoff: () => void;
};

@singleton()
export class APIClient extends APIClientUnconfigured {
  constructor({clock = createClock()}: APIClientProperties = {}) {
    const webAppConfiguration = Config.getConfig();
    const apiClientClock: ReconnectingWebsocketWallClock = {
      get currentTimestampInMilliseconds() {
        return clock.currentUnixEpochMilliseconds;
      },
      setTimeout: (callback, delayInMilliseconds) => {
        return clock.setTimeout(callback, delayInMilliseconds) as unknown as ReturnType<typeof globalThis.setTimeout>;
      },
      clearTimeout: timeoutIdentifier => {
        clock.clearTimeout(timeoutIdentifier as unknown as TimeoutIdentifier);
      },
      setInterval: (callback, delayInMilliseconds) => {
        return clock.setInterval(callback, delayInMilliseconds) as unknown as ReturnType<typeof globalThis.setInterval>;
      },
      clearInterval: intervalIdentifier => {
        clock.clearInterval(intervalIdentifier as unknown as IntervalIdentifier);
      },
    };

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
      wallClock: apiClientClock,
    };

    super(unconfiguredApiClientConfiguration);
  }

  public resetIncrementalRetryBackoff(): void {
    const retryBackoffResettableHttpClient = this.transport.http as unknown as RetryBackoffResettableHttpClient;

    retryBackoffResettableHttpClient.resetRetryBackoff();
  }
}
