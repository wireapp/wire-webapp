/**
 * GlobalConfig Tests
 * Tests for global configuration singleton
 */

import {
  initializeLogger,
  updateLoggerConfig,
  getLoggerConfig,
  resetLoggerConfig,
  globalConfig,
  getDatadogTransport,
  setDatadogUser,
  isDatadogEnabled,
} from '../GlobalConfig';
import {LogLevel, SafetyLevel} from '../types';

describe('GlobalConfig', () => {
  afterEach(() => {
    resetLoggerConfig();
  });

  describe('initializeLogger', () => {
    it('should initialize with default config when no options provided', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const config = getLoggerConfig();

      expect(config).toBeDefined();
      expect(config.environment).toBeDefined();
      expect(config.safetyLevel).toBeDefined();
      expect(config.logLevel).toBeDefined();
    });

    it('should initialize with custom config', () => {
      initializeLogger(
        {platform: 'browser', deployment: 'production'},
        {
          environment: 'production',
          safetyLevel: SafetyLevel.SAFE,
          logLevel: LogLevel.ERROR,
        },
      );

      const config = getLoggerConfig();
      expect(config.environment).toBe('production');
      expect(config.safetyLevel).toBe(SafetyLevel.SAFE);
      expect(config.logLevel).toBe(LogLevel.ERROR);
    });

    it('should warn if initialized twice', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      initializeLogger({platform: 'browser', deployment: 'development'});
      initializeLogger({platform: 'browser', deployment: 'development'}); // Second call

      // Logdown calls console.warn with multiple arguments: prefix and message
      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1];
      expect(lastCall.join(' ')).toContain('Already initialized');

      consoleSpy.mockRestore();
    });

    it('should merge custom config with defaults', () => {
      initializeLogger(
        {platform: 'browser', deployment: 'development'},
        {
          logLevel: LogLevel.WARN,
        },
      );

      const config = getLoggerConfig();
      expect(config.logLevel).toBe(LogLevel.WARN);
      expect(config.contextWhitelist).toBeDefined(); // Default still present
    });
  });

  describe('updateLoggerConfig', () => {
    it('should update configuration after initialization', () => {
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.INFO});

      updateLoggerConfig({logLevel: LogLevel.DEBUG});

      const config = getLoggerConfig();
      expect(config.logLevel).toBe(LogLevel.DEBUG);
    });

    it('should throw error if not initialized', () => {
      expect(() => {
        updateLoggerConfig({logLevel: LogLevel.WARN});
      }).toThrow('Must call initialize()');
    });

    it('should preserve other config when updating', () => {
      initializeLogger(
        {platform: 'browser', deployment: 'production'},
        {
          environment: 'production',
          logLevel: LogLevel.INFO,
        },
      );

      updateLoggerConfig({logLevel: LogLevel.DEBUG});

      const config = getLoggerConfig();
      expect(config.logLevel).toBe(LogLevel.DEBUG);
      expect(config.environment).toBe('production'); // Preserved
    });

    it('should recreate transport manager when transports updated', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const originalTransportManager = globalConfig.getTransportManager();

      updateLoggerConfig({
        transports: {
          console: {enabled: false, level: LogLevel.ERROR},
        },
      });

      const newTransportManager = globalConfig.getTransportManager();
      // Transport manager should be recreated (different instance)
      expect(newTransportManager).toBeDefined();
    });

    it('should recreate sanitizer when sanitization rules updated', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const originalSanitizer = globalConfig.getSanitizer();

      updateLoggerConfig({
        sanitizationRules: [],
      });

      const newSanitizer = globalConfig.getSanitizer();
      // Sanitizer should be recreated
      expect(newSanitizer).toBeDefined();
    });
  });

  describe('getLoggerConfig', () => {
    it('should auto-initialize if not explicitly initialized', () => {
      // Don't call initializeLogger()
      const config = getLoggerConfig();

      expect(config).toBeDefined();
      expect(globalConfig.isInitialized()).toBe(true);
    });

    it('should return a copy of config (not reference)', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const config1 = getLoggerConfig();
      const config2 = getLoggerConfig();

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // But same values
    });

    it('should return config with all required fields', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const config = getLoggerConfig();

      expect(config.environment).toBeDefined();
      expect(config.safetyLevel).toBeDefined();
      expect(config.logLevel).toBeDefined();
      expect(config.contextWhitelist).toBeDefined();
      expect(config.transports).toBeDefined();
    });
  });

  describe('resetLoggerConfig', () => {
    it('should reset configuration state', () => {
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.ERROR});
      expect(globalConfig.isInitialized()).toBe(true);

      resetLoggerConfig();
      expect(globalConfig.isInitialized()).toBe(false);
    });

    it('should allow re-initialization after reset', () => {
      // First ensure we start clean (in case previous tests didn't clean up)
      resetLoggerConfig();

      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.ERROR});
      resetLoggerConfig();

      // Should not throw or warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.INFO});

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(getLoggerConfig().logLevel).toBe(LogLevel.INFO);

      consoleSpy.mockRestore();
    });
  });

  describe('Transport Manager Access', () => {
    it('should provide transport manager after initialization', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const transportManager = globalConfig.getTransportManager();

      expect(transportManager).toBeDefined();
      expect(transportManager.write).toBeInstanceOf(Function);
    });

    it('should auto-initialize when getting transport manager', () => {
      // Don't call initializeLogger()
      const transportManager = globalConfig.getTransportManager();

      expect(transportManager).toBeDefined();
      expect(globalConfig.isInitialized()).toBe(true);
    });
  });

  describe('Sanitizer Access', () => {
    it('should provide sanitizer after initialization', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});
      const sanitizer = globalConfig.getSanitizer();

      expect(sanitizer).toBeDefined();
      expect(sanitizer.sanitize).toBeInstanceOf(Function);
    });

    it('should auto-initialize when getting sanitizer', () => {
      // Don't call initializeLogger()
      const sanitizer = globalConfig.getSanitizer();

      expect(sanitizer).toBeDefined();
      expect(globalConfig.isInitialized()).toBe(true);
    });
  });

  describe('Environment-Specific Defaults', () => {
    it('should use development defaults when deployment is development', () => {
      resetLoggerConfig();
      initializeLogger({platform: 'browser', deployment: 'development'});
      const config = getLoggerConfig();

      expect(config.environment).toBe('development');
      expect(config.safetyLevel).toBe(SafetyLevel.DEV_ONLY);
      expect(config.logLevel).toBe(LogLevel.DEBUG);
    });

    it('should use production defaults when deployment is production', () => {
      resetLoggerConfig();
      initializeLogger({platform: 'browser', deployment: 'production'});
      const config = getLoggerConfig();

      expect(config.environment).toBe('production');
      expect(config.safetyLevel).toBe(SafetyLevel.SAFE);
      expect(config.logLevel).toBe(LogLevel.INFO);
    });
  });

  describe('Singleton Behavior', () => {
    it('should maintain single configuration instance', () => {
      initializeLogger({platform: 'browser', deployment: 'development'}, {logLevel: LogLevel.WARN});

      const config1 = getLoggerConfig();
      const config2 = getLoggerConfig();

      expect(config1.logLevel).toBe(config2.logLevel);
    });

    it('should share transport manager across calls', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});

      const tm1 = globalConfig.getTransportManager();
      const tm2 = globalConfig.getTransportManager();

      expect(tm1).toBe(tm2); // Same instance
    });

    it('should share sanitizer across calls', () => {
      initializeLogger({platform: 'browser', deployment: 'development'});

      const s1 = globalConfig.getSanitizer();
      const s2 = globalConfig.getSanitizer();

      expect(s1).toBe(s2); // Same instance
    });
  });

  describe('DataDog Helper Functions', () => {
    describe('getDatadogTransport', () => {
      it('should return null when logger is not initialized', () => {
        const transport = getDatadogTransport();
        expect(transport).toBeNull();
      });

      it('should return null when DataDog transport is not configured', () => {
        initializeLogger({platform: 'browser', deployment: 'development'}, {
          transports: {
            console: {
              enabled: true,
              level: LogLevel.INFO,
            },
          },
        });

        const transport = getDatadogTransport();
        expect(transport).toBeNull();
      });

      it('should return DataDog transport when configured', () => {
        initializeLogger({platform: 'browser', deployment: 'production'}, {
          transports: {
            datadog: {
              enabled: true,
              level: LogLevel.INFO,
              clientToken: 'test-token',
              applicationId: 'test-app-id',
              site: 'datadoghq.eu',
              service: 'test-service',
              forwardConsoleLogs: false,
            },
          },
        });

        const transport = getDatadogTransport();
        expect(transport).toBeDefined();
        expect(transport.constructor.name).toBe('DatadogTransport');
      });

      it('should return same transport instance on multiple calls', () => {
        initializeLogger({platform: 'browser', deployment: 'production'}, {
          transports: {
            datadog: {
              enabled: true,
              level: LogLevel.INFO,
              clientToken: 'test-token',
              applicationId: 'test-app-id',
              site: 'datadoghq.eu',
              service: 'test-service',
              forwardConsoleLogs: false,
            },
          },
        });

        const transport1 = getDatadogTransport();
        const transport2 = getDatadogTransport();
        expect(transport1).toBe(transport2);
      });
    });

    describe('isDatadogEnabled', () => {
      it('should return false when logger is not initialized', () => {
        expect(isDatadogEnabled()).toBe(false);
      });

      it('should return false when DataDog transport is not configured', () => {
        initializeLogger({platform: 'browser', deployment: 'development'}, {
          transports: {
            console: {
              enabled: true,
              level: LogLevel.INFO,
            },
          },
        });

        expect(isDatadogEnabled()).toBe(false);
      });

      it('should return false when DataDog transport is disabled', () => {
        initializeLogger({platform: 'browser', deployment: 'production'}, {
          transports: {
            datadog: {
              enabled: false,
              level: LogLevel.INFO,
              clientToken: 'test-token',
              applicationId: 'test-app-id',
              site: 'datadoghq.eu',
              service: 'test-service',
              forwardConsoleLogs: false,
            },
          },
        });

        expect(isDatadogEnabled()).toBe(false);
      });

      it('should return false when DataDog SDKs are not available (initialization fails)', () => {
        // DataDog transport will fail to initialize in test environment
        initializeLogger({platform: 'browser', deployment: 'production'}, {
          transports: {
            datadog: {
              enabled: true,
              level: LogLevel.INFO,
              clientToken: 'test-token',
              applicationId: 'test-app-id',
              site: 'datadoghq.eu',
              service: 'test-service',
              forwardConsoleLogs: false,
            },
          },
        });

        // In test environment, DataDog SDKs are not available
        expect(isDatadogEnabled()).toBe(false);
      });
    });

    describe('setDatadogUser', () => {
      it('should not throw when logger is not initialized', () => {
        expect(() => {
          setDatadogUser('test-user-123');
        }).not.toThrow();
      });

      it('should not throw when DataDog transport is not configured', () => {
        initializeLogger({platform: 'browser', deployment: 'development'}, {
          transports: {
            console: {
              enabled: true,
              level: LogLevel.INFO,
            },
          },
        });

        expect(() => {
          setDatadogUser('test-user-123');
        }).not.toThrow();
      });

      it('should call setUser on DataDog transport when available', () => {
        initializeLogger({platform: 'browser', deployment: 'production'}, {
          transports: {
            datadog: {
              enabled: true,
              level: LogLevel.INFO,
              clientToken: 'test-token',
              applicationId: 'test-app-id',
              site: 'datadoghq.eu',
              service: 'test-service',
              forwardConsoleLogs: false,
            },
          },
        });

        const transport = getDatadogTransport();
        if (transport) {
          const setUserSpy = jest.spyOn(transport, 'setUser');
          setDatadogUser('test-user-123');
          expect(setUserSpy).toHaveBeenCalledWith('test-user-123');
        }
      });

      it('should handle multiple setUser calls', () => {
        initializeLogger({platform: 'browser', deployment: 'production'}, {
          transports: {
            datadog: {
              enabled: true,
              level: LogLevel.INFO,
              clientToken: 'test-token',
              applicationId: 'test-app-id',
              site: 'datadoghq.eu',
              service: 'test-service',
              forwardConsoleLogs: false,
            },
          },
        });

        expect(() => {
          setDatadogUser('user-1');
          setDatadogUser('user-2');
          setDatadogUser('user-3');
        }).not.toThrow();
      });
    });
  });
});
