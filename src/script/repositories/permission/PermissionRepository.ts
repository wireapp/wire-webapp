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

import ko from 'knockout';

import {PermissionState} from 'Repositories/notification/PermissionState';
import {Logger, getLogger} from 'Util/Logger';

import {PermissionStatusState} from './PermissionStatusState';
import {PermissionType} from './PermissionType';

interface PermissionStateResult {
  state: PermissionState | PermissionStatusState;
  type: PermissionType;
}

/**
 * Permission repository to check browser permissions.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
 */
export class PermissionRepository {
  private readonly logger: Logger;
  readonly permissionState: Record<PermissionType, ko.Observable<PermissionState | PermissionStatusState>>;

  constructor() {
    this.logger = getLogger('PermissionRepository');

    this.permissionState = {
      [PermissionType.CAMERA]: ko.observable(PermissionStatusState.PROMPT),
      [PermissionType.GEO_LOCATION]: ko.observable(PermissionStatusState.PROMPT),
      [PermissionType.MICROPHONE]: ko.observable(PermissionStatusState.PROMPT),
      [PermissionType.NOTIFICATIONS]: ko.observable(PermissionStatusState.PROMPT),
    };

    this.initPermissionState(Object.keys(this.permissionState) as PermissionType[]);
  }

  private initPermissionState(permissions: PermissionType[]): void {
    if (!navigator.permissions) {
      return;
    }
    permissions.forEach(permissionType => {
      const setPermissionState = (permissionState: PermissionStatusState): void =>
        this.permissionState[permissionType](permissionState);

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

  getPermissionState(permissionType: PermissionType): PermissionState | PermissionStatusState {
    return this.permissionState[permissionType]();
  }

  getPermissionStates(permissionTypes: PermissionType[]): PermissionStateResult[] {
    return permissionTypes.map(permissionType => ({
      state: this.getPermissionState(permissionType),
      type: permissionType,
    }));
  }
}
