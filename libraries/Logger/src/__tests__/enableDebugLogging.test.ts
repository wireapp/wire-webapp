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

import {enableDebugLogging, disableDebugLogging, getDebugLogging} from '../debug/enableDebugLogging';

describe('enableDebugLogging', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    // Create mock storage
    const store: Record<string, string> = {};
    mockStorage = {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
      length: Object.keys(store).length,
    };
  });

  describe('enableDebugLogging', () => {
    it('should enable debug logging with explicit namespace', () => {
      enableDebugLogging({namespace: '@wireapp/webapp/*', storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '@wireapp/webapp/*');
    });

    it('should enable all logs with wildcard', () => {
      enableDebugLogging({namespace: '*', storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '*');
    });

    it('should read namespace from URL parameters', () => {
      const urlParams = new URLSearchParams('?enableLogging=@wireapp/webapp/calling');
      enableDebugLogging({urlParams, storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '@wireapp/webapp/calling');
    });

    it('should read namespace from URL string', () => {
      enableDebugLogging({urlParams: '?enableLogging=@wireapp/webapp/*', storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '@wireapp/webapp/*');
    });

    it('should enable all logs when force is true', () => {
      enableDebugLogging({force: true, storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '*');
    });

    it('should prioritize explicit namespace over URL params', () => {
      const urlParams = new URLSearchParams('?enableLogging=@wireapp/webapp/calling');
      enableDebugLogging({namespace: '@wireapp/webapp/*', urlParams, storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '@wireapp/webapp/*');
    });

    it('should prioritize explicit namespace over force flag', () => {
      enableDebugLogging({namespace: '@wireapp/webapp/calling', force: true, storage: mockStorage});
      expect(mockStorage.setItem).toHaveBeenCalledWith('debug', '@wireapp/webapp/calling');
    });

    it('should remove debug key when no namespace provided', () => {
      enableDebugLogging({storage: mockStorage});
      expect(mockStorage.removeItem).toHaveBeenCalledWith('debug');
    });

    it('should handle missing URL parameter', () => {
      const urlParams = new URLSearchParams('?other=value');
      enableDebugLogging({urlParams, storage: mockStorage});
      expect(mockStorage.removeItem).toHaveBeenCalledWith('debug');
    });

    it('should handle empty URL parameter value', () => {
      const urlParams = new URLSearchParams('?enableLogging=');
      enableDebugLogging({urlParams, storage: mockStorage});
      expect(mockStorage.removeItem).toHaveBeenCalledWith('debug');
    });

    it('should handle storage being unavailable', () => {
      // Should not throw
      expect(() => enableDebugLogging({namespace: '*', storage: undefined as any})).not.toThrow();
    });
  });

  describe('disableDebugLogging', () => {
    it('should remove debug key from storage', () => {
      mockStorage.setItem('debug', '*');
      disableDebugLogging(mockStorage);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('debug');
    });

    it('should handle storage being unavailable', () => {
      // Should not throw
      expect(() => disableDebugLogging(undefined as any)).not.toThrow();
    });
  });

  describe('getDebugLogging', () => {
    it('should return current debug namespace', () => {
      mockStorage.setItem('debug', '@wireapp/webapp/*');
      const result = getDebugLogging(mockStorage);
      expect(result).toBe('@wireapp/webapp/*');
    });

    it('should return null when debug logging is disabled', () => {
      const result = getDebugLogging(mockStorage);
      expect(result).toBeNull();
    });

    it('should handle storage being unavailable', () => {
      const result = getDebugLogging(undefined as any);
      expect(result).toBeNull();
    });
  });

  describe('integration with logdown', () => {
    it('should enable specific logger namespace', () => {
      enableDebugLogging({namespace: '@wireapp/webapp/calling', storage: mockStorage});
      expect(mockStorage.getItem('debug')).toBe('@wireapp/webapp/calling');
    });

    it('should support wildcard patterns', () => {
      enableDebugLogging({namespace: '@wireapp/webapp/*', storage: mockStorage});
      expect(mockStorage.getItem('debug')).toBe('@wireapp/webapp/*');
    });

    it('should enable all loggers', () => {
      enableDebugLogging({namespace: '*', storage: mockStorage});
      expect(mockStorage.getItem('debug')).toBe('*');
    });
  });
});
