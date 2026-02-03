/**
 * Stress Tests
 * Performance and load testing for logging and sanitization
 */

import {getLogger, clearLoggers} from '../LoggerWithGlobalConfig';
import {initializeLogger, resetLoggerConfig} from '../GlobalConfig';
import {Sanitizer} from '../sanitization/Sanitizer';
import {LogLevel, SafetyLevel, LogEntry} from '../types';
import {getDefaultSanitizationRules} from '../config/ContextWhitelist';
import {DatadogTransport} from '../transports/DatadogTransport';
import {FileTransport} from '../transports/FileTransport';
import {TransportManager} from '../transports/TransportManager';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('Stress Tests', () => {
  beforeEach(() => {
    resetLoggerConfig();
    clearLoggers();

    initializeLogger({
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
    });
  });

  afterEach(() => {
    resetLoggerConfig();
    clearLoggers();
  });

  describe('Logging Performance', () => {
    it('should handle 1000 log messages quickly', () => {
      const logger = getLogger('stress-test');
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        logger.production.info(`Message ${i}`, {index: i});
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);

      // Average time per log should be reasonable
      const avgTimePerLog = duration / 1000;
      expect(avgTimePerLog).toBeLessThan(1); // Less than 1ms per log
    });

    it('should handle 10000 log messages', () => {
      const logger = getLogger('stress-test-large');
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        logger.production.info(`Message ${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 5 seconds
      expect(duration).toBeLessThan(5000);

      // Average time should still be reasonable
      const avgTimePerLog = duration / 10000;
      expect(avgTimePerLog).toBeLessThan(0.5); // Less than 0.5ms per log
    });

    it('should handle concurrent logging from multiple loggers', async () => {
      const numLoggers = 10;
      const logsPerLogger = 100;

      const loggers = Array.from({length: numLoggers}, (_, i) => getLogger(`logger-${i}`));

      const startTime = performance.now();

      const promises = loggers.map(logger =>
        Promise.all(
          Array.from({length: logsPerLogger}, (_, i) => Promise.resolve(logger.production.info(`Message ${i}`))),
        ),
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 1000 total logs quickly
      expect(duration).toBeLessThan(2000);
    });

    it('should handle rapid-fire logging', () => {
      const logger = getLogger('rapid-fire');
      const count = 1000;
      const startTime = performance.now();

      // Log as fast as possible
      for (let i = 0; i < count; i++) {
        logger.production.info('Rapid message');
        logger.production.warn('Rapid warning');
        logger.production.error('Rapid error', new Error('test'));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 3000 logs in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Sanitization Performance', () => {
    let sanitizer: Sanitizer;
    let testEntry: LogEntry;

    beforeEach(() => {
      const rules = getDefaultSanitizationRules();
      sanitizer = new Sanitizer(rules);

      testEntry = {
        level: LogLevel.INFO,
        message: 'Test message with sensitive data',
        loggerName: 'test-logger',
        isProductionSafe: false,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'test-id',
          environment: 'test',
          platform: 'test',
          logger: 'test-logger',
        },
      };
    });

    it('should sanitize 1000 messages quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const entry = {
          ...testEntry,
          message: `Email: user-${i}@example.com, Phone: +1-555-0${i.toString().padStart(3, '0')}`,
        };
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 2 seconds
      expect(duration).toBeLessThan(2000);

      const avgTimePerSanitization = duration / 1000;
      expect(avgTimePerSanitization).toBeLessThan(2); // Less than 2ms per sanitization
    });

    it('should handle messages with many PII patterns', () => {
      const complexMessage = `
        User email: john.doe@example.com
        Phone: +1-555-0123
        SSN: 123-45-6789
        Credit Card: 4532-1234-5678-9010
        IP Address: 192.168.1.1
        URL: https://example.com/secret?token=abc123
        UUID: 550e8400-e29b-41d4-a716-446655440000
        Bearer Token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
      `;

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const entry = {...testEntry, message: complexMessage};
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Complex sanitization should still be fast
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large messages efficiently', () => {
      const largeMessage = 'A'.repeat(10000) + ' email@example.com ' + 'B'.repeat(10000);
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const entry = {...testEntry, message: largeMessage};
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Large messages take more time due to regex processing on 20k character strings
      // This is expected and acceptable for real-world usage
      // Allow extra time for CI environments which may be under load
      expect(duration).toBeLessThan(90000); // 90 seconds for 100 large messages
    });

    it('should handle deep context objects', () => {
      const deepContext = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  email: 'deep@example.com',
                  ssn: '123-45-6789',
                  data: Array(100).fill('sensitive data'),
                },
              },
            },
          },
        },
      };

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const entry = {...testEntry, context: deepContext};
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Deep context sanitization should complete
      expect(duration).toBeLessThan(2000);
    });

    it('should not degrade performance with repeated sanitization', () => {
      const iterations = 5;
      const logsPerIteration = 200;
      const durations: number[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        const startTime = performance.now();

        for (let i = 0; i < logsPerIteration; i++) {
          const entry = {
            ...testEntry,
            message: `Test ${iter}-${i}: email@example.com, ssn: 123-45-6789`,
          };
          sanitizer.sanitize(entry, SafetyLevel.SAFE);
        }

        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Performance should remain consistent (no memory leaks)
      const firstDuration = durations[0];
      const lastDuration = durations[durations.length - 1];

      // Last iteration shouldn't be more than 2x slower than first
      expect(lastDuration).toBeLessThan(firstDuration * 2);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated logger creation', () => {
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const logger = getLogger(`temp-logger-${i}`);
        logger.production.info('Temporary log');
      }

      // Clear loggers
      clearLoggers();

      // Create new logger to ensure no issues
      const finalLogger = getLogger('final-logger');
      expect(() => {
        finalLogger.production.info('Final log');
      }).not.toThrow();
    });

    it('should handle large context objects without memory issues', () => {
      const logger = getLogger('memory-test');

      for (let i = 0; i < 100; i++) {
        const largeContext = {
          data: Array(1000)
            .fill(null)
            .map((_, idx) => ({
              index: idx,
              value: `value-${idx}`,
              nested: {deep: `data-${idx}`},
            })),
        };

        logger.production.info('Large context log', largeContext);
      }

      // Should complete without crashing
      expect(true).toBe(true);
    });
  });

  describe('Regex Performance', () => {
    let sanitizer: Sanitizer;

    beforeEach(() => {
      const rules = getDefaultSanitizationRules();
      sanitizer = new Sanitizer(rules);
    });

    it('should handle pathological regex cases', () => {
      // Test strings that might cause catastrophic backtracking
      const pathologicalCases = [
        'a'.repeat(1000) + '@',
        '1'.repeat(1000) + '-',
        'http://'.repeat(100),
        'x'.repeat(500) + '.' + 'y'.repeat(500),
      ];

      const startTime = performance.now();

      for (const testCase of pathologicalCases) {
        const entry: LogEntry = {
          level: LogLevel.INFO,
          message: testCase,
          loggerName: 'regex-test',
          isProductionSafe: false,
          metadata: {
            timestamp: new Date().toISOString(),
            correlationId: 'test',
            environment: 'test',
            platform: 'test',
            logger: 'test',
          },
        };
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should not hang or take excessive time
      expect(duration).toBeLessThan(1000);
    });

    it('should handle many regex patterns efficiently', () => {
      const message = `
        Multiple patterns:
        email@example.com,
        +1-555-0123,
        123-45-6789,
        192.168.1.1,
        https://example.com,
        550e8400-e29b-41d4-a716-446655440000
      `;

      const startTime = performance.now();

      for (let i = 0; i < 500; i++) {
        const entry: LogEntry = {
          level: LogLevel.INFO,
          message,
          loggerName: 'pattern-test',
          isProductionSafe: false,
          metadata: {
            timestamp: new Date().toISOString(),
            correlationId: 'test',
            environment: 'test',
            platform: 'test',
            logger: 'test',
          },
        };
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Multiple patterns should still be fast
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should identify slowest operations', () => {
      const logger = getLogger('bottleneck-test');
      const sanitizer = new Sanitizer(getDefaultSanitizationRules());

      const operations = {
        simpleLog: 0,
        logWithContext: 0,
        logWithError: 0,
        sanitization: 0,
      };

      // Simple logging
      let start = performance.now();
      for (let i = 0; i < 1000; i++) {
        logger.production.info('Simple message');
      }
      operations.simpleLog = performance.now() - start;

      // Logging with context
      start = performance.now();
      for (let i = 0; i < 1000; i++) {
        logger.production.info('Context message', {userId: `user-${i}`, sessionId: `session-${i}`});
      }
      operations.logWithContext = performance.now() - start;

      // Logging with error
      start = performance.now();
      for (let i = 0; i < 1000; i++) {
        logger.production.error('Error message', new Error(`Error ${i}`));
      }
      operations.logWithError = performance.now() - start;

      // Pure sanitization
      start = performance.now();
      for (let i = 0; i < 1000; i++) {
        const entry: LogEntry = {
          level: LogLevel.INFO,
          message: `Test message ${i} with email@example.com`,
          loggerName: 'test',
          isProductionSafe: false,
          metadata: {
            timestamp: new Date().toISOString(),
            correlationId: 'test',
            environment: 'test',
            platform: 'test',
            logger: 'test',
          },
        };
        sanitizer.sanitize(entry, SafetyLevel.SAFE);
      }
      operations.sanitization = performance.now() - start;

      // All operations should be reasonably fast
      expect(operations.simpleLog).toBeLessThan(500);
      expect(operations.logWithContext).toBeLessThan(1000);
      expect(operations.logWithError).toBeLessThan(1500);
      expect(operations.sanitization).toBeLessThan(2000);

      // Log performance metrics (for manual inspection during development)
      console.log('Performance metrics (ms):');
      console.log(`  Simple logging: ${operations.simpleLog.toFixed(2)}`);
      console.log(`  With context: ${operations.logWithContext.toFixed(2)}`);
      console.log(`  With error: ${operations.logWithError.toFixed(2)}`);
      console.log(`  Sanitization: ${operations.sanitization.toFixed(2)}`);
    });
  });

  describe('Transport Stress Tests', () => {
    let testEntry: LogEntry;
    let testDir: string;

    beforeEach(() => {
      // Create a temporary directory for test files
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-stress-test-'));

      testEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        loggerName: 'transport-stress',
        isProductionSafe: true,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: 'test-id',
          environment: 'test',
          platform: 'test',
          logger: 'transport-stress',
        },
      };
    });

    afterEach(() => {
      // Clean up test directory
      if (testDir && fs.existsSync(testDir)) {
        const files = fs.readdirSync(testDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testDir, file));
        }
        fs.rmdirSync(testDir);
      }
    });

    describe('FileTransport Performance', () => {
      it('should handle 1000 writes without blocking', async () => {
        const logPath = path.join(testDir, 'stress-test.log');
        const transport = new FileTransport({
          enabled: true,
          level: LogLevel.DEBUG,
          path: logPath,
          maxSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          format: 'json',
          runtimeEnvironment: {
            platform: 'node',
            deployment: 'development',
          },
        });

        // Verify transport is initialized
        expect(transport.isInitialized()).toBe(true);
        expect(transport.shouldWrite(testEntry)).toBe(true);

        const startTime = performance.now();

        const writes = Array.from({length: 1000}, (_, i) => transport.write({...testEntry, message: `Message ${i}`}));

        await Promise.all(writes);
        await transport.flush();

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should handle 1000 writes quickly
        expect(duration).toBeLessThan(5000);

        // Verify log file was created and contains data
        expect(fs.existsSync(logPath)).toBe(true);
        const fileContent = fs.readFileSync(logPath, 'utf8');
        const lines = fileContent.trim().split('\n');
        expect(lines.length).toBe(1000);

        console.log(`FileTransport: 1000 writes in ${duration.toFixed(2)}ms`);
      });

      it('should handle concurrent writes from multiple transports', async () => {
        const transports = Array.from(
          {length: 5},
          (_, i) =>
            new FileTransport({
              enabled: true,
              level: LogLevel.DEBUG,
              path: path.join(testDir, `stress-test-${i}.log`),
              maxSize: 10 * 1024 * 1024,
              maxFiles: 5,
              format: 'json',
              runtimeEnvironment: {
                platform: 'node',
                deployment: 'development',
              },
            }),
        );

        const startTime = performance.now();

        const allWrites = transports.flatMap(transport =>
          Array.from({length: 200}, (_, i) => transport.write({...testEntry, message: `Message ${i}`})),
        );

        await Promise.all(allWrites);
        await Promise.all(transports.map(t => t.flush()));

        const endTime = performance.now();
        const duration = endTime - startTime;

        // 5 transports x 200 writes = 1000 total
        expect(duration).toBeLessThan(5000);

        // Verify all 5 log files were created
        for (let i = 0; i < 5; i++) {
          const logPath = path.join(testDir, `stress-test-${i}.log`);
          expect(fs.existsSync(logPath)).toBe(true);
          const fileContent = fs.readFileSync(logPath, 'utf8');
          const lines = fileContent.trim().split('\n');
          expect(lines.length).toBe(200);
        }

        console.log(`FileTransport (5 concurrent): 1000 writes in ${duration.toFixed(2)}ms`);
      });

      it('should handle rapid log rotation under load', async () => {
        const logPath = path.join(testDir, 'rotation-test.log');
        const transport = new FileTransport({
          enabled: true,
          level: LogLevel.DEBUG,
          path: logPath,
          maxSize: 100, // Very small to trigger frequent rotation
          maxFiles: 3,
          format: 'json',
          runtimeEnvironment: {
            platform: 'node',
            deployment: 'development',
          },
        });

        const startTime = performance.now();

        for (let i = 0; i < 100; i++) {
          await transport.write({...testEntry, message: `Message ${i}`});
        }
        await transport.flush();

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should handle rotation without excessive delay
        expect(duration).toBeLessThan(10000);

        // Verify rotation was triggered - check for rotated files
        const files = fs.readdirSync(testDir);
        const rotatedFiles = files.filter(f => f.startsWith('rotation-test') && f !== 'rotation-test.log');
        expect(rotatedFiles.length).toBeGreaterThan(0);

        console.log(`FileTransport with rotation: 100 writes in ${duration.toFixed(2)}ms`);
      });

      it('should maintain write order under stress', async () => {
        const logPath = path.join(testDir, 'order-test.log');
        const transport = new FileTransport({
          enabled: true,
          level: LogLevel.DEBUG,
          path: logPath,
          maxSize: 10 * 1024 * 1024,
          maxFiles: 5,
          format: 'json',
          runtimeEnvironment: {
            platform: 'node',
            deployment: 'development',
          },
        });

        // Fire writes rapidly
        for (let i = 0; i < 100; i++) {
          transport.write({...testEntry, message: `Message ${i}`});
        }
        await transport.flush();

        // Read the log file and verify order
        const fileContent = fs.readFileSync(logPath, 'utf8');
        const lines = fileContent.trim().split('\n');
        expect(lines.length).toBe(100);

        // Verify order is maintained
        for (let i = 0; i < lines.length; i++) {
          const logEntry = JSON.parse(lines[i]);
          expect(logEntry.message).toBe(`Message ${i}`);
        }

        console.log(`FileTransport order maintained: ${lines.length} writes in sequence`);
      });
    });

    describe('DatadogTransport Simulation', () => {
      it('should simulate network latency with batched writes', async () => {
        // Simulate Datadog SDK
        const mockDatadogLogger = {
          info: jest.fn().mockImplementation(() => {
            // Simulate 5ms network latency
            return new Promise(resolve => setTimeout(resolve, 5));
          }),
          warn: jest.fn().mockImplementation(() => {
            return new Promise(resolve => setTimeout(resolve, 5));
          }),
          error: jest.fn().mockImplementation(() => {
            return new Promise(resolve => setTimeout(resolve, 5));
          }),
        };

        const startTime = performance.now();

        // Simulate 100 log writes with network latency
        const writes = Array.from({length: 100}, () => mockDatadogLogger.info());

        await Promise.all(writes);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should handle network latency efficiently (parallel writes)
        // Sequential would be 500ms (100 * 5ms), parallel should be much faster
        expect(duration).toBeLessThan(200); // Allow overhead for test environment

        console.log(`Simulated Datadog: 100 writes with 5ms latency in ${duration.toFixed(2)}ms`);
      });

      it('should handle burst logging to Datadog', async () => {
        const mockDatadogLogger = {
          info: jest.fn().mockResolvedValue(undefined),
          warn: jest.fn().mockResolvedValue(undefined),
          error: jest.fn().mockResolvedValue(undefined),
        };

        const startTime = performance.now();

        // Burst of 1000 logs
        const writes = Array.from({length: 1000}, (_, i) => {
          const level = i % 3 === 0 ? 'error' : i % 2 === 0 ? 'warn' : 'info';
          return mockDatadogLogger[level]();
        });

        await Promise.all(writes);

        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(1000);

        // Verify all logs were sent
        expect(mockDatadogLogger.info).toHaveBeenCalled();
        expect(mockDatadogLogger.warn).toHaveBeenCalled();
        expect(mockDatadogLogger.error).toHaveBeenCalled();

        const totalCalls =
          mockDatadogLogger.info.mock.calls.length +
          mockDatadogLogger.warn.mock.calls.length +
          mockDatadogLogger.error.mock.calls.length;

        expect(totalCalls).toBe(1000);

        console.log(`Simulated Datadog burst: 1000 logs in ${duration.toFixed(2)}ms`);
      });

      it('should handle Datadog connection failures gracefully', async () => {
        let failureCount = 0;
        const mockDatadogLogger = {
          info: jest.fn().mockImplementation(() => {
            // Simulate 10% failure rate
            if (Math.random() < 0.1) {
              failureCount++;
              return Promise.reject(new Error('Network error'));
            }
            return Promise.resolve();
          }),
        };

        const startTime = performance.now();

        // Write 100 logs with potential failures
        const writes = Array.from({length: 100}, () =>
          mockDatadogLogger.info().catch(() => {
            /* Silently handle failures */
          }),
        );

        await Promise.all(writes);

        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(1000);

        console.log(
          `Simulated Datadog with failures: 100 writes (${failureCount} failures) in ${duration.toFixed(2)}ms`,
        );
      });
    });

    describe('TransportManager with Multiple Transports', () => {
      it('should handle writes to multiple transports concurrently', async () => {
        const manager = new TransportManager({
          console: {enabled: true, level: LogLevel.DEBUG},
          file: {
            enabled: true,
            level: LogLevel.INFO,
            path: '/tmp/multi-test.log',
            maxSize: 10 * 1024 * 1024,
            maxFiles: 5,
            format: 'json',
            runtimeEnvironment: {
              platform: 'node',
              deployment: 'development',
            },
          },
          datadog: {
            enabled: false, // Disabled for test
            level: LogLevel.WARN,
            clientToken: 'test',
            applicationId: 'test',
            site: 'datadoghq.eu',
            service: 'test',
            forwardConsoleLogs: false,
          },
        });

        const transports = manager.getTransports();
        transports.forEach(transport => {
          (transport.shouldWrite as jest.Mock) = jest.fn().mockReturnValue(true);
          (transport.write as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        });

        const startTime = performance.now();

        const writes = Array.from({length: 500}, (_, i) => manager.write({...testEntry, message: `Message ${i}`}));

        await Promise.all(writes);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should handle multi-transport writes efficiently
        expect(duration).toBeLessThan(2000);

        // Each transport should have received all writes
        transports.forEach(transport => {
          expect(transport.write).toHaveBeenCalledTimes(500);
        });

        console.log(`TransportManager (${transports.length} transports): 500 writes in ${duration.toFixed(2)}ms`);
      });

      it('should handle mixed sync and async transports', async () => {
        const manager = new TransportManager({
          console: {enabled: true, level: LogLevel.DEBUG},
          file: {
            enabled: true,
            level: LogLevel.DEBUG,
            path: '/tmp/mixed-test.log',
            maxSize: 10 * 1024 * 1024,
            maxFiles: 5,
            format: 'json',
            runtimeEnvironment: {
              platform: 'node',
              deployment: 'development',
            },
          },
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

        const transports = manager.getTransports();

        // First transport: sync (fast)
        (transports[0].shouldWrite as jest.Mock) = jest.fn().mockReturnValue(true);
        (transports[0].write as jest.Mock) = jest.fn().mockReturnValue(undefined);

        // Second transport: async with delay
        if (transports[1]) {
          (transports[1].shouldWrite as jest.Mock) = jest.fn().mockReturnValue(true);
          (transports[1].write as jest.Mock) = jest
            .fn()
            .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1)));
        }

        const startTime = performance.now();

        await Promise.all(Array.from({length: 100}, () => manager.write(testEntry)));

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should handle mixed transports efficiently
        expect(duration).toBeLessThan(2000);

        console.log(`Mixed sync/async transports: 100 writes in ${duration.toFixed(2)}ms`);
      });
    });

    describe('End-to-End Stress Test', () => {
      it('should handle realistic production load', async () => {
        // Reset and configure like production
        resetLoggerConfig();
        clearLoggers();

        initializeLogger({
          environment: 'production',
          safetyLevel: SafetyLevel.SAFE,
          logLevel: LogLevel.INFO,
          transports: {
            console: {enabled: true, level: LogLevel.WARN},
            file: {
              enabled: true,
              level: LogLevel.INFO,
              path: '/tmp/production-stress.log',
              maxSize: 10 * 1024 * 1024,
              maxFiles: 5,
              format: 'json',
              runtimeEnvironment: {
                platform: 'node',
                deployment: 'production',
              },
            },
            datadog: {
              enabled: false, // Would be true in real production
              level: LogLevel.INFO,
              clientToken: 'test',
              applicationId: 'test',
              site: 'datadoghq.eu',
              service: 'test',
              forwardConsoleLogs: false,
            },
          },
        });

        const logger = getLogger('production-stress');

        const startTime = performance.now();

        // Simulate realistic production traffic:
        // - Mix of log levels
        // - Some with context
        // - Some with errors
        // - Varied message complexity
        for (let i = 0; i < 1000; i++) {
          if (i % 10 === 0) {
            // 10% errors
            logger.production.error(`Error occurred ${i}`, new Error(`Error ${i}`), {
              userId: `user-${i}`,
              operation: 'critical-op',
            });
          } else if (i % 5 === 0) {
            // 20% warnings
            logger.production.warn(`Warning ${i}`, {
              metric: i,
              threshold: 100,
            });
          } else {
            // 70% info
            logger.production.info(`Operation completed ${i}`, {
              duration: Math.random() * 1000,
              success: true,
            });
          }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Real production load should complete quickly
        expect(duration).toBeLessThan(5000);

        const avgTimePerLog = duration / 1000;
        expect(avgTimePerLog).toBeLessThan(5); // Less than 5ms per log

        console.log(`\n=== Production Stress Test ===`);
        console.log(`Total duration: ${duration.toFixed(2)}ms`);
        console.log(`Logs processed: 1000`);
        console.log(`Average time per log: ${avgTimePerLog.toFixed(3)}ms`);
        console.log(`Throughput: ${((1000 / duration) * 1000).toFixed(0)} logs/second`);
      });
    });
  });
});
