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

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';
import {createDeterministicWallClock} from 'src/script/clock/deterministicwallclock';

import {getEnrollmentTimer, getRemainingGracePeriodDelay, messageRetentionTime} from './enrollmenttimer';

import {MLSStatuses, WireIdentity} from '../e2eidentityverification';

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
    [Symbol.dispose]: () => {},
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
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1709050878009);
  });

  it('should return an immediate delay if the identity is expired', () => {
    const delay = getEnrollmentTimer({status: MLSStatuses.EXPIRED} as any, Date.now(), gracePeriod);

    expect(delay).toEqual({firingDate: Date.now(), isSnoozable: false});
  });

  it.each([
    [TimeInMillis.DAY * 2, TimeInMillis.DAY * 30, TimeInMillis.DAY],
    [TimeInMillis.DAY, TimeInMillis.DAY * 30, TimeInMillis.HOUR * 4],
    [TimeInMillis.HOUR, TimeInMillis.DAY * 30, TimeInMillis.MINUTE * 15],
    [TimeInMillis.HOUR * 3, TimeInMillis.DAY * 30, TimeInMillis.HOUR],
    [TimeInMillis.MINUTE * 10, TimeInMillis.DAY * 30, TimeInMillis.MINUTE * 5],
    [TimeInMillis.MINUTE * 30, TimeInMillis.DAY * 30, TimeInMillis.MINUTE * 15],
  ])('should return a snoozable timer if device is still valid', (validityPeriod, grace, expectedTimer) => {
    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {
        credentialType: CredentialType.X509,
        x509Identity: {
          certificate: ' ',
          notAfter: (Date.now() + validityPeriod) / 1000,
        },
      } as any,
      Date.now(),
      grace,
    );

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBe(Date.now() + expectedTimer);
  });

  it('should return a snoozable timer in the long future if device is certified before the grace period', () => {
    const deadline = Date.now() + messageRetentionTime + gracePeriod + 1000;
    const gracePeriodStartingPoint = deadline - gracePeriod;

    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {
        credentialType: CredentialType.X509,
        x509Identity: {
          certificate: ' ',
          notAfter: deadline / 1000,
        },
      } as any,
      Date.now(),
      gracePeriod,
    );

    expect(isSnoozable).toBeTruthy();
    expect(firingDate).toBe(gracePeriodStartingPoint);
  });

  it('should return a snoozable timer scheduled at the start of the grace period if we are not in it yet', () => {
    const deadline = Date.now() + gracePeriod + 1000;
    const gracePeriodStartingPoint = deadline - gracePeriod;
    const {firingDate, isSnoozable} = getEnrollmentTimer(
      {
        credentialType: CredentialType.X509,
        x509Identity: {
          certificate: ' ',
          notAfter: deadline / 1000,
        },
      } as any,
      Date.now(),
      gracePeriod,
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
    const remainingDelay = getRemainingGracePeriodDelay(undefined, Date.now(), grace);

    expect(remainingDelay).toBe(grace);
  });

  it('should return a deterministic full grace-period delay when identity is undefined', () => {
    const deterministicWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: 1_700_000_000_000,
    });
    const grace = TimeInMillis.HOUR * 12;

    const remainingDelay = getRemainingGracePeriodDelay(
      undefined,
      deterministicWallClock.currentTimestampInMilliseconds,
      grace,
      deterministicWallClock,
    );

    expect(remainingDelay).toBe(grace);
  });

  it('should return only the remaining grace-period delay when first enrollment started in the past', () => {
    const deterministicWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: 1_700_000_000_000,
    });
    const grace = TimeInMillis.DAY * 7;
    const e2eiActivatedAt = deterministicWallClock.currentTimestampInMilliseconds - TimeInMillis.DAY * 2;

    const remainingDelay = getRemainingGracePeriodDelay(undefined, e2eiActivatedAt, grace, deterministicWallClock);

    expect(remainingDelay).toBe(TimeInMillis.DAY * 5);
  });

  it('should treat NOT_ACTIVATED identity as first enrollment', () => {
    const deterministicWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: 1_700_000_000_000,
    });
    const grace = TimeInMillis.HOUR * 6;

    const remainingDelay = getRemainingGracePeriodDelay(
      generateWireIdentity(CredentialType.X509, MLSStatuses.NOT_ACTIVATED),
      deterministicWallClock.currentTimestampInMilliseconds,
      grace,
      deterministicWallClock,
    );

    expect(remainingDelay).toBe(grace);
  });
});
