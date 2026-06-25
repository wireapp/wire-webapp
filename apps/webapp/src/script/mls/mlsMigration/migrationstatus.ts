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

import {FeatureMLSMigration, FEATURE_STATUS} from '@wireapp/api-client/lib/team';

const hasMigrationStartTimeArrived = (mlsMigrationFeature: FeatureMLSMigration): boolean => {
  if (!mlsMigrationFeature) {
    return false;
  }

  if (mlsMigrationFeature.status === FEATURE_STATUS.DISABLED) {
    return false;
  }

  const startDateISO = mlsMigrationFeature.config.startTime;
  const startTime = startDateISO ? Date.parse(startDateISO) : Infinity;

  return Date.now() >= startTime;
};

const hasMigrationFinaliseRegardlessAfterDateArrived = (mlsMigrationFeature: FeatureMLSMigration): boolean => {
  if (!mlsMigrationFeature) {
    return false;
  }

  if (mlsMigrationFeature.status === FEATURE_STATUS.DISABLED) {
    return false;
  }

  const finaliseDateISO = mlsMigrationFeature.config.finaliseRegardlessAfter;
  const finaliseTime = finaliseDateISO ? Date.parse(finaliseDateISO) : Infinity;

  return Date.now() >= finaliseTime;
};

export enum MLSMigrationStatus {
  DISABLED = 'DISABLED', //migration feature is disabled
  NOT_STARTED = 'NOT_STARTED', //migration feature is enabled but startTime has not arrived
  ONGOING = 'ONGOING', //migration feature is enabled and startTime has arrived, but finaliseRegardlessAfter has not arrived
  FINALISED = 'FINALISED', //migration feature is enabled and finaliseRegardlessAfter has arrived
}

export const getMLSMigrationStatus = (mlsMigrationFeature?: FeatureMLSMigration): MLSMigrationStatus => {
  if (!mlsMigrationFeature || mlsMigrationFeature.status === FEATURE_STATUS.DISABLED) {
    return MLSMigrationStatus.DISABLED;
  }

  const hasMigrationStarted = hasMigrationStartTimeArrived(mlsMigrationFeature);
  const hasMigrationEnded = hasMigrationFinaliseRegardlessAfterDateArrived(mlsMigrationFeature);

  if (hasMigrationStarted && !hasMigrationEnded) {
    return MLSMigrationStatus.ONGOING;
  }

  if (hasMigrationEnded) {
    return MLSMigrationStatus.FINALISED;
  }

  return MLSMigrationStatus.NOT_STARTED;
};
