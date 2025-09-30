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

import {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionStatusState} from 'Repositories/permission/PermissionStatusState';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {permissionsStore} from 'Repositories/permission/usePermissionsStore';

describe('PermissionRepository', () => {
  let permissionRepository;

  beforeEach(() => {
    // Reset the store before each test
    permissionsStore.getState().setPermissionState(PermissionType.CAMERA, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.GEO_LOCATION, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, PermissionStatusState.PROMPT);
  });

  describe('constructor', () => {
    it('should keep the default PROMPT value if permissionAPI is not available', async () => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      permissionRepository = new PermissionRepository();

      // Wait for any async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      Object.values(PermissionType).forEach(permissionType => {
        expect(permissionRepository.getPermissionState(permissionType)).toBe(PermissionStatusState.PROMPT);
      });
    });

    it("should query the browser's permission if permissionAPI is available", async () => {
      const states = {
        [PermissionType.CAMERA]: {state: PermissionStatusState.GRANTED},
        [PermissionType.GEO_LOCATION]: {state: PermissionStatusState.PROMPT},
        [PermissionType.MICROPHONE]: {state: PermissionStatusState.DENIED},
        [PermissionType.NOTIFICATIONS]: {state: PermissionStatusState.GRANTED},
      };

      spyOn(navigator.permissions, 'query').and.callFake(type => {
        return Promise.resolve(states[type.name]);
      });

      permissionRepository = new PermissionRepository();

      // Wait for async permission queries to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      Object.entries(states).forEach(([type, expectedState]) => {
        expect(permissionRepository.getPermissionState(type)).toBe(expectedState.state);
      });
    });

    it('should keep the default values if one permission type is not supported by the browser', async () => {
      const states = {
        [PermissionType.CAMERA]: {state: PermissionStatusState.GRANTED},
        [PermissionType.GEO_LOCATION]: {state: PermissionStatusState.GRANTED},
        [PermissionType.MICROPHONE]: {state: PermissionStatusState.GRANTED},
      };

      spyOn(navigator.permissions, 'query').and.callFake(type => {
        if (!states[type.name]) {
          return Promise.reject(new Error(`permission type ${type} not supported`));
        }
        return Promise.resolve(states[type.name]);
      });

      permissionRepository = new PermissionRepository();

      // Wait for async permission queries to complete/fail
      await new Promise(resolve => setTimeout(resolve, 10));

      permissionRepository.getPermissionStates(Object.keys(states)).forEach(({state, type}) => {
        expect(state).toBe(states[type].state);
      });
      const notificationPermissionState = permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);
      expect(notificationPermissionState).toBe(PermissionStatusState.PROMPT);
    });
  });

  describe('getPermissionState', () => {
    beforeEach(() => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      permissionRepository = new PermissionRepository();
    });

    it('should return the current permission state from the store', () => {
      // Set a permission state directly in the store
      permissionsStore.getState().setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);

      expect(permissionRepository.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);
    });

    it('should return PROMPT by default for all permission types', () => {
      Object.values(PermissionType).forEach(permissionType => {
        expect(permissionRepository.getPermissionState(permissionType)).toBe(PermissionStatusState.PROMPT);
      });
    });
  });

  describe('setPermissionState', () => {
    beforeEach(() => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      permissionRepository = new PermissionRepository();
    });

    it('should update the permission state in the store', () => {
      permissionRepository.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);

      expect(permissionRepository.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.DENIED);
      expect(permissionsStore.getState().permissions[PermissionType.MICROPHONE]).toBe(PermissionStatusState.DENIED);
    });

    it('should not affect other permission states when setting one', () => {
      permissionRepository.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);

      expect(permissionRepository.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);
      expect(permissionRepository.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.PROMPT);
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.PROMPT);
    });
  });

  describe('getPermissionStates', () => {
    beforeEach(() => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      permissionRepository = new PermissionRepository();
    });

    it('should return permission states for multiple types', () => {
      // Set up different states
      permissionRepository.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);
      permissionRepository.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);

      const permissionTypes = [PermissionType.CAMERA, PermissionType.MICROPHONE, PermissionType.NOTIFICATIONS];
      const results = permissionRepository.getPermissionStates(permissionTypes);

      expect(results).toEqual([
        {state: PermissionStatusState.GRANTED, type: PermissionType.CAMERA},
        {state: PermissionStatusState.DENIED, type: PermissionType.MICROPHONE},
        {state: PermissionStatusState.PROMPT, type: PermissionType.NOTIFICATIONS},
      ]);
    });

    it('should return empty array for empty input', () => {
      const results = permissionRepository.getPermissionStates([]);
      expect(results).toEqual([]);
    });
  });

  describe('store integration', () => {
    beforeEach(() => {
      spyOn(navigator, 'permissions').and.returnValue(undefined);
      permissionRepository = new PermissionRepository();
    });

    it('should maintain consistency between repository and store', () => {
      const newState = PermissionStatusState.GRANTED;

      // Update via repository
      permissionRepository.setPermissionState(PermissionType.CAMERA, newState);

      // Verify consistency
      expect(permissionRepository.getPermissionState(PermissionType.CAMERA)).toBe(newState);
      expect(permissionsStore.getState().permissions[PermissionType.CAMERA]).toBe(newState);
      expect(permissionsStore.getState().getPermissionState(PermissionType.CAMERA)).toBe(newState);
    });

    it('should reflect store changes made directly', () => {
      const newState = PermissionStatusState.DENIED;

      // Update store directly
      permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, newState);

      // Verify repository reflects the change
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(newState);
    });
  });

  describe('browser permission API integration', () => {
    it('should handle permission changes from browser', async () => {
      const mockPermissionStatus = {
        state: PermissionStatusState.GRANTED,
        onchange: null,
      };

      spyOn(navigator.permissions, 'query').and.returnValue(Promise.resolve(mockPermissionStatus));

      permissionRepository = new PermissionRepository();

      // Wait for async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Initial state should be set for notifications (the first permission type that gets processed)
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.GRANTED);

      // Simulate browser permission change
      mockPermissionStatus.state = PermissionStatusState.DENIED;

      if (mockPermissionStatus.onchange) {
        mockPermissionStatus.onchange();
      }

      // Should reflect the change immediately (Zustand updates are synchronous)
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.DENIED);
    });

    it('should handle permission query failures gracefully', async () => {
      spyOn(navigator.permissions, 'query').and.returnValue(Promise.reject(new Error('Not supported')));

      permissionRepository = new PermissionRepository();

      // Wait for async initialization to complete/fail
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should maintain default states when queries fail
      Object.values(PermissionType).forEach(permissionType => {
        expect(permissionRepository.getPermissionState(permissionType)).toBe(PermissionStatusState.PROMPT);
      });
    });
  });
});
