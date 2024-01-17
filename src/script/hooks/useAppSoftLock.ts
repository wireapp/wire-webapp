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
import {E2EIHandler, EnrollmentConfig, isE2EIEnabled, WireIdentity} from '../E2EIdentity';
import {shouldEnableSoftLock} from '../E2EIdentity/DelayTimer/delay';
import {NotificationRepository} from '../notification/NotificationRepository';

export function useAppSoftLock(callingRepository: CallingRepository, notificationRepository: NotificationRepository) {
  const e2eiEnabled = isE2EIEnabled();

  const [softLockEnabled, setSoftLockEnabled] = useState(false);
  const [softLockLoaded, setSoftLockLoaded] = useState(!e2eiEnabled);

  const handleSoftLockActivation = useCallback(
    ({enrollmentConfig, identity}: {enrollmentConfig: EnrollmentConfig; identity?: WireIdentity}) => {
      const isSoftLockEnabled = shouldEnableSoftLock(enrollmentConfig, identity);

      setSoftLockEnabled(isSoftLockEnabled);
      setSoftLockLoaded(true);
      callingRepository.setSoftLock(isSoftLockEnabled);
      notificationRepository.setSoftLock(isSoftLockEnabled);
    },
    [callingRepository, notificationRepository],
  );

  useEffect(() => {
    if (!e2eiEnabled) {
      return () => {};
    }

    E2EIHandler.getInstance().on('identityUpdated', handleSoftLockActivation);
    return () => {
      E2EIHandler.getInstance().off('identityUpdated', handleSoftLockActivation);
    };
  }, [e2eiEnabled, handleSoftLockActivation]);

  return {softLockEnabled, softLockLoaded};
}
