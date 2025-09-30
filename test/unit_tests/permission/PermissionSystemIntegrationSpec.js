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

import {PermissionState} from 'Repositories/notification/PermissionState';
import {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionStatusState} from 'Repositories/permission/PermissionStatusState';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {permissionsStore, normalizePermissionState} from 'Repositories/permission/usePermissionsStore';

// Mock the NotificationRepository for integration testing
class MockNotificationRepository {
  constructor(permissionRepository) {
    this.permissionRepository = permissionRepository;
  }

  updatePermissionState(permissionState) {
    const normalizedState = normalizePermissionState(permissionState);
    this.permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, normalizedState);
    return this.checkPermissionState();
  }

  checkPermissionState() {
    const permissionState = this.permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS);
    switch (permissionState) {
      case PermissionStatusState.GRANTED:
        return true;
      case PermissionState.IGNORED:
      case PermissionState.UNSUPPORTED:
      case PermissionStatusState.DENIED:
        return false;
      default:
        return undefined;
    }
  }
}

describe('Permission System Integration', () => {
  let permissionRepository;
  let notificationRepository;

  beforeEach(() => {
    // Reset store
    permissionsStore.getState().setPermissionState(PermissionType.CAMERA, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.GEO_LOCATION, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, PermissionStatusState.PROMPT);

    // Mock navigator.permissions
    spyOn(navigator, 'permissions').and.returnValue(undefined);

    permissionRepository = new PermissionRepository();
    notificationRepository = new MockNotificationRepository(permissionRepository);
  });

  afterEach(() => {
    // Clean up spies after each test
    if (navigator.permissions && navigator.permissions.isSpy) {
      navigator.permissions.and.stub();
    }
  });

  describe('PermissionRepository and NotificationRepository integration', () => {
    it('should work together for notification permissions', () => {
      // Test initial state
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.PROMPT);
      expect(notificationRepository.checkPermissionState()).toBe(undefined);

      // Test granting permission via NotificationRepository
      const result = notificationRepository.updatePermissionState('granted');
      expect(result).toBe(true);
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.GRANTED);

      // Test denying permission
      notificationRepository.updatePermissionState('denied');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.DENIED);
      expect(notificationRepository.checkPermissionState()).toBe(false);
    });

    it('should handle browser notification permission normalization', () => {
      // Test browser's "default" permission maps to "prompt"
      notificationRepository.updatePermissionState('default');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.PROMPT);

      // Test other browser permission values
      notificationRepository.updatePermissionState('granted');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.GRANTED);

      notificationRepository.updatePermissionState('denied');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.DENIED);
    });

    it('should handle Wire-specific permission states', () => {
      // Test setting Wire-specific states
      permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, PermissionState.IGNORED);
      expect(notificationRepository.checkPermissionState()).toBe(false);

      permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, PermissionState.UNSUPPORTED);
      expect(notificationRepository.checkPermissionState()).toBe(false);
    });
  });

  describe('Multiple permission types coordination', () => {
    it('should manage different permission types independently', () => {
      // Set different states for different permissions
      permissionRepository.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);
      permissionRepository.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);
      permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, PermissionStatusState.PROMPT);
      permissionRepository.setPermissionState(PermissionType.GEO_LOCATION, PermissionState.UNSUPPORTED);

      // Verify independence
      expect(permissionRepository.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);
      expect(permissionRepository.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.DENIED);
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.PROMPT);
      expect(permissionRepository.getPermissionState(PermissionType.GEO_LOCATION)).toBe(PermissionState.UNSUPPORTED);

      // Verify getPermissionStates works correctly
      const allStates = permissionRepository.getPermissionStates(Object.values(PermissionType));
      expect(allStates).toEqual([
        {state: PermissionStatusState.GRANTED, type: PermissionType.CAMERA},
        {state: PermissionState.UNSUPPORTED, type: PermissionType.GEO_LOCATION},
        {state: PermissionStatusState.DENIED, type: PermissionType.MICROPHONE},
        {state: PermissionStatusState.PROMPT, type: PermissionType.NOTIFICATIONS},
      ]);
    });
  });

  describe('Store persistence and reactivity', () => {
    it('should maintain state consistency across repository instances', () => {
      // Set a state via first repository
      permissionRepository.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);

      // Create a new repository instance
      const secondRepository = new PermissionRepository();

      // Should get the same state (from store)
      expect(secondRepository.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);
    });

    it('should notify of state changes', () => {
      const subscriber = jest.fn();
      const unsubscribe = permissionsStore.subscribe(subscriber);

      // Change state
      permissionRepository.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);

      // Should notify subscriber
      expect(subscriber).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid permission types gracefully', () => {
      // This should not throw
      expect(() => {
        permissionRepository.getPermissionStates(['invalid-permission']);
      }).not.toThrow();
    });

    it('should handle permission state transitions correctly', () => {
      const permissionType = PermissionType.CAMERA;

      // Test all possible state transitions
      const states = [
        PermissionStatusState.PROMPT,
        PermissionStatusState.GRANTED,
        PermissionStatusState.DENIED,
        PermissionState.IGNORED,
        PermissionState.UNSUPPORTED,
      ];

      states.forEach(state => {
        permissionRepository.setPermissionState(permissionType, state);
        expect(permissionRepository.getPermissionState(permissionType)).toBe(state);
      });
    });

    it('should handle browser permission API failures', async () => {
      // Reset and setup mock that fails (reuse existing spy)
      navigator.permissions.and.returnValue({
        query: () => Promise.reject(new Error('Permission API not supported')),
      });

      const failingRepository = new PermissionRepository();

      // Wait for async permission queries to complete/fail
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should maintain default states when API fails
      Object.values(PermissionType).forEach(permissionType => {
        expect(failingRepository.getPermissionState(permissionType)).toBe(PermissionStatusState.PROMPT);
      });
    });
  });
});
