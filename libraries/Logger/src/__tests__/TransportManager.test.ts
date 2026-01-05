/**
 * TransportManager Tests
 * Tests for transport coordination and routing
 */

import {TransportManager} from '../transports/TransportManager';
import {ConsoleTransport} from '../transports/ConsoleTransport';
import {FileTransport} from '../transports/FileTransport';
import {DatadogTransport} from '../transports/DatadogTransport';
import {LogLevel, SafetyLevel, LogEntry, Transport, TransportConfig} from '../types';

// Mock the transports
jest.mock('../transports/ConsoleTransport');
jest.mock('../transports/FileTransport');
jest.mock('../transports/DatadogTransport');

describe('TransportManager', () => {
  let mockConfig: TransportConfig;
  let testEntry: LogEntry;

  beforeEach(() => {
    // Clear all mock instances
    jest.clearAllMocks();

    mockConfig = {
      console: {enabled: true, level: LogLevel.DEBUG},
      file: {
        enabled: true,
        level: LogLevel.INFO,
        path: './test.log',
        maxSize: 1024,
        maxFiles: 1,
        format: 'json',
      },
      datadog: {
        enabled: true,
        level: LogLevel.WARN,
        clientToken: 'test-token',
        applicationId: 'test-app',
        site: 'datadoghq.eu',
        service: 'test-service',
        forwardConsoleLogs: false,
      },
    };

    testEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: 'Test message',
      loggerName: 'test-logger',
      metadata: {
        correlationId: 'test-id',
        environment: 'test',
      },
    };
  });

  describe('Constructor', () => {
    it('should create transport manager with config', () => {
      const manager = new TransportManager(mockConfig);
      expect(manager).toBeInstanceOf(TransportManager);
    });

    it('should initialize console transport when enabled', () => {
      const manager = new TransportManager(mockConfig);
      expect(ConsoleTransport).toHaveBeenCalledWith(mockConfig.console);
    });

    it('should initialize file transport when enabled', () => {
      const manager = new TransportManager(mockConfig);
      expect(FileTransport).toHaveBeenCalledWith(mockConfig.file);
    });

    it('should initialize datadog transport when enabled', () => {
      const manager = new TransportManager(mockConfig);
      expect(DatadogTransport).toHaveBeenCalledWith(mockConfig.datadog);
    });

    it('should not initialize disabled transports', () => {
      const disabledConfig: TransportConfig = {
        console: {enabled: false, level: LogLevel.DEBUG},
        file: {enabled: false, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      };

      const manager = new TransportManager(disabledConfig);
      expect(ConsoleTransport).not.toHaveBeenCalled();
      expect(FileTransport).not.toHaveBeenCalled();
      expect(DatadogTransport).not.toHaveBeenCalled();
    });
  });

  describe('write', () => {
    it('should write to all enabled transports', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock shouldWrite to return true
      transports.forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockResolvedValue(undefined);
      });

      await manager.write(testEntry);

      transports.forEach(transport => {
        expect(transport.shouldWrite).toHaveBeenCalledWith(testEntry);
        expect(transport.write).toHaveBeenCalledWith(testEntry);
      });
    });

    it('should not write to transports that return false for shouldWrite', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock first transport to reject, others to accept
      (transports[0].shouldWrite as jest.Mock).mockReturnValue(false);
      (transports[0].write as jest.Mock).mockResolvedValue(undefined);

      transports.slice(1).forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockResolvedValue(undefined);
      });

      await manager.write(testEntry);

      expect(transports[0].write).not.toHaveBeenCalled();
      transports.slice(1).forEach(transport => {
        expect(transport.write).toHaveBeenCalledWith(testEntry);
      });
    });

    it('should handle synchronous transport writes', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock to return synchronous (non-promise) result
      transports.forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockReturnValue(undefined);
      });

      await manager.write(testEntry);

      transports.forEach(transport => {
        expect(transport.write).toHaveBeenCalledWith(testEntry);
      });
    });

    it('should handle async transport writes', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock to return promises
      transports.forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockResolvedValue(undefined);
      });

      await manager.write(testEntry);

      transports.forEach(transport => {
        expect(transport.write).toHaveBeenCalledWith(testEntry);
      });
    });

    it('should handle transport write errors gracefully', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock first transport to fail
      (transports[0].shouldWrite as jest.Mock).mockReturnValue(true);
      (transports[0].write as jest.Mock).mockRejectedValue(new Error('Transport error'));

      transports.slice(1).forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockResolvedValue(undefined);
      });

      // Should throw since Promise.all rejects on first error
      await expect(manager.write(testEntry)).rejects.toThrow('Transport error');
    });
  });

  describe('getTransports', () => {
    it('should return all transports', () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      expect(transports).toHaveLength(3); // console, file, datadog
    });

    it('should return a copy of transports array', () => {
      const manager = new TransportManager(mockConfig);
      const transports1 = manager.getTransports();
      const transports2 = manager.getTransports();

      expect(transports1).not.toBe(transports2); // Different array instances
      expect(transports1).toEqual(transports2); // Same content
    });

    it('should return empty array when no transports enabled', () => {
      const emptyConfig: TransportConfig = {
        console: {enabled: false, level: LogLevel.DEBUG},
        file: {enabled: false, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      };

      const manager = new TransportManager(emptyConfig);
      expect(manager.getTransports()).toEqual([]);
    });
  });

  describe('addTransport', () => {
    it('should add custom transport', () => {
      const manager = new TransportManager({
        console: {enabled: false, level: LogLevel.DEBUG},
        file: {enabled: false, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      });

      const customTransport: Transport = {
        write: jest.fn(),
        shouldWrite: jest.fn().mockReturnValue(true),
        isInitialized: jest.fn().mockReturnValue(true),
      };

      manager.addTransport(customTransport);
      expect(manager.getTransports()).toContain(customTransport);
    });

    it('should use custom transport for writes', async () => {
      const manager = new TransportManager({
        console: {enabled: false, level: LogLevel.DEBUG},
        file: {enabled: false, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      });

      const customTransport: Transport = {
        write: jest.fn().mockResolvedValue(undefined),
        shouldWrite: jest.fn().mockReturnValue(true),
        isInitialized: jest.fn().mockReturnValue(true),
      };

      manager.addTransport(customTransport);
      await manager.write(testEntry);

      expect(customTransport.shouldWrite).toHaveBeenCalledWith(testEntry);
      expect(customTransport.write).toHaveBeenCalledWith(testEntry);
    });
  });

  describe('removeTransport', () => {
    it('should remove transport', () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();
      const transportToRemove = transports[0];

      manager.removeTransport(transportToRemove);
      expect(manager.getTransports()).not.toContain(transportToRemove);
    });

    it('should handle removing non-existent transport', () => {
      const manager = new TransportManager(mockConfig);
      const customTransport: Transport = {
        write: jest.fn(),
        shouldWrite: jest.fn(),
        isInitialized: jest.fn().mockReturnValue(true),
      };

      const initialLength = manager.getTransports().length;
      manager.removeTransport(customTransport);
      expect(manager.getTransports()).toHaveLength(initialLength);
    });
  });

  describe('clearTransports', () => {
    it('should clear all transports', () => {
      const manager = new TransportManager(mockConfig);
      expect(manager.getTransports()).toHaveLength(3);

      manager.clearTransports();
      expect(manager.getTransports()).toHaveLength(0);
    });

    it('should not write after clearing transports', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      transports.forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockResolvedValue(undefined);
      });

      manager.clearTransports();
      await manager.write(testEntry);

      // No transports should be called
      transports.forEach(transport => {
        expect(transport.write).not.toHaveBeenCalled();
      });
    });
  });

  describe('isDatadogEnabled', () => {
    it('should return true when Datadog transport is initialized', () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock Datadog transport's isInitialized to return true
      const datadogTransport = transports.find(t => t instanceof DatadogTransport);
      if (datadogTransport) {
        (datadogTransport.isInitialized as jest.Mock).mockReturnValue(true);
      }

      expect(manager.isDatadogEnabled()).toBe(true);
    });

    it('should return false when Datadog transport is not initialized', () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      // Mock Datadog transport's isInitialized to return false
      const datadogTransport = transports.find(t => t instanceof DatadogTransport);
      if (datadogTransport) {
        (datadogTransport.isInitialized as jest.Mock).mockReturnValue(false);
      }

      expect(manager.isDatadogEnabled()).toBe(false);
    });

    it('should return false when Datadog transport is not enabled', () => {
      const noDatadogConfig: TransportConfig = {
        console: {enabled: true, level: LogLevel.DEBUG},
        file: {enabled: true, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      };

      const manager = new TransportManager(noDatadogConfig);
      expect(manager.isDatadogEnabled()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty config', () => {
      const emptyConfig: TransportConfig = {
        console: {enabled: false, level: LogLevel.DEBUG},
        file: {enabled: false, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      };

      expect(() => {
        new TransportManager(emptyConfig);
      }).not.toThrow();
    });

    it('should handle multiple writes concurrently', async () => {
      const manager = new TransportManager(mockConfig);
      const transports = manager.getTransports();

      transports.forEach(transport => {
        (transport.shouldWrite as jest.Mock).mockReturnValue(true);
        (transport.write as jest.Mock).mockResolvedValue(undefined);
      });

      const writes = [
        manager.write(testEntry),
        manager.write({...testEntry, message: 'Message 2'}),
        manager.write({...testEntry, message: 'Message 3'}),
      ];

      await Promise.all(writes);

      transports.forEach(transport => {
        expect(transport.write).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle adding same transport multiple times', () => {
      const manager = new TransportManager({
        console: {enabled: false, level: LogLevel.DEBUG},
        file: {enabled: false, level: LogLevel.DEBUG, path: './test.log', maxSize: 1024, maxFiles: 1, format: 'json'},
        datadog: {
          enabled: false,
          level: LogLevel.INFO,
          clientToken: 'test',
          applicationId: 'test',
          site: 'datadoghq.eu',
          service: 'test',
          forwardConsoleLogs: false,
        },
      });

      const customTransport: Transport = {
        write: jest.fn(),
        shouldWrite: jest.fn().mockReturnValue(true),
        isInitialized: jest.fn().mockReturnValue(true),
      };

      manager.addTransport(customTransport);
      manager.addTransport(customTransport);

      expect(manager.getTransports()).toHaveLength(2); // Both instances added
    });

    it('should handle removing and re-adding transport', () => {
      const manager = new TransportManager(mockConfig);
      const transport = manager.getTransports()[0];

      manager.removeTransport(transport);
      expect(manager.getTransports()).not.toContain(transport);

      manager.addTransport(transport);
      expect(manager.getTransports()).toContain(transport);
    });
  });
});
