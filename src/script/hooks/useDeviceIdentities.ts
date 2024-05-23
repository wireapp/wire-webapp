/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {stringifyQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {E2EIHandler, getUsersIdentities, MLSStatuses, WireIdentity} from '../E2EIdentity';

export const useUserIdentity = (userId: QualifiedId, groupId?: string, updateAfterEnrollment?: boolean) => {
  const [deviceIdentities, setDeviceIdentities] = useState<WireIdentity[] | undefined>();

  const refreshDeviceIdentities = useCallback(async () => {
    if (!E2EIHandler.getInstance().isE2EIEnabled() || !groupId) {
      return;
    }

    const qualifiedId: QualifiedId = {id: userId.id, domain: userId.domain};
    const userIdentities = await getUsersIdentities(groupId, [qualifiedId]);
    setDeviceIdentities(userIdentities?.get(stringifyQualifiedId(qualifiedId)) ?? undefined);
    /**
     * Dont check the userId directly, as it is a object that changes on every render, will cause infinite loop
     */
  }, [userId.id, userId.domain, groupId]);

  useEffect(() => {
    void refreshDeviceIdentities();
  }, [refreshDeviceIdentities]);

  useEffect(() => {
    if (!updateAfterEnrollment) {
      return () => {};
    }
    E2EIHandler.getInstance().on('deviceStatusUpdated', refreshDeviceIdentities);
    return () => {
      E2EIHandler.getInstance().off('deviceStatusUpdated', refreshDeviceIdentities);
    };
  }, [refreshDeviceIdentities, updateAfterEnrollment]);

  return {
    deviceIdentities,

    status: !deviceIdentities
      ? undefined
      : deviceIdentities.length > 0 && deviceIdentities.every(identity => identity.status === MLSStatuses.VALID)
        ? MLSStatuses.VALID
        : MLSStatuses.NOT_ACTIVATED,

    getDeviceIdentity:
      deviceIdentities !== undefined
        ? (deviceId: string) => {
            return deviceIdentities.find(identity => identity.deviceId === deviceId);
          }
        : undefined,
  };
};

export const useIsSelfWithinGracePeriod = () => {
  const [isGracePeriod, setIsGracePeriod] = useState<boolean>(false);

  const refreshGracePeriod = useCallback(async () => {
    return E2EIHandler.getInstance().isWithinGracePeriod().then(setIsGracePeriod);
  }, []);

  useEffect(() => {
    void refreshGracePeriod();

    setTimeout(refreshGracePeriod, TIME_IN_MILLIS.SECOND);
  }, [refreshGracePeriod]);

  return isGracePeriod;
};
