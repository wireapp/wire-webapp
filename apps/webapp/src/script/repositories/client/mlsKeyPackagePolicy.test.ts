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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {FEATURE_STATUS, type FeatureList} from '@wireapp/api-client/lib/team';

import {getMLSKeyPackageUploadAmount} from './mlsKeyPackagePolicy';

const now = Date.parse('2026-09-23T12:00:00Z');

describe('MLS key package allowance', () => {
  it('returns to the regular allowance when the clock reaches the deadline', () => {
    const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: now - 1});
    const features: FeatureList = {
      mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {finaliseRegardlessAfter: '2026-09-23T12:00:00Z'}},
    };
    expect(getMLSKeyPackageUploadAmount(features, wallClock)).toBe(1000);
    wallClock.advanceByMilliseconds(1);
    expect(getMLSKeyPackageUploadAmount(features, wallClock)).toBe(100);
  });

  it.each([
    ['missing feature', {}, 100],
    ['disabled migration', {mlsMigration: {status: FEATURE_STATUS.DISABLED, config: {}}}, 100],
    ['missing deadline', {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {}}}, 1000],
    [
      'future start',
      {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {startTime: '2026-10-01T00:00:00Z'}}},
      1000,
    ],
    [
      'future deadline',
      {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {finaliseRegardlessAfter: '2026-09-24T00:00:00Z'}}},
      1000,
    ],
    [
      'deadline reached',
      {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {finaliseRegardlessAfter: '2026-09-23T12:00:00Z'}}},
      100,
    ],
    [
      'elapsed deadline',
      {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {finaliseRegardlessAfter: '2026-09-22T00:00:00Z'}}},
      100,
    ],
    [
      'invalid deadline',
      {mlsMigration: {status: FEATURE_STATUS.ENABLED, config: {finaliseRegardlessAfter: 'invalid'}}},
      100,
    ],
  ] satisfies [string, FeatureList, number][])('%s', (_name, features, expected) => {
    const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: now});
    expect(getMLSKeyPackageUploadAmount(features, wallClock)).toBe(expected);
  });
});
