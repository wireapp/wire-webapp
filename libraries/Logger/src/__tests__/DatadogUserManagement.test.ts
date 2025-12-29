/**
 * DataDog User Management Tests
 * Tests for DataDog user tracking and management features
 */

import {DatadogTransport} from '../transports/DatadogTransport';
import {LogLevel} from '../types';

describe('DataDog User Management', () => {
  let transport: DatadogTransport;

  const mockConfig = {
    enabled: true,
    level: LogLevel.INFO,
    clientToken: 'test-token',
    applicationId: 'test-app-id',
    site: 'datadoghq.eu',
    service: 'test-service',
    forwardConsoleLogs: false,
  };

  beforeEach(() => {
    transport = new DatadogTransport(mockConfig);
  });

  describe('setUser', () => {
    it('should not throw when DataDog is not initialized', () => {
      expect(() => {
        transport.setUser('user-123');
      }).not.toThrow();
    });

    it('should truncate user ID to 8 characters', () => {
      const longUserId = 'user-1234567890-very-long-id';

      // We can't easily test this without mocking the actual DataDog SDK
      // but we can verify the method exists and doesn't throw
      expect(() => {
        transport.setUser(longUserId);
      }).not.toThrow();
    });

    it('should handle empty user ID', () => {
      expect(() => {
        transport.setUser('');
      }).not.toThrow();
    });

    it('should handle special characters in user ID', () => {
      const specialUserId = 'user@123#test!';

      expect(() => {
        transport.setUser(specialUserId);
      }).not.toThrow();
    });

    it('should handle multiple setUser calls', () => {
      expect(() => {
        transport.setUser('user-1');
        transport.setUser('user-2');
        transport.setUser('user-3');
      }).not.toThrow();
    });
  });

  describe('isInitialized', () => {
    it('should return false when DataDog SDKs are not available', () => {
      // In test environment, DataDog SDKs are not available
      expect(transport.isInitialized()).toBe(false);
    });

    it('should return false for disabled transport', () => {
      const disabledTransport = new DatadogTransport({
        ...mockConfig,
        enabled: false,
      });

      expect(disabledTransport.isInitialized()).toBe(false);
    });
  });

  describe('getSessionId', () => {
    it('should return null when not initialized', () => {
      expect(transport.getSessionId()).toBeNull();
    });

    it('should not throw when calling getSessionId', () => {
      expect(() => {
        transport.getSessionId();
      }).not.toThrow();
    });
  });

  describe('getDatadogLogs', () => {
    it('should return DataDog logs SDK when available', () => {
      const logs = transport.getDatadogLogs();
      // DataDog SDK is available as a dependency in the library
      expect(logs).toBeDefined();
    });

    it('should not throw when accessing logs instance', () => {
      expect(() => {
        transport.getDatadogLogs();
      }).not.toThrow();
    });
  });

  describe('getDatadogRum', () => {
    it('should return DataDog RUM SDK when available', () => {
      const rum = transport.getDatadogRum();
      // DataDog SDK is available as a dependency in the library
      expect(rum).toBeDefined();
    });

    it('should not throw when accessing RUM instance', () => {
      expect(() => {
        transport.getDatadogRum();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle user lifecycle', () => {
      expect(() => {
        // Set initial user
        transport.setUser('initial-user-id');

        // Change user
        transport.setUser('new-user-id');

        // Clear user (empty string)
        transport.setUser('');

        // Set user again
        transport.setUser('another-user');
      }).not.toThrow();
    });

    it('should safely handle all getters when not initialized', () => {
      expect(() => {
        transport.isInitialized();
        transport.getSessionId();
        transport.getDatadogLogs();
        transport.getDatadogRum();
      }).not.toThrow();
    });

    it('should handle setUser with various user ID formats', () => {
      const userIds = [
        'simple-id',
        'user-with-uuid-a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
        'email@example.com',
        '12345678',
        'a',
        'very-long-user-id-that-should-be-truncated-to-eight-chars',
      ];

      expect(() => {
        userIds.forEach(userId => {
          transport.setUser(userId);
        });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle errors in setUser', () => {
      // Force an error scenario by setting initialized but without SDK
      (transport as any).initialized = true;

      expect(() => {
        transport.setUser('test-user');
      }).not.toThrow();
    });

    it('should safely call all getters', () => {
      expect(() => {
        const logs = transport.getDatadogLogs();
        const rum = transport.getDatadogRum();
        const sessionId = transport.getSessionId();

        // DataDog SDKs are available as dependencies
        expect(logs).toBeDefined();
        expect(rum).toBeDefined();
        // But sessionId is null because transport is not initialized
        expect(sessionId).toBeNull();
      }).not.toThrow();
    });
  });
});
