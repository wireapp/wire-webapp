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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import {FEATURE_STATUS, type FeatureList} from '@wireapp/api-client/lib/team';
import {Maybe} from 'true-myth';

const REGULAR_UPLOAD_AMOUNT = 100;
const MIGRATION_UPLOAD_AMOUNT = 1000;

export const getMLSKeyPackageUploadAmount = (features: FeatureList, wallClock: WallClock): number => {
  const migration = Maybe.of(features.mlsMigration);
  return migration.match({
    Just: feature => {
      const deadline = Maybe.of(feature.config.finaliseRegardlessAfter);
      const beforeDeadline = deadline.match({
        Just: value => wallClock.currentTimestampInMilliseconds < Date.parse(value),
        Nothing: () => true,
      });
      return feature.status === FEATURE_STATUS.ENABLED && beforeDeadline
        ? MIGRATION_UPLOAD_AMOUNT
        : REGULAR_UPLOAD_AMOUNT;
    },
    Nothing: () => REGULAR_UPLOAD_AMOUNT,
  });
};
