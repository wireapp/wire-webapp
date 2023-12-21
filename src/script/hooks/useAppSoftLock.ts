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
import {isE2EIEnabled, isFreshMLSSelfClient} from '../E2EIdentity';
import {NotificationRepository} from '../notification/NotificationRepository';

export function useAppSoftLock(callingRepository: CallingRepository, notificationRepository: NotificationRepository) {
  const [freshMLSSelfClient, setFreshMLSSelfClient] = useState(false);
  const [softLockLoaded, setSoftLockLoaded] = useState(false);

  const e2eiEnabled = isE2EIEnabled();

  const checkIfIsFreshMLSSelfClient = async () => {
    const initializedIsFreshMLSSelfClient = await isFreshMLSSelfClient();

    setFreshMLSSelfClient(!initializedIsFreshMLSSelfClient);

    callingRepository.setSoftLock(true);
    notificationRepository.setSoftLock(true);

    setSoftLockLoaded(true);
  };

  useEffect(() => {
    if (e2eiEnabled) {
      void checkIfIsFreshMLSSelfClient();
    }
  }, [e2eiEnabled]);

  return {isFreshMLSSelfClient: freshMLSSelfClient, softLockLoaded: e2eiEnabled ? softLockLoaded : true};
}
