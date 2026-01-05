/**
 * ConsoleTransport Tests
 * Tests for console output with color support
 */

import {ConsoleTransport} from '../transports/ConsoleTransport';
import {LogLevel, ConsoleTransportConfig, LogEntry} from '../types';

describe('ConsoleTransport', () => {
  let mockConfig: ConsoleTransportConfig;
  let testEntry: LogEntry;
  let consoleSpies: {
    log: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      level: LogLevel.DEBUG,
    };

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

    // Spy on console methods
    consoleSpies = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpies).forEach(spy => spy.mockRestore());
  });

  describe('Constructor', () => {
    it('should create console transport with config', () => {
      const transport = new ConsoleTransport(mockConfig);
      expect(transport).toBeInstanceOf(ConsoleTransport);
    });
  });

  describe('shouldWrite', () => {
    it('should write when enabled and level matches', () => {
      const transport = new ConsoleTransport({enabled: true, level: LogLevel.INFO});
      expect(transport.shouldWrite(testEntry)).toBe(true);
    });

    it('should not write when disabled', () => {
      const transport = new ConsoleTransport({enabled: false, level: LogLevel.DEBUG});
      expect(transport.shouldWrite(testEntry)).toBe(false);
    });

    it('should not write when log level is below threshold', () => {
      const transport = new ConsoleTransport({enabled: true, level: LogLevel.ERROR});
      const debugEntry = {...testEntry, level: LogLevel.DEBUG};
      expect(transport.shouldWrite(debugEntry)).toBe(false);
    });

    it('should write when log level is at threshold', () => {
      const transport = new ConsoleTransport({enabled: true, level: LogLevel.INFO});
      expect(transport.shouldWrite(testEntry)).toBe(true);
    });

    it('should write when log level is above threshold', () => {
      const transport = new ConsoleTransport({enabled: true, level: LogLevel.DEBUG});
      const errorEntry = {...testEntry, level: LogLevel.ERROR};
      expect(transport.shouldWrite(errorEntry)).toBe(true);
    });
  });

  describe('write - Log Level Mapping', () => {
    let transport: ConsoleTransport;

    beforeEach(() => {
      transport = new ConsoleTransport(mockConfig);
    });

    it('should use console.debug for TRACE level', () => {
      const traceEntry = {...testEntry, level: LogLevel.TRACE};
      transport.write(traceEntry);
      expect(consoleSpies.debug).toHaveBeenCalled();
    });

    it('should use console.debug for DEBUG level', () => {
      const debugEntry = {...testEntry, level: LogLevel.DEBUG};
      transport.write(debugEntry);
      expect(consoleSpies.debug).toHaveBeenCalled();
    });

    it('should use console.info for INFO level', () => {
      transport.write(testEntry);
      expect(consoleSpies.info).toHaveBeenCalled();
    });

    it('should use console.warn for WARN level', () => {
      const warnEntry = {...testEntry, level: LogLevel.WARN};
      transport.write(warnEntry);
      expect(consoleSpies.warn).toHaveBeenCalled();
    });

    it('should use console.error for ERROR level', () => {
      const errorEntry = {...testEntry, level: LogLevel.ERROR};
      transport.write(errorEntry);
      expect(consoleSpies.error).toHaveBeenCalled();
    });

    it('should use console.error for FATAL level', () => {
      const fatalEntry = {...testEntry, level: LogLevel.FATAL};
      transport.write(fatalEntry);
      expect(consoleSpies.error).toHaveBeenCalled();
    });
  });

  describe('write - Message Content', () => {
    let transport: ConsoleTransport;

    beforeEach(() => {
      transport = new ConsoleTransport(mockConfig);
    });

    it('should include logger name in output', () => {
      transport.write(testEntry);
      const args = consoleSpies.info.mock.calls[0];
      expect(args.some(arg => String(arg).includes('test-logger'))).toBe(true);
    });

    it('should include message in output', () => {
      transport.write(testEntry);
      const args = consoleSpies.info.mock.calls[0];
      expect(args.some(arg => String(arg).includes('Test message'))).toBe(true);
    });

    it('should include context when provided', () => {
      const entryWithContext = {
        ...testEntry,
        context: {userId: 'user-123'},
      };
      transport.write(entryWithContext);
      const args = consoleSpies.info.mock.calls[0];
      expect(args).toContainEqual({userId: 'user-123'});
    });

    it('should not include empty context', () => {
      const entryWithEmptyContext = {
        ...testEntry,
        context: {},
      };
      transport.write(entryWithEmptyContext);
      const args = consoleSpies.info.mock.calls[0];
      // Empty context should not be added
      expect(args.some(arg => typeof arg === 'object' && Object.keys(arg).length === 0)).toBe(false);
    });

    it('should include error when provided', () => {
      const testError = new Error('Test error');
      const entryWithError = {
        ...testEntry,
        level: LogLevel.ERROR,
        error: testError,
      };
      transport.write(entryWithError);
      const args = consoleSpies.error.mock.calls[0];
      expect(args).toContain(testError);
    });

    it('should include both context and error', () => {
      const testError = new Error('Test error');
      const entryWithBoth = {
        ...testEntry,
        level: LogLevel.ERROR,
        context: {userId: 'user-123'},
        error: testError,
      };
      transport.write(entryWithBoth);
      const args = consoleSpies.error.mock.calls[0];
      expect(args).toContainEqual({userId: 'user-123'});
      expect(args).toContain(testError);
    });
  });

  describe('Output Format', () => {
    let transport: ConsoleTransport;

    beforeEach(() => {
      transport = new ConsoleTransport(mockConfig);
    });

    it('should write to console in all environments', () => {
      transport.write(testEntry);
      expect(consoleSpies.info).toHaveBeenCalled();
    });

    it('should produce consistent output format', () => {
      transport.write(testEntry);
      const args = consoleSpies.info.mock.calls[0];

      // Should have prefix and message (logdown uses emoji format)
      expect(args[0]).toContain('test-logger');
      expect(args[1]).toBe('Test message');
    });

    it('should work in different runtime environments', () => {
      // The simplified implementation works consistently across environments
      // by relying on native console methods which handle colors automatically
      const entries = [
        {...testEntry, level: LogLevel.DEBUG},
        {...testEntry, level: LogLevel.INFO},
        {...testEntry, level: LogLevel.WARN},
        {...testEntry, level: LogLevel.ERROR},
      ];

      entries.forEach(entry => {
        expect(() => transport.write(entry)).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    let transport: ConsoleTransport;

    beforeEach(() => {
      transport = new ConsoleTransport(mockConfig);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const longEntry = {...testEntry, message: longMessage};

      expect(() => {
        transport.write(longEntry);
      }).not.toThrow();

      expect(consoleSpies.info).toHaveBeenCalled();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Special: \n\t\r emoji: 🔥 unicode: \u2764';
      const specialEntry = {...testEntry, message: specialMessage};

      expect(() => {
        transport.write(specialEntry);
      }).not.toThrow();

      const args = consoleSpies.info.mock.calls[0];
      expect(args.some(arg => String(arg).includes('🔥'))).toBe(true);
    });

    it('should handle null context values', () => {
      const nullContextEntry = {
        ...testEntry,
        context: {nullValue: null, undefinedValue: undefined},
      };

      expect(() => {
        transport.write(nullContextEntry);
      }).not.toThrow();
    });

    it('should handle circular references in context', () => {
      const circular: any = {name: 'test'};
      circular.self = circular;

      const circularEntry = {
        ...testEntry,
        context: circular,
      };

      expect(() => {
        transport.write(circularEntry);
      }).not.toThrow();
    });

    it('should handle Error without stack trace', () => {
      const errorWithoutStack = new Error('No stack');
      delete errorWithoutStack.stack;

      const errorEntry = {
        ...testEntry,
        level: LogLevel.ERROR,
        error: errorWithoutStack,
      };

      expect(() => {
        transport.write(errorEntry);
      }).not.toThrow();
    });

    it('should handle missing metadata fields gracefully', () => {
      const minimalEntry = {
        ...testEntry,
        metadata: {
          correlationId: 'test',
          environment: 'test',
          // Missing logger field
        },
      };

      expect(() => {
        transport.write(minimalEntry);
      }).not.toThrow();
    });

    it('should handle nested context objects', () => {
      const nestedEntry = {
        ...testEntry,
        context: {
          user: {id: '123', name: 'Test'},
          metadata: {timestamp: Date.now()},
        },
      };

      expect(() => {
        transport.write(nestedEntry);
      }).not.toThrow();
    });
  });

  describe('Multiple Log Entries', () => {
    let transport: ConsoleTransport;

    beforeEach(() => {
      transport = new ConsoleTransport(mockConfig);
    });

    it('should handle multiple writes', () => {
      transport.write(testEntry);
      transport.write({...testEntry, message: 'Message 2'});
      transport.write({...testEntry, message: 'Message 3'});

      expect(consoleSpies.info).toHaveBeenCalledTimes(3);
    });

    it('should handle different log levels in sequence', () => {
      transport.write({...testEntry, level: LogLevel.DEBUG});
      transport.write({...testEntry, level: LogLevel.INFO});
      transport.write({...testEntry, level: LogLevel.WARN});
      transport.write({...testEntry, level: LogLevel.ERROR});

      expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpies.info).toHaveBeenCalledTimes(1);
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should work with TRACE level threshold', () => {
      const traceConfig: ConsoleTransportConfig = {
        enabled: true,
        level: LogLevel.TRACE,
      };
      const transport = new ConsoleTransport(traceConfig);

      expect(transport.shouldWrite({...testEntry, level: LogLevel.TRACE})).toBe(true);
    });

    it('should work with FATAL level threshold', () => {
      const fatalConfig: ConsoleTransportConfig = {
        enabled: true,
        level: LogLevel.FATAL,
      };
      const transport = new ConsoleTransport(fatalConfig);

      expect(transport.shouldWrite({...testEntry, level: LogLevel.INFO})).toBe(false);
      expect(transport.shouldWrite({...testEntry, level: LogLevel.FATAL})).toBe(true);
    });

    it('should respect enabled flag changes', () => {
      const config: ConsoleTransportConfig = {enabled: true, level: LogLevel.DEBUG};
      const transport = new ConsoleTransport(config);

      expect(transport.shouldWrite(testEntry)).toBe(true);

      // Change config (would require re-initialization in real usage)
      config.enabled = false;
      const transport2 = new ConsoleTransport(config);
      expect(transport2.shouldWrite(testEntry)).toBe(false);
    });
  });
});
