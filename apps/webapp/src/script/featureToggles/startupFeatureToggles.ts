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

export const startupFeatureToggleLocalStorageKey = 'startup-feature-toggles';

export const allowedStartupFeatureToggleNames = startupFeatureToggleNames;

type StartupFeatureToggleLocalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const allowedStartupFeatureToggleNameSet = new Set<StartupFeatureToggleName>(allowedStartupFeatureToggleNames);

export type StartupFeatureToggles = {
  readonly isFeatureToggleEnabled: (featureToggleName: StartupFeatureToggleName) => boolean;
  readonly enabledFeatureToggleNames: readonly StartupFeatureToggleName[];
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

function hasStartupFeatureToggleQueryParameter(locationSearch: string): boolean {
  return new URLSearchParams(locationSearch).has(startupFeatureToggleQueryParameterName);
}

function readEnabledFeatureToggleNameListFromLocalStorage(
  localStorage: StartupFeatureToggleLocalStorage,
): readonly StartupFeatureToggleName[] {
  return Maybe.of(localStorage.getItem(startupFeatureToggleLocalStorageKey))
    .map(toEnabledFeatureToggleNameList)
    .unwrapOr([]);
}

export function persistEnabledFeatureToggleNamesInLocalStorage(
  enabledFeatureToggleNames: readonly StartupFeatureToggleName[],
  localStorage: StartupFeatureToggleLocalStorage,
): void {
  if (enabledFeatureToggleNames.length === 0) {
    localStorage.removeItem(startupFeatureToggleLocalStorageKey);
    return;
  }

  localStorage.setItem(startupFeatureToggleLocalStorageKey, enabledFeatureToggleNames.join(','));
}

function readEnabledFeatureToggleNameList(
  locationSearch: string,
  localStorage: StartupFeatureToggleLocalStorage | undefined,
): readonly StartupFeatureToggleName[] {
  if (hasStartupFeatureToggleQueryParameter(locationSearch)) {
    return readEnabledFeatureToggleNameListFromLocationSearch(locationSearch);
  }

  if (localStorage !== undefined) {
    return readEnabledFeatureToggleNameListFromLocalStorage(localStorage);
  }

  return [];
}

/**
 * Creates the startup feature toggles for the application boot.
 *
 * The URL query parameter is the source of truth whenever it is present:
 * - If `enabled-features` is in the URL, its value is used and synced to local storage.
 * - If the parameter is missing and local storage is provided, the previously persisted
 *   toggles are used so they survive page reloads and in-app navigation.
 * - If neither is available, all toggles are disabled.
 */
export function createStartupFeatureTogglesFromLocationSearch(
  locationSearch: string,
  localStorage?: StartupFeatureToggleLocalStorage,
): StartupFeatureToggles {
  const enabledFeatureToggleNames = readEnabledFeatureToggleNameList(locationSearch, localStorage);

  if (localStorage !== undefined) {
    persistEnabledFeatureToggleNamesInLocalStorage(enabledFeatureToggleNames, localStorage);
  }

  const enabledFeatureToggleNameSet = new Set<StartupFeatureToggleName>(enabledFeatureToggleNames);

  return {
    isFeatureToggleEnabled(featureToggleName) {
      return enabledFeatureToggleNameSet.has(featureToggleName);
    },

    get enabledFeatureToggleNames() {
      return [...enabledFeatureToggleNameSet];
    },
  };
}
