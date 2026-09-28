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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';
import {noop} from 'noop-esm';

import {getEnrollmentTimer, getRemainingGracePeriodDelay, messageRetentionTime} from './enrollmentTimer';

import {MLSStatuses, WireIdentity} from '../e2eIdentityVerification';

const generateWireIdentity = (
  credentialType: CredentialType = CredentialType.X509,
  status: MLSStatuses = MLSStatuses.NOT_ACTIVATED,
): WireIdentity => ({
  x509Identity: {
    free: jest.fn(),
    certificate: '',
    displayName: 'John Doe',
    domain: 'domain',
    handle: 'johndoe',
    notAfter: BigInt(0),
    notBefore: BigInt(0),
    serialNumber: '',
    [Symbol.dispose]: noop,
  },
  thumbprint: '',
  credentialType,
  status,
  clientId: 'client-id',
  deviceId: 'client-id',
  qualifiedUserId: {id: 'user-id', domain: 'domain'},
});

describe('e2ei delays', () => {
  const gracePeriod = 7 * TimeInMillis.DAY;

  function createClockForTest(): ReturnType<typeof createDeterministicClock> {
    return createDeterministicClock({initialUnixEpochMicroseconds: 1_709_050_878_009_000n});
  }

  it('should return an immediate delay if the identity is expired', () => {
    const clock = createClockForTest();
    const delay = getEnrollmentTimer(
      generateWireIdentity(CredentialType.X509, MLSStatuses.EXPIRED),
      clock.currentUnixEpochMilliseconds,
      gracePeriod,
      clock,
    );

    expect(delay).toEqual({firingDate: clock.currentUnixEpochMilliseconds, isSnoozable: false});
  });

  it.each([
    [TimeInMillis.DAY * 2, TimeInMillis.DAY * 30, TimeInMillis.DAY],
    [TimeInMillis.DAY, TimeInMillis.DAY * 30, TimeInMillis.HOUR * 4],
    [TimeInMillis.HOUR, TimeInMillis.DAY * 30, TimeInMillis.MINUTE * 15],
    [TimeInMillis.HOUR * 3, TimeInMillis.DAY * 30, TimeInMillis.HOUR],
    [TimeInMillis.MINUTE * 10, TimeInMillis.DAY * 30, TimeInMillis.MINUTE * 5],
    [TimeInMillis.MINUTE * 30, TimeInMillis.DAY * 30, TimeInMillis.MINUTE * 15],
  ])('should return a snoozable timer if device is still valid', (validityPeriod, grace, expectedTimer) => {
    const clock = createClockForTest();
    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {
        credentialType: CredentialType.X509,
        x509Identity: {
          certificate: ' ',
          notAfter: (clock.currentUnixEpochMilliseconds + validityPeriod) / 1000,
        },
      } as any,
      clock.currentUnixEpochMilliseconds,
      grace,
      clock,
    );

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBe(clock.currentUnixEpochMilliseconds + expectedTimer);
  });

  it('should return a snoozable timer in the long future if device is certified before the grace period', () => {
    const clock = createClockForTest();
    const deadline = clock.currentUnixEpochMilliseconds + messageRetentionTime + gracePeriod + 1000;
    const gracePeriodStartingPoint = deadline - gracePeriod;

    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {
        credentialType: CredentialType.X509,
        x509Identity: {
          certificate: ' ',
          notAfter: deadline / 1000,
        },
      } as any,
      clock.currentUnixEpochMilliseconds,
      gracePeriod,
      clock,
    );

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBe(gracePeriodStartingPoint);
  });

  it('should return a snoozable timer scheduled at the start of the grace period if we are not in it yet', () => {
    const clock = createClockForTest();
    const deadline = clock.currentUnixEpochMilliseconds + gracePeriod + 1000;
    const gracePeriodStartingPoint = deadline - gracePeriod;
    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {
        credentialType: CredentialType.X509,
        x509Identity: {
          certificate: ' ',
          notAfter: deadline / 1000,
        },
      } as any,
      clock.currentUnixEpochMilliseconds,
      gracePeriod,
      clock,
    );

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBe(gracePeriodStartingPoint);
  });

  it.each([
    TimeInMillis.HOUR,
    TimeInMillis.HOUR * 6,
    TimeInMillis.HOUR * 12,
    TimeInMillis.HOUR * 24,
    TimeInMillis.WEEK,
  ])('should keep full remaining grace period for first enrollment: %i ms', grace => {
    const clock = createClockForTest();
    const remainingDelay = getRemainingGracePeriodDelay(undefined, clock.currentUnixEpochMilliseconds, grace, clock);

    expect(remainingDelay).toBe(grace);
  });

  it('should return a deterministic full grace-period delay when identity is undefined', () => {
    const clock = createDeterministicClock({
      initialUnixEpochMicroseconds: BigInt(1_700_000_000_000) * 1_000n,
    });
    const grace = TimeInMillis.HOUR * 12;

    const remainingDelay = getRemainingGracePeriodDelay(undefined, clock.currentUnixEpochMilliseconds, grace, clock);

    expect(remainingDelay).toBe(grace);
  });

  it('should return only the remaining grace-period delay when first enrollment started in the past', () => {
    const clock = createDeterministicClock({
      initialUnixEpochMicroseconds: BigInt(1_700_000_000_000) * 1_000n,
    });
    const grace = TimeInMillis.DAY * 7;
    const e2eiActivatedAt = clock.currentUnixEpochMilliseconds - TimeInMillis.DAY * 2;

    const remainingDelay = getRemainingGracePeriodDelay(undefined, e2eiActivatedAt, grace, clock);

    expect(remainingDelay).toBe(TimeInMillis.DAY * 5);
  });

  it('should treat NOT_ACTIVATED identity as first enrollment', () => {
    const clock = createDeterministicClock({
      initialUnixEpochMicroseconds: BigInt(1_700_000_000_000) * 1_000n,
    });
    const grace = TimeInMillis.HOUR * 6;

    const remainingDelay = getRemainingGracePeriodDelay(
      generateWireIdentity(CredentialType.X509, MLSStatuses.NOT_ACTIVATED),
      clock.currentUnixEpochMilliseconds,
      grace,
      clock,
    );

    expect(remainingDelay).toBe(grace);
  });
});
