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

import {getWebEnvironment} from 'Util/Environment';

import {Config} from '../Config';

export function isCountlyEnabledAtCurrentEnvironment(): boolean {
  const {isDev, isEdge, isInternal, isLocalhost, isStaging} = getWebEnvironment();

  if (isDev || isEdge || isInternal || isLocalhost || isStaging) {
    return true;
  }

  const {COUNTLY_API_KEY, COUNTLY_ALLOWED_BACKEND, BACKEND_REST} = Config.getConfig();

  const allowedBackendUrls = COUNTLY_ALLOWED_BACKEND.split(',').map(url => url.trim()) || [];
  const isCountlyEnabled =
    !!COUNTLY_API_KEY && allowedBackendUrls.length > 0 && allowedBackendUrls.includes(BACKEND_REST);

  return isCountlyEnabled;
}
