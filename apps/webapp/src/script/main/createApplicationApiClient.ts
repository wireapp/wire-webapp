/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {Clock} from '@enormora/clock/clock';

import {websocketListenerLifecycleFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import type {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';
import type {Logger} from '../logger/getLogger';
import {APIClient} from '../service/apiClientSingleton';

type CreateApplicationApiClientOptions = {
  readonly clock: Clock;
  readonly startupFeatureToggles: StartupFeatureToggles;
  readonly logger: Pick<Logger, 'info'>;
};

export function createApplicationApiClient(options: CreateApplicationApiClientOptions): APIClient {
  const {clock, startupFeatureToggles, logger} = options;
  const implementation = startupFeatureToggles.isFeatureToggleEnabled(websocketListenerLifecycleFeatureToggleName)
    ? 'corrected'
    : 'legacy';
  const apiClient = new APIClient({clock, webSocketLifecycleImplementation: implementation});
  logger.info('WebSocket lifecycle initialized', {
    subsystem: 'websocket-lifecycle',
    event: 'websocket-lifecycle-initialized',
    implementation,
  });

  return apiClient;
}
