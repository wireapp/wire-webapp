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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {FEATURE_STATUS, type FeatureList} from '@wireapp/api-client/lib/team';
import {TypedEventEmitter} from '@wireapp/commons';

import {getMLSKeyPackageUploadAmount} from './mlsKeyPackagePolicy';
import {subscribeToMLSKeyPackageUpdates} from './subscribeToMLSKeyPackageUpdates';

const enabled: FeatureList = {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {}}};
const disabled: FeatureList = {mlsMigration: {status: FEATURE_STATUS.DISABLED, config: {}}};

function setup(initialFeatures: FeatureList = disabled) {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const teamRepository = new TypedEventEmitter<{featureConfigUpdated: {newFeatureList: FeatureList}}>();
  const reportError = jest.fn();
  const fireAndForgetInvoker = createFireAndForgetInvoker({reportError});
  let features = initialFeatures;
  const getFeatures = () => {
    return features;
  };
  const observedAllowances: number[] = [];
  const refreshKeyPackages = jest.fn(async () => {
    observedAllowances.push(getMLSKeyPackageUploadAmount(getFeatures(), clock));
  });
  subscribeToMLSKeyPackageUpdates({
    clock,
    teamRepository,
    fireAndForgetInvoker,
    getFeatures,
    setFeatures: updated => {
      features = updated;
    },
    refreshKeyPackages,
  });
  const update = async (newFeatureList: FeatureList) => {
    teamRepository.emit('featureConfigUpdated', {newFeatureList});
    await fireAndForgetInvoker.waitUntilAllSettled();
  };
  return {getFeatures, observedAllowances, refreshKeyPackages, reportError, update};
}

describe('subscribeToMLSKeyPackageUpdates', () => {
  it('registers for feature updates and exposes the new allowance before refilling', async () => {
    const {getFeatures, observedAllowances, refreshKeyPackages, update} = setup();
    expect(refreshKeyPackages).not.toHaveBeenCalled();

    await update(enabled);

    expect(getFeatures()).toBe(enabled);
    expect(refreshKeyPackages).toHaveBeenCalledTimes(1);
    expect(observedAllowances).toEqual([1000]);
  });

  it('does not refill on repeated refreshes or a decrease, but refills when enabled again', async () => {
    const {getFeatures, refreshKeyPackages, update} = setup(enabled);
    await update(enabled);
    await update(disabled);
    expect(getFeatures()).toBe(disabled);
    expect(refreshKeyPackages).not.toHaveBeenCalled();

    await update(enabled);
    expect(refreshKeyPackages).toHaveBeenCalledTimes(1);
  });

  it('does not refill when a refreshed migration has already ended', async () => {
    const {refreshKeyPackages, update} = setup();
    await update({
      mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {finaliseRegardlessAfter: '1970-01-01T00:00:00Z'}},
    });
    expect(refreshKeyPackages).not.toHaveBeenCalled();
  });

  it('reports refill failures without breaking subsequent feature updates', async () => {
    const {refreshKeyPackages, reportError, update} = setup();
    const error = new Error('Upload failed');
    refreshKeyPackages.mockRejectedValueOnce(error);
    await update(enabled);
    expect(reportError).toHaveBeenCalledWith(error);

    await update(disabled);
    await update(enabled);
    expect(refreshKeyPackages).toHaveBeenCalledTimes(2);
  });
});
