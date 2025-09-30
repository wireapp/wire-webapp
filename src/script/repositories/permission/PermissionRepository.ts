/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Logger, getLogger} from 'Util/Logger';

import {PermissionStatusState} from './PermissionStatusState';
import {PermissionType} from './PermissionType';
import {permissionsStore, PermissionStateResult, UnifiedPermissionState} from './usePermissionsStore';

/**
 * Permission repository to check browser permissions.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
 */
export class PermissionRepository {
  private readonly logger: Logger;

  constructor() {
    this.logger = getLogger('PermissionRepository');
    this.initPermissionState(Object.values(PermissionType));
  }

  private initPermissionState(permissions: PermissionType[]): void {
    if (!navigator.permissions) {
      return;
    }
    permissions.forEach(permissionType => {
      const setPermissionState = (permissionState: PermissionStatusState): void =>
        permissionsStore.getState().setPermissionState(permissionType, permissionState);

      return navigator.permissions
        .query({name: permissionType as any})
        .then(permissionStatus => {
          this.logger.debug(`Permission state for '${permissionType}' is '${permissionStatus.state}'`);
          setPermissionState(permissionStatus.state as PermissionStatusState);

          permissionStatus.onchange = () => {
            this.logger.debug(`Permission state for '${permissionType}' changed to '${permissionStatus.state}'`);
            setPermissionState(permissionStatus.state as PermissionStatusState);
          };

          return permissionStatus.state;
        })
        .catch(() => {});
    });
  }

  getPermissionState(permissionType: PermissionType): UnifiedPermissionState {
    return permissionsStore.getState().getPermissionState(permissionType);
  }

  setPermissionState(permissionType: PermissionType, state: UnifiedPermissionState): void {
    permissionsStore.getState().setPermissionState(permissionType, state);
  }

  getPermissionStates(permissionTypes: PermissionType[]): PermissionStateResult[] {
    return permissionsStore.getState().getPermissionStates(permissionTypes);
  }
}
