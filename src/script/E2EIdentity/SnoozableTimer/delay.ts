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

import {randomInt} from '@wireapp/commons/lib/util/RandomUtil';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';

import {MLSStatuses, WireIdentity} from '../E2EIdentityVerification';

export const ONE_MINUTE = TimeInMillis.MINUTE;
export const FIVE_MINUTES = TimeInMillis.MINUTE * 5;
export const FIFTEEN_MINUTES = TimeInMillis.MINUTE * 15;
export const ONE_HOUR = TimeInMillis.HOUR;
export const FOUR_HOURS = TimeInMillis.HOUR * 4;
export const ONE_DAY = TimeInMillis.DAY;

// message retention time on backend (hardcoded to 28 days)
const messageRetentionTime = 28 * TimeInMillis.DAY;

/**
 * Will return a suitable snooze time based on the grace period
 * @param expiryDate - the full grace period length in milliseconds
 */
function getNextTick(expiryDate: number, gracePeriodDuration: number, isFirstEnrollment: boolean): number {
  const leftoverTimer = expiryDate - Date.now();

  // First a first enrollment we only consider the grace period. For enrolled devices we also consider the backend message retention time
  const extraDelay = isFirstEnrollment ? 0 : randomInt(TimeInMillis.DAY) - messageRetentionTime;

  const gracePeriod = Math.max(0, Math.min(gracePeriodDuration, leftoverTimer - extraDelay));
  if (gracePeriod <= 0) {
    return 0;
  }

  if (gracePeriod <= FIFTEEN_MINUTES) {
    return Math.min(FIVE_MINUTES, gracePeriod);
  } else if (gracePeriod <= ONE_HOUR) {
    return Math.min(FIFTEEN_MINUTES, gracePeriod);
  } else if (gracePeriod <= FOUR_HOURS) {
    return Math.min(ONE_HOUR, gracePeriod);
  } else if (gracePeriod <= ONE_DAY) {
    return Math.min(FOUR_HOURS, gracePeriod);
  }
  return Math.min(ONE_DAY, gracePeriod);
}

export function getEnrollmentTimer(
  identity: WireIdentity | undefined,
  deviceCreatedAt: number,
  teamGracePeriodDuration: number,
) {
  if (identity?.status === MLSStatuses.EXPIRED) {
    return {isSnoozable: false, firingDate: Date.now()};
  }

  const expiryDate = identity?.certificate
    ? Number(identity.notAfter) * TimeInMillis.SECOND
    : deviceCreatedAt + teamGracePeriodDuration;

  const isFirstEnrollment = !identity?.certificate;
  const nextTick = getNextTick(expiryDate, teamGracePeriodDuration, isFirstEnrollment);
  // When logging in to a old device that doesn't have an identity yet, we trigger an enrollment timer
  return {isSnoozable: nextTick > 0, firingDate: Date.now() + nextTick};
}
