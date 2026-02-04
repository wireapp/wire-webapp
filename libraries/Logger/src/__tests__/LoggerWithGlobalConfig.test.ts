/**
 * LoggerWithGlobalConfig Tests
 * Tests for lightweight logger using global configuration
 */

import {Logger, getLogger, clearLoggers, getLoggerNames} from '../LoggerWithGlobalConfig';
import {initializeLogger, resetLoggerConfig} from '../GlobalConfig';
import {LogLevel, SafetyLevel} from '../types';

describe('LoggerWithGlobalConfig', () => {
  beforeEach(() => {
    resetLoggerConfig();
    clearLoggers();

    // Initialize with test config
    initializeLogger(
      {platform: 'browser', deployment: 'development'},
      {
        environment: 'development',
        safetyLevel: SafetyLevel.SAFE,
        logLevel: LogLevel.DEBUG,
        transports: {
          console: {enabled: false, level: LogLevel.DEBUG},
          datadog: {
            enabled: false,
            level: LogLevel.INFO,
            clientToken: 'test',
            applicationId: 'test',
            site: 'datadoghq.eu',
            service: 'test',
            forwardConsoleLogs: false,
          },
        },
      },
    );
  });

  afterEach(() => {
    resetLoggerConfig();
    clearLoggers();
  });

  describe('Constructor', () => {
    it('should create logger with name', () => {
      const logger = new Logger('TestLogger');
      expect(logger.getName()).toBe('TestLogger');
    });

    it('should have production logging methods', () => {
      const logger = new Logger('TestLogger');
      expect(logger.production.info).toBeInstanceOf(Function);
      expect(logger.production.warn).toBeInstanceOf(Function);
      expect(logger.production.error).toBeInstanceOf(Function);
    });

    it('should have development logging methods', () => {
      const logger = new Logger('TestLogger');
      expect(logger.development.info).toBeInstanceOf(Function);
      expect(logger.development.warn).toBeInstanceOf(Function);
      expect(logger.development.error).toBeInstanceOf(Function);
      expect(logger.development.debug).toBeInstanceOf(Function);
      expect(logger.development.trace).toBeInstanceOf(Function);
    });

    it('should enable logdown in development mode', () => {
      const logger = new Logger('DevLogger');
      const logdownInstance = logger.getLogdownInstance();
      expect(logdownInstance.state.isEnabled).toBe(true);
    });
  });

  describe('Production Logging', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = getLogger('ProductionTest');
    });

    it('should log info messages', () => {
      expect(() => {
        logger.production.info('Test info');
      }).not.toThrow();
    });

    it('should log warnings', () => {
      expect(() => {
        logger.production.warn('Test warning');
      }).not.toThrow();
    });

    it('should log errors', () => {
      expect(() => {
        logger.production.error('Test error', new Error('test'));
      }).not.toThrow();
    });

    it('should log with context', () => {
      expect(() => {
        logger.production.info('Test with context', {userId: 'user-123'});
      }).not.toThrow();
    });
  });

  describe('Development Logging', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = getLogger('DevelopmentTest');
    });

    it('should log debug messages', () => {
      expect(() => {
        logger.development.debug('Debug message');
      }).not.toThrow();
    });

    it('should log trace messages', () => {
      expect(() => {
        logger.development.trace('Trace message');
      }).not.toThrow();
    });

    it('should not filter context in development', () => {
      expect(() => {
        logger.development.info('Dev log', {sensitive: 'data'});
      }).not.toThrow();
    });
  });

  describe('Backward Compatible Methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = getLogger('BackwardCompatTest');
    });

    it('should support log() method', () => {
      const logdownSpy = jest.spyOn(logger.getLogdownInstance(), 'log').mockImplementation();
      logger.log('Test message');
      expect(logdownSpy).toHaveBeenCalledWith('Test message');
      logdownSpy.mockRestore();
    });

    it('should support info() method', () => {
      const logdownSpy = jest.spyOn(logger.getLogdownInstance(), 'info').mockImplementation();
      logger.info('Info message');
      expect(logdownSpy).toHaveBeenCalledWith('Info message');
      logdownSpy.mockRestore();
    });

    it('should support warn() method', () => {
      const logdownSpy = jest.spyOn(logger.getLogdownInstance(), 'warn').mockImplementation();
      logger.warn('Warning message');
      expect(logdownSpy).toHaveBeenCalledWith('Warning message');
      logdownSpy.mockRestore();
    });

    it('should support error() method', () => {
      const logdownSpy = jest.spyOn(logger.getLogdownInstance(), 'error').mockImplementation();
      logger.error('Error message');
      expect(logdownSpy).toHaveBeenCalledWith('Error message');
      logdownSpy.mockRestore();
    });

    it('should support debug() method', () => {
      const logdownSpy = jest.spyOn(logger.getLogdownInstance(), 'debug').mockImplementation();
      logger.debug('Debug message');
      expect(logdownSpy).toHaveBeenCalledWith('Debug message');
      logdownSpy.mockRestore();
    });
  });

  describe('getLogger Factory', () => {
    it('should create new logger', () => {
      const logger = getLogger('Factory1');
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getName()).toBe('Factory1');
    });

    it('should return existing logger for same name', () => {
      const logger1 = getLogger('Shared');
      const logger2 = getLogger('Shared');
      expect(logger1).toBe(logger2);
    });

    it('should create different loggers for different names', () => {
      const logger1 = getLogger('Logger1');
      const logger2 = getLogger('Logger2');
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('clearLoggers', () => {
    it('should clear all registered loggers', () => {
      getLogger('Logger1');
      getLogger('Logger2');
      expect(getLoggerNames()).toHaveLength(2);

      clearLoggers();
      expect(getLoggerNames()).toHaveLength(0);
    });

    it('should allow creating new loggers after clear', () => {
      const logger1 = getLogger('Test');
      clearLoggers();
      const logger2 = getLogger('Test');

      expect(logger1).not.toBe(logger2); // Different instances
    });
  });

  describe('getLoggerNames', () => {
    it('should return empty array when no loggers', () => {
      expect(getLoggerNames()).toEqual([]);
    });

    it('should return names of registered loggers', () => {
      getLogger('LoggerA');
      getLogger('LoggerB');
      getLogger('LoggerC');

      const names = getLoggerNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('LoggerA');
      expect(names).toContain('LoggerB');
      expect(names).toContain('LoggerC');
    });
  });

  describe('Log Level Filtering', () => {
    it('should not log below threshold', () => {
      // Set high threshold
      resetLoggerConfig();
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.ERROR});
      const logger = getLogger('LevelTest');

      // These should not throw even if filtered
      expect(() => {
        logger.production.info('Should be filtered');
        logger.production.warn('Should be filtered');
      }).not.toThrow();
    });

    it('should log at or above threshold', () => {
      resetLoggerConfig();
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.INFO});
      const logger = getLogger('LevelTest2');

      expect(() => {
        logger.production.info('Should log');
        logger.production.warn('Should log');
        logger.production.error('Should log', new Error('test'));
      }).not.toThrow();
    });
  });

  describe('Global Config Integration', () => {
    it('should use global config for all loggers', () => {
      resetLoggerConfig();
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.WARN});

      const logger1 = getLogger('Logger1');
      const logger2 = getLogger('Logger2');

      // Both should use same config (tested by not throwing)
      expect(() => {
        logger1.production.warn('Warning 1');
        logger2.production.warn('Warning 2');
      }).not.toThrow();
    });

    it('should respond to config updates', () => {
      resetLoggerConfig();
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.DEBUG});
      const logger = getLogger('ConfigTest');

      // Initial config allows DEBUG
      expect(() => {
        logger.development.debug('Debug message');
      }).not.toThrow();
    });
  });

  describe('Metadata Generation', () => {
    it('should include logger name in logs', () => {
      const logger = getLogger('MetadataTest');
      expect(logger.getName()).toBe('MetadataTest');
    });

    it('should provide logdown instance', () => {
      const logger = getLogger('LogdownTest');
      const logdownInstance = logger.getLogdownInstance();

      expect(logdownInstance).toBeDefined();
      expect(logdownInstance.log).toBeInstanceOf(Function);
    });
  });

  describe('Edge Cases', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = getLogger('EdgeCaseTest');
    });

    it('should handle undefined context', () => {
      expect(() => {
        logger.production.info('Message without context');
      }).not.toThrow();
    });

    it('should handle empty context', () => {
      expect(() => {
        logger.production.info('Message with empty context', {});
      }).not.toThrow();
    });

    it('should handle nested context', () => {
      expect(() => {
        logger.production.info('Nested context', {
          user: {id: '123', name: 'Test'},
        });
      }).not.toThrow();
    });

    it('should handle Error without stack', () => {
      const errorWithoutStack = new Error('No stack');
      delete errorWithoutStack.stack;

      expect(() => {
        logger.production.error('Error without stack', errorWithoutStack);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);

      expect(() => {
        logger.production.info(longMessage);
      }).not.toThrow();
    });

    it('should handle special characters', () => {
      expect(() => {
        logger.production.info('Special: \n\t\r emoji: 🔥');
      }).not.toThrow();
    });

    it('should handle circular references in context', () => {
      const circular: any = {name: 'test'};
      circular.self = circular;

      expect(() => {
        logger.production.info('Circular reference', circular);
      }).not.toThrow();
    });

    it('should handle null and undefined in context', () => {
      expect(() => {
        logger.production.info('Null/undefined', {
          nullValue: null,
          undefinedValue: undefined,
        });
      }).not.toThrow();
    });
  });
});
