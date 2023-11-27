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

import {useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {getUsersIdentities, isE2EIEnabled, WireIdentity} from '../E2EIdentity';

export const useDeviceIdentities = (userId: QualifiedId, groupId?: string) => {
  const [deviceIdentities, setDeviceIdentities] = useState<WireIdentity[] | undefined>();

  useEffect(() => {
    if (isE2EIEnabled() && groupId) {
      void (async () => {
        const userIdentities = await getUsersIdentities(groupId, [userId]);
        setDeviceIdentities(userIdentities.get(userId.id) ?? []);
      })();
    }
  }, [userId.id, groupId]);

  return {
    deviceIdentities,
    getDeviceIdentity:
      deviceIdentities !== undefined
        ? (deviceId: string) => {
            return deviceIdentities.find(identity => identity.deviceId === deviceId);
          }
        : undefined,
  };
};
