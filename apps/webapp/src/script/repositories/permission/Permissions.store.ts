/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {AppPermissionState} from 'Repositories/notification/AppPermissionState';
import {immer} from 'zustand/middleware/immer';
import {createStore} from 'zustand/vanilla';

import {BrowserPermissionStatus} from './BrowserPermissionStatus';
import {normalizePermissionState, PermissionStateResult, UnifiedPermissionState} from './Permissions.types';
import {PermissionType} from './PermissionType';

export type PermissionsState = {
  permissions: Record<PermissionType, UnifiedPermissionState>;

  // getters
  getPermissionState(permissionType: PermissionType): UnifiedPermissionState;
  getPermissionStates(permissionTypes: PermissionType[]): PermissionStateResult[];

  // setters
  setPermissionState(permissionType: PermissionType, state: UnifiedPermissionState): void;
};

export const permissionsStore = createStore<PermissionsState>()(
  immer<PermissionsState>((set, get) => ({
    permissions: {
      [PermissionType.CAMERA]: BrowserPermissionStatus.PROMPT,
      [PermissionType.GEO_LOCATION]: BrowserPermissionStatus.PROMPT,
      [PermissionType.MICROPHONE]: BrowserPermissionStatus.PROMPT,
      [PermissionType.NOTIFICATIONS]: BrowserPermissionStatus.PROMPT,
    },

    // getters
    getPermissionState: (permissionType: PermissionType) => {
      return get().permissions[permissionType];
    },

    getPermissionStates: (permissionTypes: PermissionType[]) => {
      const state = get();
      return permissionTypes
        .filter(permissionType => Object.values(PermissionType).includes(permissionType))
        .map(permissionType => ({
          state: state.permissions[permissionType],
          type: permissionType,
        }));
    },

    // setters
    setPermissionState: (permissionType: PermissionType, state: AppPermissionState | BrowserPermissionStatus) =>
      set(draft => {
        draft.permissions[permissionType] = normalizePermissionState(state);
      }),
  })),
);
