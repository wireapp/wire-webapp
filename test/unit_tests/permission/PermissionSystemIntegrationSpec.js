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
import {
  getPermissionState,
  setPermissionState,
  getPermissionStates,
  initializePermissions,
} from 'Repositories/permission/permissionHandlers';
import {BrowserPermissionStatus} from 'Repositories/permission/BrowserPermissionStatus';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {permissionsStore, normalizePermissionState} from 'Repositories/permission/usePermissionsStore';

// Mock the NotificationRepository for integration testing
class MockNotificationRepository {
  constructor() {}

  updatePermissionState(permissionState) {
    const normalizedState = normalizePermissionState(permissionState);
    setPermissionState(PermissionType.NOTIFICATIONS, normalizedState);
    return this.checkPermissionState();
  }

  checkPermissionState() {
    const permissionState = getPermissionState(PermissionType.NOTIFICATIONS);
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
  let notificationRepository;

  beforeEach(() => {
    // Reset permissions store before each test
    permissionsStore.getState().setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.GEO_LOCATION, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, BrowserPermissionStatus.PROMPT);

    notificationRepository = new MockNotificationRepository();
  });

  afterEach(() => {
    // Clean up spies after each test
    if (navigator.permissions && navigator.permissions.isSpy) {
      navigator.permissions.and.stub();
    }
  });

  describe('Permission Handlers and NotificationRepository integration', () => {
    it('should work together for notification permissions', () => {
      // Test initial state
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.PROMPT);
      expect(notificationRepository.checkPermissionState()).toBe(undefined);

      // Test granting permission via NotificationRepository
      const result = notificationRepository.updatePermissionState('granted');
      expect(result).toBe(true);
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.GRANTED);

      // Test denying permission
      notificationRepository.updatePermissionState('denied');
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.DENIED);
      expect(notificationRepository.checkPermissionState()).toBe(false);
    });

    it('should handle browser notification permission normalization', () => {
      // Test browser's "default" permission maps to "prompt"
      notificationRepository.updatePermissionState('default');
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.PROMPT);

      // Test other browser permission values
      notificationRepository.updatePermissionState('granted');
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.GRANTED);

      notificationRepository.updatePermissionState('denied');
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.DENIED);
    });

    it('should handle Wire-specific permission states', () => {
      // Test setting Wire-specific states
      setPermissionState(PermissionType.NOTIFICATIONS, AppPermissionState.IGNORED);
      expect(notificationRepository.checkPermissionState()).toBe(false);

      setPermissionState(PermissionType.NOTIFICATIONS, AppPermissionState.UNSUPPORTED);
      expect(notificationRepository.checkPermissionState()).toBe(false);
    });
  });

  describe('Multiple permission types coordination', () => {
    it('should manage different permission types independently', () => {
      // Set different states for different permissions
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);
      setPermissionState(PermissionType.NOTIFICATIONS, BrowserPermissionStatus.PROMPT);
      setPermissionState(PermissionType.GEO_LOCATION, AppPermissionState.UNSUPPORTED);

      // Verify independence
      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);
      expect(getPermissionState(PermissionType.MICROPHONE)).toBe(BrowserPermissionStatus.DENIED);
      expect(getPermissionState(PermissionType.NOTIFICATIONS)).toBe(BrowserPermissionStatus.PROMPT);
      expect(getPermissionState(PermissionType.GEO_LOCATION)).toBe(AppPermissionState.UNSUPPORTED);

      // Verify getPermissionStates works correctly
      const allStates = getPermissionStates(Object.values(PermissionType));
      expect(allStates).toEqual([
        {state: BrowserPermissionStatus.GRANTED, type: PermissionType.CAMERA},
        {state: AppPermissionState.UNSUPPORTED, type: PermissionType.GEO_LOCATION},
        {state: BrowserPermissionStatus.DENIED, type: PermissionType.MICROPHONE},
        {state: BrowserPermissionStatus.PROMPT, type: PermissionType.NOTIFICATIONS},
      ]);
    });
  });

  describe('Store persistence and reactivity', () => {
    it('should maintain state consistency across different calls', () => {
      // Set a state via function call
      setPermissionState(PermissionType.CAMERA, BrowserPermissionStatus.GRANTED);

      // Verify state is maintained when accessed from different functions
      expect(getPermissionState(PermissionType.CAMERA)).toBe(BrowserPermissionStatus.GRANTED);

      // Check state from store directly
      expect(permissionsStore.getState().getPermissionState(PermissionType.CAMERA)).toBe(
        BrowserPermissionStatus.GRANTED,
      );
    });

    it('should notify of state changes', () => {
      const subscriber = jest.fn();
      const unsubscribe = permissionsStore.subscribe(subscriber);

      // Change state
      setPermissionState(PermissionType.MICROPHONE, BrowserPermissionStatus.DENIED);

      // Should notify subscriber
      expect(subscriber).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid permission types gracefully', () => {
      // This should not throw but return empty array for invalid types
      const result = getPermissionStates(['invalid-permission']);
      expect(result).toEqual([]);
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
        setPermissionState(permissionType, state);
        expect(getPermissionState(permissionType)).toBe(state);
      });
    });

    it('should handle browser permission API failures', async () => {
      // Reset and setup mock that fails
      spyOn(navigator.permissions, 'query').and.callFake(() =>
        Promise.reject(new Error('Permission API not supported')),
      );

      await initializePermissions();

      // Wait for async permission queries to complete/fail
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should maintain default states when API fails
      Object.values(PermissionType).forEach(permissionType => {
        expect(getPermissionState(permissionType)).toBe(BrowserPermissionStatus.PROMPT);
      });
    });
  });
});
