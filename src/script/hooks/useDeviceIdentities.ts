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

import {E2EIHandler, getUsersIdentities, isE2EIEnabled, MLSStatuses, WireIdentity} from '../E2EIdentity';

export const useUserIdentity = (userId: QualifiedId, groupId?: string, updateAfterEnrollment?: boolean) => {
  const [deviceIdentities, setDeviceIdentities] = useState<WireIdentity[] | undefined>();

  const refreshDeviceIdentities = useCallback(async () => {
    if (!isE2EIEnabled() || !groupId) {
      return;
    }
    const userIdentities = await getUsersIdentities(groupId, [userId]);
    setDeviceIdentities(userIdentities.get(userId.id) ?? []);
  }, [userId.id, groupId]);

  useEffect(() => {
    void refreshDeviceIdentities();
  }, [refreshDeviceIdentities]);

  useEffect(() => {
    if (!updateAfterEnrollment) {
      return () => {};
    }
    E2EIHandler.getInstance().on('enrollmentSuccessful', refreshDeviceIdentities);
    return () => {
      E2EIHandler.getInstance().off('enrollmentSuccessful', refreshDeviceIdentities);
    };
  }, [refreshDeviceIdentities, updateAfterEnrollment]);

  return {
    deviceIdentities,

    status: !deviceIdentities
      ? undefined
      : deviceIdentities.length > 0 && deviceIdentities.every(identity => identity.status === MLSStatuses.VALID)
      ? MLSStatuses.VALID
      : MLSStatuses.NOT_DOWNLOADED,

    getDeviceIdentity:
      deviceIdentities !== undefined
        ? (deviceId: string) => {
            return deviceIdentities.find(identity => identity.deviceId === deviceId);
          }
        : undefined,
  };
};
