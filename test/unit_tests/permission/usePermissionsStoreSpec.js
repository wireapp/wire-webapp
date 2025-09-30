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
import {PermissionStatusState} from 'Repositories/permission/PermissionStatusState';
import {PermissionType} from 'Repositories/permission/PermissionType';
import {permissionsStore, normalizePermissionState} from 'Repositories/permission/usePermissionsStore';

describe('usePermissionsStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    permissionsStore.getState().setPermissionState(PermissionType.CAMERA, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.GEO_LOCATION, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.PROMPT);
    permissionsStore.getState().setPermissionState(PermissionType.NOTIFICATIONS, PermissionStatusState.PROMPT);
  });

  describe('initial state', () => {
    it('should initialize all permissions to PROMPT', () => {
      const state = permissionsStore.getState();

      Object.values(PermissionType).forEach(permissionType => {
        expect(state.permissions[permissionType]).toBe(PermissionStatusState.PROMPT);
      });
    });

    it('should have all required permission types', () => {
      const state = permissionsStore.getState();

      expect(state.permissions).toHaveProperty(PermissionType.CAMERA);
      expect(state.permissions).toHaveProperty(PermissionType.GEO_LOCATION);
      expect(state.permissions).toHaveProperty(PermissionType.MICROPHONE);
      expect(state.permissions).toHaveProperty(PermissionType.NOTIFICATIONS);
    });
  });

  describe('getPermissionState', () => {
    it('should return the correct permission state', () => {
      const state = permissionsStore.getState();

      // Set a specific state
      state.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);

      expect(state.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);
      expect(state.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.PROMPT);
    });
  });

  describe('setPermissionState', () => {
    it('should update the permission state correctly', () => {
      const state = permissionsStore.getState();

      state.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);

      // Get fresh state after mutation
      const updatedState = permissionsStore.getState();
      expect(updatedState.permissions[PermissionType.MICROPHONE]).toBe(PermissionStatusState.DENIED);
      expect(updatedState.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.DENIED);
    });

    it('should not affect other permission states', () => {
      const state = permissionsStore.getState();

      state.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);

      expect(state.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);
      expect(state.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.PROMPT);
      expect(state.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionStatusState.PROMPT);
      expect(state.getPermissionState(PermissionType.GEO_LOCATION)).toBe(PermissionStatusState.PROMPT);
    });

    it('should accept both PermissionState and PermissionStatusState values', () => {
      const state = permissionsStore.getState();

      // Test PermissionStatusState
      state.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);
      expect(state.getPermissionState(PermissionType.CAMERA)).toBe(PermissionStatusState.GRANTED);

      // Test PermissionState
      state.setPermissionState(PermissionType.NOTIFICATIONS, PermissionState.IGNORED);
      expect(state.getPermissionState(PermissionType.NOTIFICATIONS)).toBe(PermissionState.IGNORED);
    });
  });

  describe('getPermissionStates', () => {
    it('should return states for multiple permission types', () => {
      const state = permissionsStore.getState();

      // Set up different states
      state.setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);
      state.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);

      const permissionTypes = [PermissionType.CAMERA, PermissionType.MICROPHONE, PermissionType.NOTIFICATIONS];
      const results = state.getPermissionStates(permissionTypes);

      expect(results).toEqual([
        {state: PermissionStatusState.GRANTED, type: PermissionType.CAMERA},
        {state: PermissionStatusState.DENIED, type: PermissionType.MICROPHONE},
        {state: PermissionStatusState.PROMPT, type: PermissionType.NOTIFICATIONS},
      ]);
    });

    it('should return empty array for empty input', () => {
      const state = permissionsStore.getState();
      const results = state.getPermissionStates([]);

      expect(results).toEqual([]);
    });

    it('should maintain correct order of results', () => {
      const state = permissionsStore.getState();

      const permissionTypes = [PermissionType.NOTIFICATIONS, PermissionType.CAMERA, PermissionType.GEO_LOCATION];
      const results = state.getPermissionStates(permissionTypes);

      expect(results.map(r => r.type)).toEqual(permissionTypes);
    });
  });

  describe('store reactivity', () => {
    it('should notify subscribers when state changes', () => {
      const subscriber = jest.fn();

      // Subscribe to store changes
      const unsubscribe = permissionsStore.subscribe(subscriber);

      // Change a permission state
      permissionsStore.getState().setPermissionState(PermissionType.CAMERA, PermissionStatusState.GRANTED);

      // Should have been called
      expect(subscriber).toHaveBeenCalled();

      unsubscribe();
    });

    it('should provide current state to new subscribers', () => {
      const state = permissionsStore.getState();

      // Set a state
      state.setPermissionState(PermissionType.MICROPHONE, PermissionStatusState.DENIED);

      // New subscriber should get current state
      const subscriber = jest.fn();
      const unsubscribe = permissionsStore.subscribe(subscriber);

      // Get current state
      const currentState = permissionsStore.getState();
      expect(currentState.getPermissionState(PermissionType.MICROPHONE)).toBe(PermissionStatusState.DENIED);

      unsubscribe();
    });
  });
});

describe('normalizePermissionState', () => {
  it('should normalize browser NotificationPermission values', () => {
    expect(normalizePermissionState('default')).toBe(PermissionStatusState.PROMPT);
    expect(normalizePermissionState('granted')).toBe(PermissionStatusState.GRANTED);
    expect(normalizePermissionState('denied')).toBe(PermissionStatusState.DENIED);
  });

  it('should pass through PermissionStatusState values unchanged', () => {
    expect(normalizePermissionState(PermissionStatusState.PROMPT)).toBe(PermissionStatusState.PROMPT);
    expect(normalizePermissionState(PermissionStatusState.GRANTED)).toBe(PermissionStatusState.GRANTED);
    expect(normalizePermissionState(PermissionStatusState.DENIED)).toBe(PermissionStatusState.DENIED);
  });

  it('should pass through PermissionState values unchanged, except DEFAULT which maps to PROMPT', () => {
    // PermissionState.DEFAULT ('default') should map to PermissionStatusState.PROMPT
    // because they represent the same logical state in our system
    expect(normalizePermissionState(PermissionState.DEFAULT)).toBe(PermissionStatusState.PROMPT);
    expect(normalizePermissionState(PermissionState.GRANTED)).toBe(PermissionStatusState.GRANTED);
    expect(normalizePermissionState(PermissionState.DENIED)).toBe(PermissionStatusState.DENIED);
    expect(normalizePermissionState(PermissionState.IGNORED)).toBe(PermissionState.IGNORED);
    expect(normalizePermissionState(PermissionState.UNSUPPORTED)).toBe(PermissionState.UNSUPPORTED);
  });

  it('should handle edge cases', () => {
    // Test with actual browser permission strings
    expect(normalizePermissionState('default')).toBe(PermissionStatusState.PROMPT);

    // Test consistency - multiple calls should return same result
    const result1 = normalizePermissionState('default');
    const result2 = normalizePermissionState('default');
    expect(result1).toBe(result2);
  });
});
