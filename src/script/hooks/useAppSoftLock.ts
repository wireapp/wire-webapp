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
import {E2EIHandler, EnrollmentConfig, WireIdentity} from '../E2EIdentity';
import {shouldEnableSoftLock} from '../E2EIdentity/SnoozableTimer/delay';
import {NotificationRepository} from '../notification/NotificationRepository';

export function useAppSoftLock(callingRepository: CallingRepository, notificationRepository: NotificationRepository) {
  const [softLockEnabled, setSoftLockEnabled] = useState(false);

  const handleSoftLockActivation = useCallback(
    async ({enrollmentConfig, identity}: {enrollmentConfig: EnrollmentConfig; identity?: WireIdentity}) => {
      const isSoftLockEnabled = await shouldEnableSoftLock(enrollmentConfig, identity);

      setSoftLockEnabled(isSoftLockEnabled);
      callingRepository.setSoftLock(isSoftLockEnabled);
      notificationRepository.setSoftLock(isSoftLockEnabled);
    },
    [callingRepository, notificationRepository],
  );

  useEffect(() => {
    const e2eiHandler = E2EIHandler.getInstance();
    if (!e2eiHandler.isE2EIEnabled()) {
      return () => {};
    }

    e2eiHandler.on('identityUpdated', handleSoftLockActivation);
    return () => {
      e2eiHandler.off('identityUpdated', handleSoftLockActivation);
    };
  }, [handleSoftLockActivation]);

  return {softLockEnabled};
}
