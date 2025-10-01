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

import {getLogger} from 'Util/Logger';

import {BrowserPermissionStatus} from './BrowserPermissionStatus';
import {PermissionType} from './PermissionType';
import {permissionsStore, PermissionStateResult, UnifiedPermissionState} from './usePermissionsStore';

const logger = getLogger('PermissionHandlers');

/**
 * Function to get permission state from store
 */
export const getPermissionState = (permissionType: PermissionType): UnifiedPermissionState => {
  return permissionsStore.getState().getPermissionState(permissionType);
};

/**
 * Function to set permission state in store
 */
export const setPermissionState = (permissionType: PermissionType, state: UnifiedPermissionState): void => {
  permissionsStore.getState().setPermissionState(permissionType, state);
};

/**
 * Function to get multiple permission states
 */
export const getPermissionStates = (permissionTypes: PermissionType[]): PermissionStateResult[] => {
  return permissionsStore.getState().getPermissionStates(permissionTypes);
};

/**
 * Function to query browser permission for a specific type
 */
export const queryBrowserPermission = async (
  permissionType: PermissionType,
): Promise<BrowserPermissionStatus | null> => {
  if (!navigator.permissions) {
    logger.debug('Permissions API not available');
    return null;
  }

  try {
    const permissionStatus = await navigator.permissions.query({name: permissionType as any});
    logger.debug(`Permission state for '${permissionType}' is '${permissionStatus.state}'`);
    return permissionStatus.state as BrowserPermissionStatus;
  } catch (error) {
    logger.debug(`Failed to query permission for '${permissionType}'`, error);
    return null;
  }
};

/**
 * Function to set up permission change listener
 */
export const setupPermissionListener = async (
  permissionType: PermissionType,
  onStateChange: (state: BrowserPermissionStatus) => void,
): Promise<PermissionStatus | null> => {
  if (!navigator.permissions) {
    return null;
  }

  try {
    const permissionStatus = await navigator.permissions.query({name: permissionType as any});

    permissionStatus.onchange = () => {
      const newState = permissionStatus.state as BrowserPermissionStatus;
      logger.debug(`Permission state for '${permissionType}' changed to '${newState}'`);
      onStateChange(newState);
    };

    return permissionStatus;
  } catch (error) {
    logger.debug(`Failed to setup permission listener for '${permissionType}'`, error);
    return null;
  }
};

/**
 * Initialize all permission states from browser
 */
export const initializePermissions = async (
  permissions: PermissionType[] = Object.values(PermissionType),
): Promise<void> => {
  if (!navigator.permissions) {
    logger.debug('Permissions API not available, keeping default states');
    return;
  }

  const initPromises = permissions.map(async permissionType => {
    try {
      // Query initial state
      const initialState = await queryBrowserPermission(permissionType);
      if (initialState) {
        setPermissionState(permissionType, initialState);
      }

      // Setup change listener
      await setupPermissionListener(permissionType, newState => {
        setPermissionState(permissionType, newState);
      });
    } catch (error) {
      logger.debug(`Failed to initialize permission '${permissionType}'`, error);
    }
  });

  await Promise.allSettled(initPromises);
  logger.debug('Permission initialization complete');
};

/**
 * Check if a specific permission is granted
 */
export const isPermissionGranted = (permissionType: PermissionType): boolean => {
  return getPermissionState(permissionType) === BrowserPermissionStatus.GRANTED;
};

/**
 * Check if multiple permissions are granted
 */
export const arePermissionsGranted = (permissionTypes: PermissionType[]): boolean => {
  return permissionTypes.every(type => isPermissionGranted(type));
};
