/**
 * InMemoryLogBuffer Tests
 * Tests for in-memory log buffering and export functionality
 */

import {
  InMemoryLogBuffer,
  getGlobalLogBuffer,
  setGlobalLogBuffer,
  clearGlobalLogBuffer,
} from '../memoryBuffer/InMemoryLogBuffer';
import {LogLevel, LogEntry} from '../types';

describe('InMemoryLogBuffer', () => {
  let buffer: InMemoryLogBuffer;
  let testEntry: LogEntry;

  beforeEach(() => {
    buffer = new InMemoryLogBuffer();
    testEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: 'Test message',
      loggerName: 'test-logger',
      isProductionSafe: true,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: 'test-id',
        environment: 'test',
        platform: 'test',
        logger: 'test-logger',
      },
    };
  });

  describe('add', () => {
    it('should add log entry to buffer', () => {
      buffer.add(testEntry);
      expect(buffer.size()).toBe(1);
    });

    it('should add multiple log entries', () => {
      buffer.add(testEntry);
      buffer.add({...testEntry, message: 'Message 2'});
      buffer.add({...testEntry, message: 'Message 3'});
      expect(buffer.size()).toBe(3);
    });

    it('should maintain insertion order', () => {
      buffer.add({...testEntry, message: 'First'});
      buffer.add({...testEntry, message: 'Second'});
      buffer.add({...testEntry, message: 'Third'});

      const entries = buffer.getAll();
      expect(entries[0].message).toBe('First');
      expect(entries[1].message).toBe('Second');
      expect(entries[2].message).toBe('Third');
    });

    it('should remove oldest entry when exceeding max size', () => {
      buffer.setMaxSize(3);

      buffer.add({...testEntry, message: 'First'});
      buffer.add({...testEntry, message: 'Second'});
      buffer.add({...testEntry, message: 'Third'});
      buffer.add({...testEntry, message: 'Fourth'}); // Should remove 'First'

      const entries = buffer.getAll();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('Second');
      expect(entries[1].message).toBe('Third');
      expect(entries[2].message).toBe('Fourth');
    });

    it('should handle ring buffer behavior correctly', () => {
      buffer.setMaxSize(2);

      for (let i = 1; i <= 5; i++) {
        buffer.add({...testEntry, message: `Message ${i}`});
      }

      const entries = buffer.getAll();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('Message 4');
      expect(entries[1].message).toBe('Message 5');
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty buffer', () => {
      expect(buffer.getAll()).toEqual([]);
    });

    it('should return all log entries', () => {
      buffer.add(testEntry);
      buffer.add({...testEntry, message: 'Message 2'});

      const entries = buffer.getAll();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('Test message');
      expect(entries[1].message).toBe('Message 2');
    });

    it('should return a copy of the buffer array', () => {
      buffer.add(testEntry);

      const entries1 = buffer.getAll();
      const entries2 = buffer.getAll();

      expect(entries1).not.toBe(entries2); // Different array instances
      expect(entries1).toEqual(entries2); // Same content
    });

    it('should not affect buffer when modifying returned array', () => {
      buffer.add(testEntry);

      const entries = buffer.getAll();
      entries.push({...testEntry, message: 'Modified'});

      expect(buffer.size()).toBe(1); // Original buffer unchanged
    });
  });

  describe('size', () => {
    it('should return 0 for empty buffer', () => {
      expect(buffer.size()).toBe(0);
    });

    it('should return correct size after adding entries', () => {
      buffer.add(testEntry);
      expect(buffer.size()).toBe(1);

      buffer.add(testEntry);
      expect(buffer.size()).toBe(2);
    });

    it('should return correct size after clearing', () => {
      buffer.add(testEntry);
      buffer.add(testEntry);
      buffer.clear();
      expect(buffer.size()).toBe(0);
    });

    it('should respect max size', () => {
      buffer.setMaxSize(2);

      buffer.add(testEntry);
      buffer.add(testEntry);
      buffer.add(testEntry); // Should not exceed max size

      expect(buffer.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      buffer.add(testEntry);
      buffer.add(testEntry);
      buffer.add(testEntry);

      buffer.clear();
      expect(buffer.size()).toBe(0);
      expect(buffer.getAll()).toEqual([]);
    });

    it('should allow adding entries after clearing', () => {
      buffer.add(testEntry);
      buffer.clear();
      buffer.add({...testEntry, message: 'After clear'});

      expect(buffer.size()).toBe(1);
      expect(buffer.getAll()[0].message).toBe('After clear');
    });

    it('should work on already empty buffer', () => {
      expect(() => {
        buffer.clear();
      }).not.toThrow();
      expect(buffer.size()).toBe(0);
    });
  });

  describe('export', () => {
    it('should export empty buffer as JSON', () => {
      const exported = buffer.export();
      expect(exported).toBe('[]');
    });

    it('should export log entries as formatted JSON', () => {
      buffer.add(testEntry);

      const exported = buffer.export();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Test message');
    });

    it('should export multiple entries', () => {
      buffer.add({...testEntry, message: 'First'});
      buffer.add({...testEntry, message: 'Second'});
      buffer.add({...testEntry, message: 'Third'});

      const exported = buffer.export();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(3);
      expect(parsed[0].message).toBe('First');
      expect(parsed[1].message).toBe('Second');
      expect(parsed[2].message).toBe('Third');
    });

    it('should format JSON with indentation', () => {
      buffer.add(testEntry);

      const exported = buffer.export();
      // Check for indentation (2 spaces)
      expect(exported).toContain('  ');
    });

    it('should include all entry fields', () => {
      const fullEntry = {
        ...testEntry,
        context: {userId: 'user-123'},
        error: new Error('Test error'),
      };
      buffer.add(fullEntry);

      const exported = buffer.export();
      const parsed = JSON.parse(exported);

      expect(parsed[0]).toHaveProperty('level');
      expect(parsed[0]).toHaveProperty('message');
      expect(parsed[0]).toHaveProperty('context');
      expect(parsed[0]).toHaveProperty('metadata');
    });
  });

  describe('setMaxSize', () => {
    it('should update max size', () => {
      buffer.setMaxSize(100);
      expect(buffer.getMaxSize()).toBe(100);
    });

    it('should trim buffer when reducing max size', () => {
      buffer.add({...testEntry, message: 'First'});
      buffer.add({...testEntry, message: 'Second'});
      buffer.add({...testEntry, message: 'Third'});
      buffer.add({...testEntry, message: 'Fourth'});

      buffer.setMaxSize(2); // Reduce from 4 to 2

      const entries = buffer.getAll();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('Third'); // Oldest removed
      expect(entries[1].message).toBe('Fourth');
    });

    it('should not affect buffer when increasing max size', () => {
      buffer.add(testEntry);
      buffer.add(testEntry);

      buffer.setMaxSize(100);

      expect(buffer.size()).toBe(2);
    });

    it('should handle max size of 0', () => {
      buffer.add(testEntry);
      buffer.add(testEntry);

      buffer.setMaxSize(0);

      expect(buffer.size()).toBe(0);
    });

    it('should handle max size of 1', () => {
      buffer.setMaxSize(1);

      buffer.add({...testEntry, message: 'First'});
      buffer.add({...testEntry, message: 'Second'});

      const entries = buffer.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('Second');
    });
  });

  describe('getMaxSize', () => {
    it('should return default max size', () => {
      expect(buffer.getMaxSize()).toBe(5000);
    });

    it('should return updated max size', () => {
      buffer.setMaxSize(1000);
      expect(buffer.getMaxSize()).toBe(1000);
    });
  });

  describe('Datadog Integration', () => {
    const originalWindow = global.window;

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should return null when window is not defined', () => {
      delete (global as any).window;
      expect(buffer.getDatadogSessionId()).toBeNull();
    });

    it('should return null when DD_RUM is not available', () => {
      (global as any).window = {};
      expect(buffer.getDatadogSessionId()).toBeNull();
    });

    it('should return session ID when DD_RUM is available', () => {
      (global as any).window = {
        DD_RUM: {
          getInternalContext: () => ({session_id: 'test-session-123'}),
        },
      };

      expect(buffer.getDatadogSessionId()).toBe('test-session-123');
    });

    it('should return null when getInternalContext returns null', () => {
      (global as any).window = {
        DD_RUM: {
          getInternalContext: () => null,
        },
      };

      expect(buffer.getDatadogSessionId()).toBeNull();
    });

    it('should return null when session_id is missing', () => {
      (global as any).window = {
        DD_RUM: {
          getInternalContext: () => ({}),
        },
      };

      expect(buffer.getDatadogSessionId()).toBeNull();
    });

    it('should return false for Datadog RUM enabled when window not defined', () => {
      delete (global as any).window;
      expect(buffer.getDatadogRumEnabled()).toBe(false);
    });

    it('should return false when DD_RUM is not available', () => {
      (global as any).window = {};
      expect(buffer.getDatadogRumEnabled()).toBe(false);
    });

    it('should return true when DD_RUM is available', () => {
      (global as any).window = {DD_RUM: {}};
      expect(buffer.getDatadogRumEnabled()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large buffers', () => {
      const largeSize = 10000;
      buffer.setMaxSize(largeSize);

      for (let i = 0; i < largeSize; i++) {
        buffer.add({...testEntry, message: `Message ${i}`});
      }

      expect(buffer.size()).toBe(largeSize);
    });

    it('should handle rapid additions', () => {
      for (let i = 0; i < 100; i++) {
        buffer.add(testEntry);
      }

      expect(buffer.size()).toBe(100);
    });

    it('should handle entries with circular references', () => {
      const circular: any = {name: 'test'};
      circular.self = circular;

      const circularEntry = {
        ...testEntry,
        context: circular,
      };

      buffer.add(circularEntry);
      expect(buffer.size()).toBe(1);

      // Export might fail on circular references, but that's expected
      expect(() => {
        buffer.export();
      }).toThrow(); // JSON.stringify will throw
    });

    it('should handle entries with undefined fields', () => {
      const minimalEntry = {
        ...testEntry,
        context: undefined,
        error: undefined,
      };

      buffer.add(minimalEntry);
      const exported = buffer.export();
      expect(exported).toBeDefined();
    });

    it('should handle entries with null fields', () => {
      const nullEntry = {
        ...testEntry,
        context: null as any,
      };

      buffer.add(nullEntry);
      const exported = buffer.export();
      expect(exported).toBeDefined();
    });

    it('should handle multiple clear operations', () => {
      buffer.add(testEntry);
      buffer.clear();
      buffer.clear();
      buffer.clear();

      expect(buffer.size()).toBe(0);
    });

    it('should handle setMaxSize to same value', () => {
      const initialMax = buffer.getMaxSize();
      buffer.setMaxSize(initialMax);
      expect(buffer.getMaxSize()).toBe(initialMax);
    });
  });
});

describe('Global Log Buffer Functions', () => {
  afterEach(() => {
    clearGlobalLogBuffer();
  });

  describe('getGlobalLogBuffer', () => {
    it('should create global buffer on first call', () => {
      const buffer = getGlobalLogBuffer();
      expect(buffer).toBeInstanceOf(InMemoryLogBuffer);
    });

    it('should return same instance on subsequent calls', () => {
      const buffer1 = getGlobalLogBuffer();
      const buffer2 = getGlobalLogBuffer();
      expect(buffer1).toBe(buffer2);
    });

    it('should persist entries across calls', () => {
      const buffer1 = getGlobalLogBuffer();
      const testEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Test message',
        loggerName: 'test-logger',
        isProductionSafe: true,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'test-id',
          environment: 'test',
          platform: 'test',
          logger: 'test-logger',
        },
      };

      buffer1.add(testEntry);

      const buffer2 = getGlobalLogBuffer();
      expect(buffer2.size()).toBe(1);
    });
  });

  describe('setGlobalLogBuffer', () => {
    it('should replace global buffer', () => {
      const originalBuffer = getGlobalLogBuffer();
      const newBuffer = new InMemoryLogBuffer();
      newBuffer.setMaxSize(100);

      setGlobalLogBuffer(newBuffer);

      const retrievedBuffer = getGlobalLogBuffer();
      expect(retrievedBuffer).toBe(newBuffer);
      expect(retrievedBuffer).not.toBe(originalBuffer);
      expect(retrievedBuffer.getMaxSize()).toBe(100);
    });
  });

  describe('clearGlobalLogBuffer', () => {
    it('should clear entries from global buffer', () => {
      const buffer = getGlobalLogBuffer();
      const testEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Test message',
        loggerName: 'test-logger',
        isProductionSafe: true,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'test-id',
          environment: 'test',
          platform: 'test',
          logger: 'test-logger',
        },
      };

      buffer.add(testEntry);
      buffer.add(testEntry);
      expect(buffer.size()).toBe(2);

      clearGlobalLogBuffer();
      expect(buffer.size()).toBe(0);
    });

    it('should work when global buffer is null', () => {
      expect(() => {
        clearGlobalLogBuffer();
      }).not.toThrow();
    });
  });

  describe('Global Buffer Isolation', () => {
    it('should maintain separate instances', () => {
      const globalBuffer = getGlobalLogBuffer();
      const localBuffer = new InMemoryLogBuffer();

      const testEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Test message',
        loggerName: 'test-logger',
        isProductionSafe: true,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'test-id',
          environment: 'test',
          platform: 'test',
          logger: 'test-logger',
        },
      };

      globalBuffer.add(testEntry);

      expect(globalBuffer.size()).toBe(1);
      expect(localBuffer.size()).toBe(0);
    });
  });
});
