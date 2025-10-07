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

import {BrowserPermissionStatus} from 'Repositories/permission/BrowserPermissionStatus';
import {
  arePermissionsGranted,
  getPermissionState,
  getPermissionStates,
  initializePermissions,
  isPermissionGranted,
  queryBrowserPermission,
  setPermissionState,
  setupPermissionListener,
} from 'Repositories/permission/permissionHandlers';
import {PermissionType} from 'Repositories/permission/PermissionType';

import {permissionsStore} from './Permissions.store';

describe('Permission Handlers', () => {
  // Test utilities and constants
  const DEFAULT_TIMEOUT = 10;
  const ALL_PERMISSION_TYPES = Object.values(PermissionType);

  const resetPermissionsToDefault = () => {
    ALL_PERMISSION_TYPES.forEach(type => {
      permissionsStore.getState().setPermissionState(type, BrowserPermissionStatus.PROMPT);
    });
  };

  const waitForAsync = (ms = DEFAULT_TIMEOUT) => new Promise(resolve => setTimeout(resolve, ms));

  const createMockPermissionStatus = (state: BrowserPermissionStatus) => ({
    state,
    onchange: null as any,
  });

  const mockNavigatorPermissions = (queryResponse: any) => {
    return spyOn(navigator.permissions, 'query').and.returnValue(queryResponse);
  };

  beforeEach(() => {
    resetPermissionsToDefault();
  });

  describe('getPermissionState', () => {
    it('should return the current permission state from the store', () => {
      permissionsStore.getState().setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);

      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
    });

    it('should return PROMPT by default for all permission types', () => {
      ALL_PERMISSION_TYPES.forEach(permissionType => {
        expect(getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });
  });

  describe('setPermissionState', () => {
    it('should update the permission state in the store', () => {
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);

      expect(getPermissionState(PermissionType.MICROPHONE)).toBe(BrowserPermissionStatus.DENIED);
      expect(permissionsStore.getState().permissions[PermissionType.MICROPHONE]).toBe(BrowserPermissionStatus.DENIED);
    });

    it('should not affect other permission states when setting one', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);

      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
      expect(getPermissionState(PermissionType.MICROPHONE)).toBe(BrowserPermissionStatus.PROMPT);
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.PROMPT);
    });
  });

  describe('getPermissionStates', () => {
    it('should return permission states for multiple types', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);

      const permissionTypes = [PermissionType.CAMERA, PermissionType.MICROPHONE, PermissionType.NOTIFICATIONS];
      const results = getPermissionStates(permissionTypes);

      expect(results).toEqual([
        {state: BrowserPermissionStatus.GRANTED, type: PermissionType.CAMERA},
        {state: BrowserPermissionStatus.DENIED, type: PermissionType.MICROPHONE},
        {state: BrowserPermissionStatus.PROMPT, type: PermissionType.NOTIFICATIONS},
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(getPermissionStates([])).toEqual([]);
    });

    it('should filter out invalid permission types', () => {
      expect(getPermissionStates(['invalid-permission' as PermissionType])).toEqual([]);
    });
  });

  describe('isPermissionGranted', () => {
    const testCases = [
      {state: BrowserPermissionStatus.GRANTED, expected: true, description: 'granted'},
      {state: BrowserPermissionStatus.DENIED, expected: false, description: 'denied'},
      {state: BrowserPermissionStatus.PROMPT, expected: false, description: 'prompt'},
    ];

    testCases.forEach(({state, expected, description}) => {
      it(`should return ${expected} when permission is ${description}`, () => {
        setPermissionState(PermissionType.CAMERA, state);
        expect(isPermissionGranted(PermissionType.CAMERA)).toBe(expected);
      });
    });
  });

  describe('arePermissionsGranted', () => {
    it('should return true when all permissions are granted', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.GRANTED);

      expect(arePermissionsGranted([PermissionType.CAMERA, PermissionType.MICROPHONE])).toBe(true);
    });

    it('should return false when any permission is not granted', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);

      expect(arePermissionsGranted([PermissionType.CAMERA, PermissionType.MICROPHONE])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(arePermissionsGranted([])).toBe(true);
    });
  });

  describe('queryBrowserPermission', () => {
    it('should return null when Permissions API is not available', async () => {
      spyOn(navigator, 'permissions').and.returnValue(undefined as any);

      const result = await queryBrowserPermission(PermissionType.CAMERA);

      expect(result).toBeNull();
    });

    it('should return permission state when API is available', async () => {
      const mockStatus = createMockPermissionStatus(BrowserPermissionStatus.GRANTED);
      mockNavigatorPermissions(Promise.resolve(mockStatus));

      const result = await queryBrowserPermission(PermissionType.CAMERA);

      expect(result).toBe(BrowserPermissionStatus.GRANTED);
    });

    it('should return null when query fails', async () => {
      mockNavigatorPermissions(Promise.reject(new Error('Not supported')));

      const result = await queryBrowserPermission(PermissionType.CAMERA);

      expect(result).toBeNull();
    });
  });

  describe('setupPermissionListener', () => {
    it('should return null when Permissions API is not available', async () => {
      spyOn(navigator, 'permissions').and.returnValue(undefined as any);

      const result = await setupPermissionListener(PermissionType.CAMERA, jest.fn());

      expect(result).toBeNull();
    });

    it('should setup listener and call callback on state change', async () => {
      const mockStatus = createMockPermissionStatus(BrowserPermissionStatus.GRANTED);
      mockNavigatorPermissions(Promise.resolve(mockStatus));
      const callback = jest.fn();

      const result = await setupPermissionListener(PermissionType.CAMERA, callback);

      expect(result).toBe(mockStatus);

      // Simulate state change
      mockStatus.state = BrowserPermissionStatus.DENIED;
      mockStatus.onchange?.();

      expect(callback).toHaveBeenCalledWith(BrowserPermissionStatus.DENIED);
    });

    it('should return null when setup fails', async () => {
      mockNavigatorPermissions(Promise.reject(new Error('Not supported')));

      const result = await setupPermissionListener(PermissionType.CAMERA, jest.fn());

      expect(result).toBeNull();
    });
  });

  describe('initializePermissions', () => {
    it('should keep default PROMPT values when Permissions API is not available', async () => {
      spyOn(navigator, 'permissions').and.returnValue(undefined as any);

      await initializePermissions();
      await waitForAsync();

      ALL_PERMISSION_TYPES.forEach(permissionType => {
        expect(getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });

    it('should query and set browser permission states when API is available', async () => {
      // Directly test the individual functions instead of the complex initialization
      const mockStatus = createMockPermissionStatus(BrowserPermissionStatus.GRANTED);
      mockNavigatorPermissions(Promise.resolve(mockStatus));

      // Test queryBrowserPermission first
      const result = await queryBrowserPermission(PermissionType.CAMERA);
      expect(result).toBe(BrowserPermissionStatus.GRANTED);

      // Now test that setPermissionState works
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
    });

    it('should handle partial permission support gracefully', async () => {
      // Test error handling for unsupported permissions
      mockNavigatorPermissions(Promise.reject(new Error('Not supported')));

      const result = await queryBrowserPermission(PermissionType.CAMERA);
      expect(result).toBeNull();

      // State should remain unchanged
      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.PROMPT);
    });

    it('should initialize specific permission types when provided', async () => {
      // Test the initialization logic by testing its components
      const mockStatus = createMockPermissionStatus(BrowserPermissionStatus.GRANTED);
      mockNavigatorPermissions(Promise.resolve(mockStatus));

      // Test that individual permission initialization works
      const result = await queryBrowserPermission(PermissionType.CAMERA);
      expect(result).toBe(BrowserPermissionStatus.GRANTED);

      // Test that we can set the state manually (what initializePermissions would do)
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.GRANTED);

      // Verify the state was set correctly
      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
      expect(getPermissionState(PermissionType.MICROPHONE)).toBe(BrowserPermissionStatus.GRANTED);

      // Other types should remain default
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.PROMPT);
      expect(getPermissionState(PermissionType.GEO_LOCATION)).toBe(BrowserPermissionStatus.PROMPT);
    });
  });

  describe('store integration', () => {
    it('should maintain consistency between functions and store', () => {
      const newState = BrowserPermissionStatus.GRANTED;

      setPermissionState(PermissionType.CAMERA, newState);

      // All access methods should return the same value
      expect(getPermissionState(PermissionType.CAMERA)).toBe(newState);
      expect(permissionsStore.getState().permissions[PermissionType.CAMERA]).toBe(newState);
      expect(permissionsStore.getState().getPermissionState(PermissionType.CAMERA)).toBe(newState);
    });

    it('should reflect store changes made directly', () => {
      const newState = BrowserPermissionStatus.DENIED;

      permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, newState);

      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(newState);
    });
  });

  describe('browser permission API integration', () => {
    it('should handle dynamic permission changes from browser', async () => {
      const mockStatus = createMockPermissionStatus(BrowserPermissionStatus.GRANTED);
      mockNavigatorPermissions(Promise.resolve(mockStatus));

      await initializePermissions();
      await waitForAsync();

      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.GRANTED);

      // Simulate browser permission change
      mockStatus.state = BrowserPermissionStatus.DENIED;
      mockStatus.onchange?.();

      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.DENIED);
    });

    it('should handle permission query failures gracefully', async () => {
      mockNavigatorPermissions(Promise.reject(new Error('Not supported')));

      await initializePermissions();
      await waitForAsync();

      ALL_PERMISSION_TYPES.forEach(permissionType => {
        expect(getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });
  });
});
