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

export const startupFeatureFlagQueryParameterName = 'enabled-features';

export const allowedStartupFeatureFlagNames = ['reliable-websocket-connection'] as const;

export type StartupFeatureFlagName = (typeof allowedStartupFeatureFlagNames)[number];

const allowedStartupFeatureFlagNameSet = new Set<StartupFeatureFlagName>(allowedStartupFeatureFlagNames);

export type StartupFeatureFlagMap = Readonly<Partial<Record<StartupFeatureFlagName, true>>>;

function trimFeatureFlagName(featureName: string): string {
  return featureName.trim();
}

function isNonEmptyFeatureFlagName(featureName: string): boolean {
  return featureName.length > 0;
}

function isAllowedStartupFeatureFlagName(featureName: string): featureName is StartupFeatureFlagName {
  return allowedStartupFeatureFlagNameSet.has(featureName as StartupFeatureFlagName);
}

function toEnabledFeatureNameList(serializedFeatureNames: string): readonly StartupFeatureFlagName[] {
  return serializedFeatureNames
    .split(',')
    .map(trimFeatureFlagName)
    .filter(isNonEmptyFeatureFlagName)
    .filter(isAllowedStartupFeatureFlagName);
}

function readEnabledFeatureNameListFromLocationSearch(locationSearch: string): readonly StartupFeatureFlagName[] {
  const queryParameters = new URLSearchParams(Maybe.of(locationSearch).unwrapOr(''));
  const enabledFeaturesParameterValue = queryParameters.get(startupFeatureFlagQueryParameterName);
  const enabledFeatureNameListOrNull =
    enabledFeaturesParameterValue === null ? null : toEnabledFeatureNameList(enabledFeaturesParameterValue);

  return Maybe.of(enabledFeatureNameListOrNull).unwrapOr([]);
}

export function createStartupFeatureFlagMapFromLocationSearch(locationSearch: string): StartupFeatureFlagMap {
  const enabledFeatureFlagMap = readEnabledFeatureNameListFromLocationSearch(locationSearch).reduce<
    Partial<Record<StartupFeatureFlagName, true>>
  >((featureFlagMap, featureName) => {
    featureFlagMap[featureName] = true;

    return featureFlagMap;
  }, {});

  return Object.freeze(enabledFeatureFlagMap);
}

export function isStartupFeatureFlagEnabled(
  featureFlagMap: StartupFeatureFlagMap,
  featureName: StartupFeatureFlagName,
): boolean {
  return Maybe.of(featureFlagMap[featureName]).isJust;
}
