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
import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';

import {MLSStatuses, WireIdentity} from '../E2EIdentityVerification';

const FIVE_MINUTES = TimeInMillis.MINUTE * 5;
const FIFTEEN_MINUTES = TimeInMillis.MINUTE * 15;
const ONE_HOUR = TimeInMillis.HOUR;
const FOUR_HOURS = TimeInMillis.HOUR * 4;
const ONE_DAY = TimeInMillis.DAY;

// message retention time on backend (hardcoded to 28 days)
export const messageRetentionTime = 28 * TimeInMillis.DAY;

type GracePeriod = {
  /** start date of the grace period (unix timestamp) */
  start: number;
  /** end date of the grace period (unix timestamp) */
  end: number;
};
/**
 * Will return a suitable snooze time based on the grace period
 * @param deadline - the full grace period length in milliseconds
 */
function getNextTick({end, start}: GracePeriod): number {
  if (Date.now() >= end) {
    // If the grace period is over, we should force the user to enroll
    return 0;
  }

  if (Date.now() < start) {
    // If we are not in the grace period yet, we start the timer when the grace period starts
    return start - Date.now();
  }
  const validityPeriod = end - Date.now();

  if (validityPeriod <= FIFTEEN_MINUTES) {
    return Math.min(FIVE_MINUTES, validityPeriod);
  } else if (validityPeriod <= ONE_HOUR) {
    return Math.min(FIFTEEN_MINUTES, validityPeriod);
  } else if (validityPeriod <= FOUR_HOURS) {
    return Math.min(ONE_HOUR, validityPeriod);
  } else if (validityPeriod <= ONE_DAY) {
    return Math.min(FOUR_HOURS, validityPeriod);
  }
  return Math.min(ONE_DAY, validityPeriod);
}

function getGracePeriod(
  identity: WireIdentity | undefined,
  e2eActivatedAt: number,
  teamGracePeriodDuration: number,
): GracePeriod {
  const isFirstEnrollment = identity?.credentialType === CredentialType.Basic;
  if (isFirstEnrollment) {
    // For a new device, the deadline is the e2ei activate date + the grace period
    return {end: e2eActivatedAt + teamGracePeriodDuration, start: Date.now()};
  }

  // To be sure the device does not expire, we want to keep a safe delay
  const safeDelay = randomInt(TimeInMillis.DAY) + messageRetentionTime;

  const end = Number(identity?.x509Identity?.notAfter) * TimeInMillis.SECOND;
  const start = Math.max(end - safeDelay, end - teamGracePeriodDuration);

  return {end, start};
}

export function getEnrollmentTimer(
  identity: WireIdentity | undefined,
  e2eiActivatedAt: number,
  teamGracePeriodDuration: number,
) {
  if (identity?.status === MLSStatuses.EXPIRED) {
    return {isSnoozable: false, firingDate: Date.now()};
  }

  const deadline = getGracePeriod(identity, e2eiActivatedAt, teamGracePeriodDuration);
  const nextTick = getNextTick(deadline);

  // When logging in to a old device that doesn't have an identity yet, we trigger an enrollment timer
  return {isSnoozable: nextTick > 0, firingDate: Date.now() + nextTick};
}

export function hasGracePeriodStartedForSelfClient(
  identity: WireIdentity | undefined,
  e2eiActivatedAt: number,
  teamGracePeriodDuration: number,
) {
  const deadline = getGracePeriod(identity, e2eiActivatedAt, teamGracePeriodDuration);
  return Date.now() >= deadline.start;
}
