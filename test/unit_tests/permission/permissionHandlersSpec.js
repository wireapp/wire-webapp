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

import {
  getPermissionState,
  setPermissionState,
  getPermissionStates,
  initializePermissions,
  isPermissionGranted,
} from 'Repositories/permission/permissionHandlers';
import {BrowserPermissionStatus} from 'Repositories/permission/BrowserPermissionStatus';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {permissionsStore} from 'Repositories/permission/usePermissionsStore';

describe('Permission Handlers', () => {
  beforeEach(() => {
    // Reset the store before each test
    permissionsStore.getState().setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.GEO_LOCATION, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, BrowserPermissionStatus.PROMPT);
  });

  describe('initializePermissions', () => {
    it('should keep the default PROMPT value if permissionAPI is not available', async () => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      await initializePermissions();

      // Wait for any async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      Object.values(PermissionType).forEach(permissionType => {
        expect(getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });

    it("should query the browser's permission if permissionAPI is available", async () => {
      const states = {
        [PermissionType.CAMERA]: {state: BrowserPermissionStatus.GRANTED},
        [PermissionType.GEO_LOCATION]: {state: BrowserPermissionStatus.PROMPT},
        [PermissionType.MICROPHONE]: {state: BrowserPermissionStatus.DENIED},
        [PermissionType.NOTIFICATIONS]: {state: BrowserPermissionStatus.GRANTED},
      };

      spyOn(navigator.permissions, 'query').and.callFake(type => {
        return Promise.resolve(states[type.name]);
      });

      await initializePermissions();

      // Wait for async permission queries to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      Object.entries(states).forEach(([type, expectedState]) => {
        expect(getPermissionState(type)).toBe(expectedState.state);
      });
    });

    it('should keep the default values if one permission type is not supported by the browser', async () => {
      const states = {
        [PermissionType.CAMERA]: {state: BrowserPermissionStatus.GRANTED},
        [PermissionType.GEO_LOCATION]: {state: BrowserPermissionStatus.GRANTED},
        [PermissionType.MICROPHONE]: {state: BrowserPermissionStatus.GRANTED},
      };

      spyOn(navigator.permissions, 'query').and.callFake(type => {
        if (!states[type.name]) {
          return Promise.reject(new Error(`permission type ${type} not supported`));
        }
        return Promise.resolve(states[type.name]);
      });

      await initializePermissions();

      // Wait for async permission queries to complete/fail
      await new Promise(resolve => setTimeout(resolve, 10));

      getPermissionStates(Object.keys(states)).forEach(({state, type}) => {
        expect(state).toBe(states[type].state);
      });
      const notificationPermissionState = getPermissionState(PermissionType.NOTIFICATIONS);
      expect(notificationPermissionState).toBe(BrowserPermissionStatus.PROMPT);
    });
  });

  describe('getPermissionState', () => {
    it('should return the current permission state from the store', () => {
      // Set a permission state directly in the store
      permissionsStore.getState().setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);

      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
    });

    it('should return PROMPT by default for all permission types', () => {
      Object.values(PermissionType).forEach(permissionType => {
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
      // Set up different states
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
      const results = getPermissionStates([]);
      expect(results).toEqual([]);
    });

    it('should filter out invalid permission types', () => {
      const results = getPermissionStates(['invalid-permission']);
      expect(results).toEqual([]);
    });
  });

  describe('isPermissionGranted', () => {
    it('should return true when permission is granted', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      expect(isPermissionGranted(PermissionType.CAMERA)).toBe(true);
    });

    it('should return false when permission is denied', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.DENIED);
      expect(isPermissionGranted(PermissionType.CAMERA)).toBe(false);
    });

    it('should return false when permission is prompt', () => {
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.PROMPT);
      expect(isPermissionGranted(PermissionType.CAMERA)).toBe(false);
    });
  });

  describe('store integration', () => {
    it('should maintain consistency between functions and store', () => {
      const newState = BrowserPermissionStatus.GRANTED;

      // Update via function
      setPermissionState(PermissionType.CAMERA, newState);

      // Verify consistency
      expect(getPermissionState(PermissionType.CAMERA)).toBe(newState);
      expect(permissionsStore.getState().permissions[PermissionType.CAMERA]).toBe(newState);
      expect(permissionsStore.getState().getPermissionState(PermissionType.CAMERA)).toBe(newState);
    });

    it('should reflect store changes made directly', () => {
      const newState = BrowserPermissionStatus.DENIED;

      // Update store directly
      permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, newState);

      // Verify function reflects the change
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(newState);
    });
  });

  describe('browser permission API integration', () => {
    it('should handle permission changes from browser', async () => {
      const mockPermissionStatus = {
        state: BrowserPermissionStatus.GRANTED,
        onchange: null,
      };

      spyOn(navigator.permissions, 'query').and.returnValue(Promise.resolve(mockPermissionStatus));

      await initializePermissions();

      // Wait for async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Initial state should be set for notifications (the first permission type that gets processed)
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.GRANTED);

      // Simulate browser permission change
      mockPermissionStatus.state = BrowserPermissionStatus.DENIED;

      if (mockPermissionStatus.onchange) {
        mockPermissionStatus.onchange();
      }

      // Should reflect the change immediately (Zustand updates are synchronous)
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.DENIED);
    });

    it('should handle permission query failures gracefully', async () => {
      spyOn(navigator.permissions, 'query').and.returnValue(Promise.reject(new Error('Not supported')));

      await initializePermissions();

      // Wait for async initialization to complete/fail
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should maintain default states when queries fail
      Object.values(PermissionType).forEach(permissionType => {
        expect(getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });
  });
});
