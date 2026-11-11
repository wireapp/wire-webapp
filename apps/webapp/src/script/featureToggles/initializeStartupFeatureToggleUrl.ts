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

import {isEmptyArray} from '@sindresorhus/is';

import {StartupFeatureToggleName} from './startupFeatureToggleNames';
import {startupFeatureToggleQueryParameterName} from './startupFeatureToggles';

type InitializeStartupFeatureToggleUrlOptions = {
  readonly url: URL;
  readonly defaultEnabledFeatureToggleNames: readonly StartupFeatureToggleName[];
  readonly replaceUrl: (url: string) => void;
};

export function initializeStartupFeatureToggleUrl(options: InitializeStartupFeatureToggleUrlOptions): void {
  const {url, defaultEnabledFeatureToggleNames, replaceUrl} = options;

  if (url.searchParams.has(startupFeatureToggleQueryParameterName) || isEmptyArray(defaultEnabledFeatureToggleNames)) {
    return;
  }

  const initializedUrl = new URL(url.href);
  initializedUrl.searchParams.set(startupFeatureToggleQueryParameterName, defaultEnabledFeatureToggleNames.join(','));
  replaceUrl(initializedUrl.href);
}
