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

import {getLogger} from 'utils/Logger';

import {PermissionStatusState} from './PermissionStatusState';
import {PermissionType} from './PermissionType';

/**
 * Permission repository to check browser permissions.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
 */
export class PermissionRepository {
  static get CONFIG() {
    return {
      MEDIA_TYPES: [PermissionType.CAMERA, PermissionType.MICROPHONE],
    };
  }
  /**
   * Construct a new Permission Repository.
   */
  constructor() {
    this.logger = getLogger('PermissionRepository');

    this.permissionState = {
      [PermissionType.CAMERA]: ko.observable(undefined),
      [PermissionType.GEO_LOCATION]: ko.observable(undefined),
      [PermissionType.MICROPHONE]: ko.observable(undefined),
      [PermissionType.NOTIFICATIONS]: ko.observable(undefined),
    };
  }

  checkPermissionState(permissionType) {
    return Promise.resolve().then(() => {
      const setPermissionState = permissionState => this.permissionState[permissionType](permissionState);

      if (!z.util.Environment.browser.supports.permissions) {
        throw new z.error.PermissionError(z.error.PermissionError.TYPE.UNSUPPORTED);
      }

      const isMediaPermission = PermissionRepository.CONFIG.MEDIA_TYPES.includes(permissionType);
      if (isMediaPermission && !z.util.Environment.browser.supports.mediaPermissions) {
        throw new z.error.PermissionError(z.error.PermissionError.TYPE.UNSUPPORTED_TYPE);
      }

      return navigator.permissions.query({name: permissionType}).then(permissionStatus => {
        this.logger.log(`Permission state for '${permissionType}' is '${permissionStatus.state}'`, permissionStatus);
        setPermissionState(permissionStatus.state);

        permissionStatus.onchange = () => {
          const logMessage = `Permission  state for '${permissionType}' changed to '${permissionStatus.state}'`;
          this.logger.log(logMessage, permissionStatus);
          setPermissionState(permissionStatus.state);
        };

        return permissionStatus.state;
      });
    });
  }

  getPermissionState(permissionType) {
    const currentPermissionState = this.permissionState[permissionType]();
    return currentPermissionState ? Promise.resolve(currentPermissionState) : this.checkPermissionState(permissionType);
  }

  getPermissionStates(permissionTypes) {
    const permissionPromises = permissionTypes.map(permissionType => {
      return this.getPermissionState(permissionType)
        .then(permissionState => ({permissionState, permissionType}))
        .catch(() => ({permissionState: PermissionStatusState.PROMPT, permissionType}));
    });

    return Promise.all(permissionPromises);
  }
}
