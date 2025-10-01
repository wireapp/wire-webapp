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
import {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {BrowserPermissionStatus} from 'Repositories/permission/BrowserPermissionStatus';
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
      case BrowserPermissionStatus.GRANTED:
        return true;
      case AppPermissionState.IGNORED:
      case AppPermissionState.UNSUPPORTED:
      case BrowserPermissionStatus.DENIED:
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
    permissionsStore.getState().setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.GEO_LOCATION, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, BrowserPermissionStatus.PROMPT);

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
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.PROMPT,
      );
      expect(notificationRepository.checkPermissionState()).toBe(undefined);

      // Test granting permission via NotificationRepository
      const result = notificationRepository.updatePermissionState('granted');
      expect(result).toBe(true);
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.GRANTED,
      );

      // Test denying permission
      notificationRepository.updatePermissionState('denied');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.DENIED,
      );
      expect(notificationRepository.checkPermissionState()).toBe(false);
    });

    it('should handle browser notification permission normalization', () => {
      // Test browser's "default" permission maps to "prompt"
      notificationRepository.updatePermissionState('default');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.PROMPT,
      );

      // Test other browser permission values
      notificationRepository.updatePermissionState('granted');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.GRANTED,
      );

      notificationRepository.updatePermissionState('denied');
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.DENIED,
      );
    });

    it('should handle Wire-specific permission states', () => {
      // Test setting Wire-specific states
      permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, AppPermissionState.IGNORED);
      expect(notificationRepository.checkPermissionState()).toBe(false);

      permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, AppPermissionState.UNSUPPORTED);
      expect(notificationRepository.checkPermissionState()).toBe(false);
    });
  });

  describe('Multiple permission types coordination', () => {
    it('should manage different permission types independently', () => {
      // Set different states for different permissions
      permissionRepository.setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      permissionRepository.setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);
      permissionRepository.setPermissionState(PermissionType.NOTIFICATIONS, BrowserPermissionStatus.PROMPT);
      permissionRepository.setPermissionState(PermissionType.GEO_LOCATION, AppPermissionState.UNSUPPORTED);

      // Verify independence
      expect(permissionRepository.getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
      expect(permissionRepository.getPermissionState(PermissionType.MICROPHONE)).toBe(BrowserPermissionStatus.DENIED);
      expect(permissionRepository.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(
        BrowserPermissionStatus.PROMPT,
      );
      expect(permissionRepository.getPermissionState(PermissionType.GEO_LOCATION)).toBe(AppPermissionState.UNSUPPORTED);

      // Verify getPermissionStates works correctly
      const allStates = permissionRepository.getPermissionStates(Object.values(PermissionType));
      expect(allStates).toEqual([
        {state: BrowserPermissionStatus.GRANTED, type: PermissionType.CAMERA},
        {state: AppPermissionState.UNSUPPORTED, type: PermissionType.GEO_LOCATION},
        {state: BrowserPermissionStatus.DENIED, type: PermissionType.MICROPHONE},
        {state: BrowserPermissionStatus.PROMPT, type: PermissionType.NOTIFICATIONS},
      ]);
    });
  });

  describe('Store persistence and reactivity', () => {
    it('should maintain state consistency across repository instances', () => {
      // Set a state via first repository
      permissionRepository.setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);

      // Create a new repository instance
      const secondRepository = new PermissionRepository();

      // Should get the same state (from store)
      expect(secondRepository.getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
    });

    it('should notify of state changes', () => {
      const subscriber = jest.fn();
      const unsubscribe = permissionsStore.subscribe(subscriber);

      // Change state
      permissionRepository.setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);

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
        BrowserPermissionStatus.PROMPT,
        BrowserPermissionStatus.GRANTED,
        BrowserPermissionStatus.DENIED,
        AppPermissionState.IGNORED,
        AppPermissionState.UNSUPPORTED,
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
        expect(failingRepository.getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });
  });
});
