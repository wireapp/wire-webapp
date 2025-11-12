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

import {FeatureList, FEATURE_KEY, FEATURE_STATUS} from '@wireapp/api-client/lib/team';

export enum FeatureUpdateType {
  ENABLED = 'ENABLED', // Feature was enabled or didn't exist before and now it was added and is enabled
  DISABLED = 'DISABLED', // Feature was previously enabled and now it was removed or disabled
  CONFIG_CHANGED = 'CONFIG_CHANGED', // Feature was enabled and now it's config has changed
  UNCHANGED = 'UNCHANGED', // Feature is enabled or disabled or doesn't exist and it's config hasn't changed
}

type FeatureUpdateEnabled<Key extends FEATURE_KEY> = {
  type: FeatureUpdateType.ENABLED;
  prev?: FeatureList[Key];
  next: FeatureList[Key];
};

type FeatureUpdateDisabled<Key extends FEATURE_KEY> = {
  type: FeatureUpdateType.DISABLED;
  prev: FeatureList[Key];
  next?: FeatureList[Key];
};

type FeatureUpdateConfigChanged<Key extends FEATURE_KEY> = {
  type: FeatureUpdateType.CONFIG_CHANGED;
  prev: FeatureList[Key];
  next: NonNullable<FeatureList[Key]>;
};

type FeatureUpdateUnchanged<Key extends FEATURE_KEY> = {
  type: FeatureUpdateType.UNCHANGED;
  prev?: FeatureList[Key];
  next?: FeatureList[Key];
};

type FeatureUpdate<Key extends FEATURE_KEY> =
  | FeatureUpdateEnabled<Key>
  | FeatureUpdateDisabled<Key>
  | FeatureUpdateConfigChanged<Key>
  | FeatureUpdateUnchanged<Key>;

export const detectTeamFeatureUpdate = <Key extends FEATURE_KEY>(
  {prevFeatureList, newFeatureList}: {prevFeatureList?: FeatureList; newFeatureList?: FeatureList},
  key: Key,
): FeatureUpdate<Key> => {
  const newFeature = newFeatureList?.[key];

  if (!prevFeatureList) {
    // Feature was added and is enabled
    if (newFeature && newFeature.status === FEATURE_STATUS.ENABLED) {
      return {type: FeatureUpdateType.ENABLED, next: newFeature};
    }

    // Feature was not added or it was added but disabled
    return {type: FeatureUpdateType.UNCHANGED, next: newFeature};
  }

  const prevFeature = prevFeatureList[key];

  const wasFeatureAdded = !prevFeature && newFeature;

  if (wasFeatureAdded) {
    // Feature was added and is enabled
    if (newFeature.status === FEATURE_STATUS.ENABLED) {
      return {type: FeatureUpdateType.ENABLED, next: newFeature};
    }

    // Feature config was added but it is disabled
    return {type: FeatureUpdateType.UNCHANGED, next: newFeature};
  }

  const wasFeatureRemoved = prevFeature && !newFeature;

  if (wasFeatureRemoved) {
    // Feature was removed
    return {type: FeatureUpdateType.DISABLED, prev: prevFeature};
  }

  // This feature was never there;
  if (!prevFeature && !newFeature) {
    return {type: FeatureUpdateType.UNCHANGED};
  }

  if (!prevFeature || !newFeature) {
    throw new Error('This should never happen');
  }

  const hasFeatureStatusChanged = prevFeature.status !== newFeature.status;

  if (hasFeatureStatusChanged) {
    if (newFeature.status === FEATURE_STATUS.ENABLED) {
      return {type: FeatureUpdateType.ENABLED, prev: prevFeature, next: newFeature};
    }

    return {type: FeatureUpdateType.DISABLED, prev: prevFeature, next: newFeature};
  }

  const hasFeatureConfigChanged =
    newFeature.status === FEATURE_STATUS.ENABLED &&
    'config' in prevFeature &&
    'config' in newFeature &&
    JSON.stringify(prevFeature.config) !== JSON.stringify(newFeature.config);

  if (hasFeatureConfigChanged) {
    return {type: FeatureUpdateType.CONFIG_CHANGED, prev: prevFeature, next: newFeature};
  }

  return {type: FeatureUpdateType.UNCHANGED, prev: prevFeature, next: newFeature};
};
