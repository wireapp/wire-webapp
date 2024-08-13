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

import {Config} from '../Config';

let isCountlyEnabled: boolean | null = null;
export function isCountlyEnabledAtCurrentEnvironment(): boolean {
  if (isCountlyEnabled === null) {
    const allowedBackendUrls =
      Config.getConfig()
        .COUNTLY_ALLOWED_BACKEND?.split(',')
        .map(url => url.trim()) || [];

    isCountlyEnabled =
      !!Config.getConfig().COUNTLY_API_KEY &&
      allowedBackendUrls.length > 0 &&
      allowedBackendUrls.includes(Config.getConfig().BACKEND_REST);
  }
  return !!isCountlyEnabled;
}
