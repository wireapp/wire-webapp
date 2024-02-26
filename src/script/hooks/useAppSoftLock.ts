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

import {CallingRepository} from '../calling/CallingRepository';
import {E2EIHandler} from '../E2EIdentity';
import {NotificationRepository} from '../notification/NotificationRepository';

export function useAppSoftLock(callingRepository: CallingRepository, notificationRepository: NotificationRepository) {
  const [softLockEnabled, setSoftLockEnabled] = useState(false);

  const handleTimerFired = useCallback(
    ({snoozable}: {snoozable: boolean}) => {
      // When a timer is fired, it means we have reached a renewal point. We need to lock the app if this timer cannot be snoozed
      const shouldEnableSoftLock = !snoozable;
      setSoftLockEnabled(shouldEnableSoftLock);
      callingRepository.setSoftLock(shouldEnableSoftLock);
      notificationRepository.setSoftLock(shouldEnableSoftLock);
    },
    [callingRepository, notificationRepository],
  );

  const handleSoftLockActivation = useCallback(() => {
    // If the identity was updated we can unlock the app
    setSoftLockEnabled(false);
    callingRepository.setSoftLock(false);
    notificationRepository.setSoftLock(false);
  }, [callingRepository, notificationRepository]);

  useEffect(() => {
    const e2eiHandler = E2EIHandler.getInstance();

    e2eiHandler.on('timerFired', handleTimerFired);
    e2eiHandler.on('identityUpdated', handleSoftLockActivation);
    return () => {
      e2eiHandler.off('timerFired', handleTimerFired);
      e2eiHandler.off('identityUpdated', handleSoftLockActivation);
    };
  }, [handleSoftLockActivation, handleTimerFired]);

  return {softLockEnabled};
}
