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

import type {Clock} from '@enormora/clock/clock';
import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import type {FeatureList} from '@wireapp/api-client/lib/team';

import {getMLSKeyPackageUploadAmount} from './mlsKeyPackagePolicy';

type Dependencies = {
  readonly clock: Clock;
  readonly teamRepository: {
    on(event: 'featureConfigUpdated', listener: (update: {newFeatureList: FeatureList}) => void): void;
  };
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly getFeatures: () => FeatureList;
  readonly setFeatures: (features: FeatureList) => void;
  readonly refreshKeyPackages: () => Promise<void>;
};

export function subscribeToMLSKeyPackageUpdates({
  clock,
  teamRepository,
  fireAndForgetInvoker,
  getFeatures,
  setFeatures,
  refreshKeyPackages,
}: Dependencies): void {
  // Pushed updates and the existing window-focus/daily refresh both emit this event.
  // The refresh path also covers teams above the backend push fanout limit.
  teamRepository.on('featureConfigUpdated', ({newFeatureList}) => {
    const previousAllowance = getMLSKeyPackageUploadAmount(getFeatures(), clock);
    setFeatures(newFeatureList);
    if (getMLSKeyPackageUploadAmount(newFeatureList, clock) > previousAllowance) {
      fireAndForgetInvoker.fireAndForget(refreshKeyPackages);
    }
  });
}
