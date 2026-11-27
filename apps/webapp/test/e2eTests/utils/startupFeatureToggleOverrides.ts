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

import {isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {
  StartupFeatureToggleName,
  startupFeatureToggleNames,
} from '../../../src/script/featureToggles/startupFeatureToggleNames';
import {updateLocationSearchForStartupFeatureToggle} from '../../../src/script/featureToggles/startupFeatureToggleQueryParameters';
import {startupFeatureToggleQueryParameterName} from '../../../src/script/featureToggles/startupFeatureToggles';

export type StartupFeatureToggleOverrides = Readonly<Partial<Record<StartupFeatureToggleName, boolean>>>;

export function applyStartupFeatureToggleOverridesToUrl(
  url: URL,
  overrides: Maybe<StartupFeatureToggleOverrides>,
): URL {
  return overrides.match({
    Nothing() {
      return new URL(url.toString());
    },
    Just(featureToggleOverrides) {
      const updatedUrl = new URL(url.toString());

      if (!updatedUrl.searchParams.has(startupFeatureToggleQueryParameterName)) {
        updatedUrl.searchParams.set(startupFeatureToggleQueryParameterName, '');
      }

      for (const featureToggleName of startupFeatureToggleNames) {
        const shouldEnableFeatureToggle = featureToggleOverrides[featureToggleName];
        if (isUndefined(shouldEnableFeatureToggle)) {
          continue;
        }

        updatedUrl.search = updateLocationSearchForStartupFeatureToggle({
          locationSearch: updatedUrl.search,
          featureToggleName,
          shouldEnableFeatureToggle,
        });
      }

      return updatedUrl;
    },
  });
}
