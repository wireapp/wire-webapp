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

import {FeatureList, FEATURE_KEY} from '@wireapp/api-client/lib/team';

export const hasTeamFeatureChanged = (
  {prevFeatureList, newFeatureList}: {prevFeatureList: FeatureList | undefined; newFeatureList: FeatureList},
  key: FEATURE_KEY,
): boolean => {
  const newFeature = newFeatureList[key];

  if (!prevFeatureList) {
    return !!newFeature;
  }

  const prevFeature = prevFeatureList[key];

  const wasFeatureAdded = !prevFeature && newFeature;
  const wasFeatureRemoved = prevFeature && !newFeature;

  if (wasFeatureAdded || wasFeatureRemoved) {
    return true;
  }

  // This feature was never there;
  if (!prevFeature && !newFeature) {
    return false;
  }

  if (!prevFeature || !newFeature) {
    return true;
  }

  const hasFeatureStatusChanged = prevFeature.status !== newFeature.status;
  if (hasFeatureStatusChanged) {
    return true;
  }

  const hasFeatureConfigChanged =
    'config' in prevFeature &&
    'config' in newFeature &&
    JSON.stringify(prevFeature.config) !== JSON.stringify(newFeature.config);

  return hasFeatureConfigChanged;
};
