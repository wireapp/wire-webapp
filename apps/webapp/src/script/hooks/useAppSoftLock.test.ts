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
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {NotificationRepository} from 'Repositories/notification/NotificationRepository';

import {useAppSoftLock} from './useAppSoftLock';

import {E2EIHandler} from '../E2EIdentity';
import {isFreshMLSSelfClient} from '../E2EIdentity/E2EIdentityVerification';

const isFreshMLSSelfClientMock = isFreshMLSSelfClient as jest.MockedFn<typeof isFreshMLSSelfClient>;
const E2EIHandlerMock = E2EIHandler as jest.Mocked<typeof E2EIHandler>;

jest.mock('../E2EIdentity/E2EIdentityVerification', () => ({
  isFreshMLSSelfClient: jest.fn(),
}));

jest.mock('../E2EIdentity', () => ({
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
    E2EIHandlerMock.getInstance.mockReturnValue({
      isE2EIEnabled: jest.fn(() => false),
      on: jest.fn(),
      off: jest.fn(),
    } as any);
    const {result} = renderHook(() => useAppSoftLock(callingRepository, notificationRepository));
    expect(result.current).toEqual({softLockEnabled: false});
    expect(callingRepository.setSoftLock).not.toHaveBeenCalledWith(true);
    expect(notificationRepository.setSoftLock).not.toHaveBeenCalledWith(true);
  });

  it('should set soft lock to true if the user has used up the entire grace period', async () => {
    E2EIHandlerMock.getInstance.mockReturnValue({
      isE2EIEnabled: jest.fn(() => true),
      on: jest.fn((eventName, callback) => callback({status: 'locked'})),
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
    isFreshMLSSelfClientMock.mockResolvedValue(true);
    E2EIHandlerMock.getInstance.mockReturnValue({
      isE2EIEnabled: jest.fn(() => true),
      on: jest.fn((eventName, callback) => callback({status: 'valid'})),
      off: jest.fn(),
    } as any);

    const {result} = renderHook(() => useAppSoftLock(callingRepository, notificationRepository));

    await waitFor(() => {
      expect(result.current.softLockEnabled).toBe(false);
      expect(callingRepository.setSoftLock).toHaveBeenCalledWith(false);
      expect(notificationRepository.setSoftLock).toHaveBeenCalledWith(false);
    });
  });
});
