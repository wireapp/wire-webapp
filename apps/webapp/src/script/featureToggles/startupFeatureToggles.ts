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
export type {StartupFeatureToggleName} from './startupFeatureToggleNames';

export const startupFeatureToggleQueryParameterName = 'enabled-features';

export const allowedStartupFeatureToggleNames = startupFeatureToggleNames;

const allowedStartupFeatureToggleNameSet = new Set<StartupFeatureToggleName>(allowedStartupFeatureToggleNames);

export type StartupFeatureToggles = {
  readonly isFeatureToggleEnabled: (featureToggleName: StartupFeatureToggleName) => boolean;
  readonly getEnabledFeatureToggleNames: () => readonly StartupFeatureToggleName[];
};

function trimFeatureToggleName(featureToggleName: string): string {
  return featureToggleName.trim();
}

function isNonEmptyFeatureToggleName(featureToggleName: string): boolean {
  return featureToggleName.length > 0;
}

function isAllowedStartupFeatureToggleName(featureToggleName: string): featureToggleName is StartupFeatureToggleName {
  return allowedStartupFeatureToggleNameSet.has(featureToggleName as StartupFeatureToggleName);
}

function toEnabledFeatureToggleNameList(serializedFeatureToggleNames: string): readonly StartupFeatureToggleName[] {
  return serializedFeatureToggleNames
    .split(',')
    .map(trimFeatureToggleName)
    .filter(isNonEmptyFeatureToggleName)
    .filter(isAllowedStartupFeatureToggleName);
}

function readEnabledFeatureToggleNameListFromLocationSearch(
  locationSearch: string,
): readonly StartupFeatureToggleName[] {
  const queryParameters = new URLSearchParams(locationSearch);
  const enabledFeatureTogglesParameterValue = queryParameters.get(startupFeatureToggleQueryParameterName);

  return Maybe.of(enabledFeatureTogglesParameterValue).map(toEnabledFeatureToggleNameList).unwrapOr([]);
}

export function createStartupFeatureTogglesFromLocationSearch(locationSearch: string): StartupFeatureToggles {
  const enabledFeatureToggleNameSet = new Set<StartupFeatureToggleName>(
    readEnabledFeatureToggleNameListFromLocationSearch(locationSearch),
  );

  return {
    isFeatureToggleEnabled: function isFeatureToggleEnabled(featureToggleName: StartupFeatureToggleName): boolean {
      return enabledFeatureToggleNameSet.has(featureToggleName);
    },

    getEnabledFeatureToggleNames: function getEnabledFeatureToggleNames(): readonly StartupFeatureToggleName[] {
      return [...enabledFeatureToggleNameSet];
    },
  };
}
