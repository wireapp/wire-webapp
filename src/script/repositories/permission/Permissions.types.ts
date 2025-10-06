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

import {BrowserPermissionStatus} from './BrowserPermissionStatus';
import {PermissionType} from './PermissionType';

export interface PermissionStateResult {
  state: AppPermissionState | BrowserPermissionStatus;
  type: PermissionType;
}

// Unified permission state type that covers all possible states
export type UnifiedPermissionState = AppPermissionState | BrowserPermissionStatus;

/**
 * Normalizes browser permission states to our unified permission type.
 * Maps browser API strings to our enum values while preserving typed enum values.
 */
export function normalizePermissionState(
  state: AppPermissionState | BrowserPermissionStatus | NotificationPermission,
): UnifiedPermissionState {
  switch (state) {
    case 'default':
    case 'prompt':
      return BrowserPermissionStatus.PROMPT;
    case 'granted':
      return BrowserPermissionStatus.GRANTED;
    case 'denied':
      return BrowserPermissionStatus.DENIED;
    default:
      // Already a typed enum value or unknown - pass through as-is
      return state;
  }
}
