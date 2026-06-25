/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import type {FeatureList} from '@wireapp/api-client/lib/team/feature/';

const LOCAL_STORAGE_FEATURE_CONFIG_KEY = 'FEATURE_CONFIG_KEY';

export function loadFeatureConfig(selfUserId: string): FeatureList | undefined {
  const featureConfigs: {[selfId: string]: FeatureList} = JSON.parse(
    window.localStorage.getItem(LOCAL_STORAGE_FEATURE_CONFIG_KEY) ?? '{}',
  );
  if (featureConfigs && featureConfigs[selfUserId]) {
    return featureConfigs[selfUserId];
  }
  return undefined;
}

export function saveFeatureConfig(selfUserId: string, featureConfigList: FeatureList): void {
  window.localStorage.setItem(LOCAL_STORAGE_FEATURE_CONFIG_KEY, JSON.stringify({[selfUserId]: featureConfigList}));
}
