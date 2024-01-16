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

import {useEffect, useState} from 'react';

import {CallingRepository} from '../calling/CallingRepository';
import {E2EIHandler, EnrollmentConfig, isE2EIEnabled, isFreshMLSSelfClient} from '../E2EIdentity';
import {shouldEnableSoftLock} from '../E2EIdentity/DelayTimer/delay';
import {NotificationRepository} from '../notification/NotificationRepository';

export function useAppSoftLock(callingRepository: CallingRepository, notificationRepository: NotificationRepository) {
  const [freshMLSSelfClient, setFreshMLSSelfClient] = useState(false);
  const [softLockLoaded, setSoftLockLoaded] = useState(false);

  const e2eiEnabled = isE2EIEnabled();

  const setAppSoftLock = (isLocked: boolean) => {
    setFreshMLSSelfClient(isLocked);
    setSoftLockLoaded(true);
    callingRepository.setSoftLock(isLocked);
    notificationRepository.setSoftLock(isLocked);
  };

  const checkIfIsFreshMLSSelfClient = async () => {
    const initializedIsFreshMLSSelfClient = await isFreshMLSSelfClient();

    setAppSoftLock(initializedIsFreshMLSSelfClient);
  };

  const handleSoftLockActivation = async ({enrollmentConfig}: {enrollmentConfig: EnrollmentConfig}) => {
    const isSoftLockEnabled = await shouldEnableSoftLock(enrollmentConfig);
    setAppSoftLock(isSoftLockEnabled);
  };

  useEffect(() => {
    if (!e2eiEnabled) {
      return () => {};
    }

    E2EIHandler.getInstance().on('identityUpdate', handleSoftLockActivation);
    return () => {
      E2EIHandler.getInstance().off('identityUpdate', handleSoftLockActivation);
    };
  }, [e2eiEnabled]);

  useEffect(() => {
    if (e2eiEnabled) {
      void checkIfIsFreshMLSSelfClient();
    }
  }, [e2eiEnabled]);

  useEffect(() => {
    if (!freshMLSSelfClient) {
      return () => {};
    }
    E2EIHandler.getInstance().on('enrollmentSuccessful', checkIfIsFreshMLSSelfClient);
    return () => {
      E2EIHandler.getInstance().off('enrollmentSuccessful', checkIfIsFreshMLSSelfClient);
    };
  }, [freshMLSSelfClient]);

  return {isFreshMLSSelfClient: freshMLSSelfClient, softLockLoaded: e2eiEnabled ? softLockLoaded : true};
}
