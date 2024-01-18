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

import {renderHook, waitFor} from '@testing-library/react';

import {useAppSoftLock} from './useAppSoftLock';

import {CallingRepository} from '../calling/CallingRepository';
import {E2EIHandler, isE2EIEnabled} from '../E2EIdentity';
import {isFreshMLSSelfClient} from '../E2EIdentity/E2EIdentityVerification';
import {NotificationRepository} from '../notification/NotificationRepository';

const isFreshMLSSelfClientMock = isFreshMLSSelfClient as jest.MockedFn<typeof isFreshMLSSelfClient>;
const isE2EIEnabledMock = isE2EIEnabled as jest.MockedFn<typeof isE2EIEnabled>;
const E2EIHandlerMock = E2EIHandler as jest.Mocked<typeof E2EIHandler>;

jest.mock('../E2EIdentity/E2EIdentityVerification', () => ({
  isFreshMLSSelfClient: jest.fn(),
}));

jest.mock('../E2EIdentity', () => ({
  isE2EIEnabled: jest.fn(),
  E2EIHandler: {
    getInstance: jest.fn(),
  },
}));

describe('useAppSoftLock', () => {
  const callingRepository = {setSoftLock: jest.fn()} as unknown as CallingRepository;
  const notificationRepository = {setSoftLock: jest.fn()} as unknown as NotificationRepository;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should not do anything if e2ei is not enabled', () => {
    const {result} = renderHook(() => useAppSoftLock(callingRepository, notificationRepository));
    expect(result.current).toEqual({softLockEnabled: false});
    expect(callingRepository.setSoftLock).not.toHaveBeenCalledWith(true);
    expect(notificationRepository.setSoftLock).not.toHaveBeenCalledWith(true);
  });

  it('should set soft lock to true if the user has used up the entire grace period', async () => {
    isE2EIEnabledMock.mockReturnValue(true);
    E2EIHandlerMock.getInstance.mockReturnValue({
      on: jest.fn((eventName, callback) => callback({enrollmentConfig: {timer: {isSnoozeTimeAvailable: () => false}}})),
      off: jest.fn(),
    } as any);

    const {result} = renderHook(() => useAppSoftLock(callingRepository, notificationRepository));

    await waitFor(() => {
      expect(result.current.softLockEnabled).toBe(true);
      expect(callingRepository.setSoftLock).toHaveBeenCalledWith(true);
      expect(notificationRepository.setSoftLock).toHaveBeenCalledWith(true);
    });
  });

  it('should set softLock if the device is a fresh new device', async () => {
    isE2EIEnabledMock.mockReturnValue(true);
    isFreshMLSSelfClientMock.mockResolvedValue(true);
    E2EIHandlerMock.getInstance.mockReturnValue({
      on: jest.fn((eventName, callback) => callback({enrollmentConfig: {timer: {isSnoozeTimeAvailable: () => true}}})),
      off: jest.fn(),
    } as any);

    const {result} = renderHook(() => useAppSoftLock(callingRepository, notificationRepository));

    await waitFor(() => {
      expect(result.current.softLockEnabled).toBe(true);
      expect(callingRepository.setSoftLock).toHaveBeenCalledWith(true);
      expect(notificationRepository.setSoftLock).toHaveBeenCalledWith(true);
    });
  });

  it('should not set softLock if the device is an old device and the grace period is not expireds', async () => {
    isE2EIEnabledMock.mockReturnValue(true);
    E2EIHandlerMock.getInstance.mockReturnValue({
      on: jest.fn((eventName, callback) =>
        callback({enrollmentConfig: {timer: {isSnoozeTimeAvailable: () => true}, isFreshMLSSelfClient: false}}),
      ),
      off: jest.fn(),
    } as any);

    const {result} = renderHook(() => useAppSoftLock(callingRepository, notificationRepository));

    expect(result.current.softLockEnabled).toBe(false);
    expect(callingRepository.setSoftLock).not.toHaveBeenCalledWith(true);
    expect(notificationRepository.setSoftLock).not.toHaveBeenCalledWith(true);
  });
});
