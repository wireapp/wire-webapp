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

import {useStore} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createStore} from 'zustand/vanilla';

import {PermissionState} from 'Repositories/notification/PermissionState';

import {PermissionStatusState} from './PermissionStatusState';
import {PermissionType} from './PermissionType';

export interface PermissionStateResult {
  state: PermissionState | PermissionStatusState;
  type: PermissionType;
}

// Unified permission state type that covers all possible states
export type UnifiedPermissionState = PermissionState | PermissionStatusState;

/**
 * Normalizes browser permission states to our unified permission type.
 * Maps browser API strings to our enum values while preserving typed enum values.
 */
export function normalizePermissionState(
  state: PermissionState | PermissionStatusState | NotificationPermission,
): UnifiedPermissionState {
  switch (state) {
    case 'default':
    case 'prompt':
      return PermissionStatusState.PROMPT;
    case 'granted':
      return PermissionStatusState.GRANTED;
    case 'denied':
      return PermissionStatusState.DENIED;
    default:
      // Already a typed enum value or unknown - pass through as-is
      return state;
  }
}

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
      [PermissionType.CAMERA]: PermissionStatusState.PROMPT,
      [PermissionType.GEO_LOCATION]: PermissionStatusState.PROMPT,
      [PermissionType.MICROPHONE]: PermissionStatusState.PROMPT,
      [PermissionType.NOTIFICATIONS]: PermissionStatusState.PROMPT,
    },

    // getters
    getPermissionState: (permissionType: PermissionType) => {
      return get().permissions[permissionType];
    },

    getPermissionStates: (permissionTypes: PermissionType[]) => {
      const state = get();
      return permissionTypes.map(permissionType => ({
        state: state.permissions[permissionType],
        type: permissionType,
      }));
    },

    // setters
    setPermissionState: (permissionType: PermissionType, state: PermissionState | PermissionStatusState) =>
      set(draft => {
        draft.permissions[permissionType] = normalizePermissionState(state);
      }),
  })),
);

export const usePermissionsStore = <T>(selector: (state: PermissionsState) => T): T =>
  useStore(permissionsStore, selector);
