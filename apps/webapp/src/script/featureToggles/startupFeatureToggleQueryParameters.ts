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

import {Maybe} from 'true-myth';

import {StartupFeatureToggleName, startupFeatureToggleNames} from './startupFeatureToggleNames';
import {
  createStartupFeatureTogglesFromLocationSearch,
  startupFeatureToggleQueryParameterName,
} from './startupFeatureToggles';

type UpdateStartupFeatureToggleLocationSearchInput = {
  readonly locationSearch: string;
  readonly featureToggleName: StartupFeatureToggleName;
  readonly shouldEnableFeatureToggle: boolean;
};

function toOrderedEnabledFeatureToggleNames(
  enabledFeatureToggleNameSet: ReadonlySet<StartupFeatureToggleName>,
): readonly StartupFeatureToggleName[] {
  return startupFeatureToggleNames.filter(featureToggleName => {
    return enabledFeatureToggleNameSet.has(featureToggleName);
  });
}

function readEnabledFeatureToggleNameSetFromLocationSearch(
  locationSearch: string,
): ReadonlySet<StartupFeatureToggleName> {
  const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(locationSearch);
  return new Set(startupFeatureToggles.enabledFeatureToggleNames);
}

function toUpdatedEnabledFeatureToggleNameSet(
  enabledFeatureToggleNameSet: ReadonlySet<StartupFeatureToggleName>,
  featureToggleName: StartupFeatureToggleName,
  shouldEnableFeatureToggle: boolean,
): ReadonlySet<StartupFeatureToggleName> {
  const updatedEnabledFeatureToggleNameSet = new Set(enabledFeatureToggleNameSet);

  if (shouldEnableFeatureToggle) {
    updatedEnabledFeatureToggleNameSet.add(featureToggleName);
  } else {
    updatedEnabledFeatureToggleNameSet.delete(featureToggleName);
  }

  return updatedEnabledFeatureToggleNameSet;
}

function serializeEnabledFeatureToggleNames(
  enabledFeatureToggleNameSet: ReadonlySet<StartupFeatureToggleName>,
): Maybe<string> {
  const orderedEnabledFeatureToggleNames = toOrderedEnabledFeatureToggleNames(enabledFeatureToggleNameSet);

  if (orderedEnabledFeatureToggleNames.length === 0) {
    return Maybe.nothing<string>();
  }

  return Maybe.just(orderedEnabledFeatureToggleNames.join(','));
}

export function updateLocationSearchForStartupFeatureToggle(
  input: UpdateStartupFeatureToggleLocationSearchInput,
): string {
  const {locationSearch, featureToggleName, shouldEnableFeatureToggle} = input;
  const enabledFeatureToggleNameSet = readEnabledFeatureToggleNameSetFromLocationSearch(locationSearch);
  const updatedEnabledFeatureToggleNameSet = toUpdatedEnabledFeatureToggleNameSet(
    enabledFeatureToggleNameSet,
    featureToggleName,
    shouldEnableFeatureToggle,
  );

  const queryParameters = new URLSearchParams(locationSearch);
  const serializedEnabledFeatureToggleNames = serializeEnabledFeatureToggleNames(updatedEnabledFeatureToggleNameSet);

  if (serializedEnabledFeatureToggleNames.isNothing) {
    queryParameters.delete(startupFeatureToggleQueryParameterName);
  } else {
    queryParameters.set(startupFeatureToggleQueryParameterName, serializedEnabledFeatureToggleNames.value);
  }

  const serializedQueryParameters = queryParameters.toString();
  return Maybe.of(serializedQueryParameters)
    .andThen((queryParameterString): Maybe<string> => {
      if (queryParameterString.length === 0) {
        return Maybe.nothing<string>();
      }

      return Maybe.just(queryParameterString);
    })
    .map((queryParameterString): string => {
      return `?${queryParameterString}`;
    })
    .unwrapOr('');
}
