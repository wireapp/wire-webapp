/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';

import {getLogger} from 'Util/Logger';

const logger = getLogger('ConnectionQualityListener');

type ConnectionAPIType = NonNullable<typeof window.navigator.connection>;
type EffectiveConnectionType = ConnectionAPIType['effectiveType'];

const slowConnectionTypes: EffectiveConnectionType[] = ['slow-2g', '2g', '3g'];

interface ConnectionQualityHandler {
  refresh: (callback: (isSlow: boolean) => void) => void;
  subscribe: (callback: (isSlow: boolean) => void) => () => void;
}

export const getConnectionQualityHander = (): ConnectionQualityHandler | null => {
  const navigatorConnection = window.navigator?.connection;

  if (!navigatorConnection) {
    logger.warn('Listening for connection quality is disabled, navigator.connection is not supported by the browser');
    return null;
  }

  const isConnectionSlow = () => slowConnectionTypes.includes(navigatorConnection.effectiveType);

  const onChange = (callback: (isSlow: boolean) => void) => {
    const isSlow = isConnectionSlow();
    logger.info(`Current connection quality is: ${navigatorConnection.effectiveType}`);

    if (isSlow) {
      logger.warn('Connection is slow');
    }

    callback(isSlow);
  };

  const subscribe = (callback: (isSlow: boolean) => void) => {
    const handler = () => onChange(callback);

    // Check the connection quality immediately
    handler();

    // Refresh every 1 minute
    const tid = setInterval(handler, TimeInMillis.MINUTE);

    // Listen for changes
    navigatorConnection.addEventListener('change', handler);

    return () => {
      clearInterval(tid);
      navigatorConnection.removeEventListener('change', handler);
    };
  };

  return {
    refresh: (callback: (isSlow: boolean) => void) => onChange(callback),
    subscribe,
  };
};
