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

import {useCallback, useEffect, useState} from 'react';

import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {NotificationRepository} from 'Repositories/notification/NotificationRepository';

import {E2EIHandler, E2EIDeviceStatus} from '../E2EIdentity';

export function useAppSoftLock(callingRepository: CallingRepository, notificationRepository: NotificationRepository) {
  const [softLockEnabled, setSoftLockEnabled] = useState(false);

  const handleDeviceStatusChange = useCallback(
    ({status}: {status: E2EIDeviceStatus}) => {
      // If the identity was updated we can unlock the app
      const shouldLock = status === 'locked';
      setSoftLockEnabled(shouldLock);
      callingRepository.setSoftLock(shouldLock);
      notificationRepository.setSoftLock(shouldLock);
    },
    [callingRepository, notificationRepository],
  );

  useEffect(() => {
    const e2eiHandler = E2EIHandler.getInstance();

    e2eiHandler.on('deviceStatusUpdated', handleDeviceStatusChange);
    return () => {
      e2eiHandler.off('deviceStatusUpdated', handleDeviceStatusChange);
    };
  }, [handleDeviceStatusChange]);

  return {softLockEnabled};
}
