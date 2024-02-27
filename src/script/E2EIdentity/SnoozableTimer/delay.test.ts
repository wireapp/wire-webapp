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

import {getEnrollmentTimer, messageRetentionTime} from './delay';

import {MLSStatuses} from '../E2EIdentityVerification';

describe('e2ei delays', () => {
  const gracePeriod = 3600;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  it('should return an immediate delay if the identity is expired', () => {
    const delay = getEnrollmentTimer({status: MLSStatuses.EXPIRED} as any, Date.now(), gracePeriod);

    expect(delay).toEqual({firingDate: Date.now(), isSnoozable: false});
  });

  it('should return a snoozable timer if device is new and still in the grace period', () => {
    const {firingDate, isSnoozable} = getEnrollmentTimer(undefined, Date.now(), gracePeriod);

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBeLessThanOrEqual(gracePeriod);
  });

  it('should return a snoozable timer if device is certified and still in the grace period', () => {
    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {certificate: ' ', notAfter: Date.now() + messageRetentionTime + gracePeriod + 1000} as any,
      Date.now(),
      gracePeriod,
    );

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBeLessThanOrEqual(gracePeriod);
  });

  it('should return a non snoozable timer if device is certified about to expired', () => {
    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {certificate: ' ', notAfter: Date.now() + gracePeriod + 1000} as any,
      Date.now(),
      gracePeriod,
    );

    expect(isSnoozable).toBeFalsy();
    expect(firingDate).toBeLessThanOrEqual(gracePeriod);
  });
});
