/**
 * FileTransport Tests
 * Tests for file-based logging with rotation
 */

import {FileTransport} from '../transports/FileTransport';
import {LogLevel, FileTransportConfig, LogEntry} from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileTransport', () => {
  let mockConfig: FileTransportConfig;
  let testEntry: LogEntry;
  let testDir: string;
  let testLogPath: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transport-test-'));
    testLogPath = path.join(testDir, 'app.log');

    mockConfig = {
      enabled: true,
      level: LogLevel.DEBUG,
      path: testLogPath,
      maxSize: 1024 * 1024, // 1MB
      maxFiles: 5,
      format: 'json',
      runtimeEnvironment: {
        platform: 'node',
        deployment: 'development',
      },
    };

    testEntry = {
      level: LogLevel.INFO,
      message: 'Test message',
      isProductionSafe: true,
      metadata: {
        timestamp: '2025-01-01T00:00:00.000Z',
        correlationId: 'test-id',
        environment: 'test',
        platform: 'test',
        logger: 'test-logger',
      },
    };
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir && fs.existsSync(testDir)) {
      const cleanup = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            // Make sure directory is writable before recursing
            try {
              fs.chmodSync(filePath, 0o755);
            } catch {}
            cleanup(filePath);
            fs.rmdirSync(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        }
      };
      cleanup(testDir);
      fs.rmdirSync(testDir);
    }
  });

  describe('Constructor', () => {
    it('should create file transport with config', () => {
      const transport = new FileTransport(mockConfig);
      expect(transport).toBeInstanceOf(FileTransport);
    });

    it('should initialize directory when enabled', () => {
      // Directory should already exist from beforeEach
      const transport = new FileTransport(mockConfig);
      expect(fs.existsSync(testDir)).toBe(true);
      expect(transport.isInitialized()).toBe(true);
    });

    it('should get current file size if file exists', () => {
      // Create a file with some content
      fs.writeFileSync(testLogPath, 'initial content');
      const transport = new FileTransport(mockConfig);
      expect(transport.getCurrentSize()).toBeGreaterThan(0);
    });

    it('should not initialize when disabled', () => {
      const disabledConfig = {...mockConfig, enabled: false};
      const transport = new FileTransport(disabledConfig);
      expect(transport.isInitialized()).toBe(false);
    });
  });

  describe('shouldWrite', () => {
    let transport: FileTransport;

    beforeEach(() => {
      transport = new FileTransport(mockConfig);
    });

    it('should write when enabled and level matches', () => {
      expect(transport.shouldWrite(testEntry)).toBe(true);
    });

    it('should not write when disabled', () => {
      const disabledTransport = new FileTransport({...mockConfig, enabled: false});
      expect(disabledTransport.shouldWrite(testEntry)).toBe(false);
    });

    it('should not write when log level is below threshold', () => {
      const highLevelTransport = new FileTransport({...mockConfig, level: LogLevel.ERROR});
      const debugEntry = {...testEntry, level: LogLevel.DEBUG};
      expect(highLevelTransport.shouldWrite(debugEntry)).toBe(false);
    });

    it('should write when log level is at threshold', () => {
      expect(transport.shouldWrite(testEntry)).toBe(true);
    });

    it('should write when log level is above threshold', () => {
      const errorEntry = {...testEntry, level: LogLevel.ERROR};
      expect(transport.shouldWrite(errorEntry)).toBe(true);
    });

    it('should not write development logs (isProductionSafe: false)', () => {
      const developmentEntry = {...testEntry, isProductionSafe: false};
      expect(transport.shouldWrite(developmentEntry)).toBe(false);
    });

    it('should write production logs (isProductionSafe: true)', () => {
      const productionEntry = {...testEntry, isProductionSafe: true};
      expect(transport.shouldWrite(productionEntry)).toBe(true);
    });
  });

  describe('write', () => {
    let transport: FileTransport;

    beforeEach(() => {
      transport = new FileTransport(mockConfig);
    });

    it('should write entry to file', async () => {
      await transport.write(testEntry);
      await transport.flush();

      expect(fs.existsSync(testLogPath)).toBe(true);
      const content = fs.readFileSync(testLogPath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should format as JSON when format is json', async () => {
      await transport.write(testEntry);
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test message');
    });

    it('should format as text when format is text', async () => {
      const textTransport = new FileTransport({...mockConfig, format: 'text'});
      await textTransport.write(testEntry);
      await textTransport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');

      expect(content).toContain('[2025-01-01T00:00:00.000Z]');
      expect(content).toContain('[INFO '); // Padded to 5 chars
      expect(content).toContain('Test message');
    });

    it('should include context in output', async () => {
      const entryWithContext = {
        ...testEntry,
        context: {userId: 'user-123'},
      };

      await transport.write(entryWithContext);
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.context).toEqual({userId: 'user-123'});
    });

    it('should include error in output', async () => {
      const testError = new Error('Test error');
      const entryWithError = {
        ...testEntry,
        level: LogLevel.ERROR,
        error: testError,
      };

      await transport.write(entryWithError);
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
    });

    it('should queue multiple writes', async () => {
      await Promise.all([
        transport.write(testEntry),
        transport.write({...testEntry, message: 'Message 2'}),
        transport.write({...testEntry, message: 'Message 3'}),
      ]);
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(3);
    });

    it('should not write when shouldWrite returns false', async () => {
      const disabledTransport = new FileTransport({...mockConfig, enabled: false});
      await disabledTransport.write(testEntry);
      await disabledTransport.flush();

      expect(fs.existsSync(testLogPath)).toBe(false);
    });

    it('should not write development logs to file', async () => {
      const developmentEntry = {...testEntry, isProductionSafe: false};
      await transport.write(developmentEntry);
      await transport.flush();

      // File should not be created for development logs
      expect(fs.existsSync(testLogPath)).toBe(false);
    });

    it('should write production logs but not development logs', async () => {
      const productionEntry = {...testEntry, message: 'Production log', isProductionSafe: true};
      const developmentEntry = {...testEntry, message: 'Development log', isProductionSafe: false};

      await transport.write(productionEntry);
      await transport.write(developmentEntry);
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      const lines = content.trim().split('\n');

      // Only one line should be written (production log)
      expect(lines.length).toBe(1);
      expect(content).toContain('Production log');
      expect(content).not.toContain('Development log');
    });
  });

  describe('Log Rotation', () => {
    it('should rotate when file size exceeds maxSize', async () => {
      const smallMaxSize = 100; // 100 bytes
      const transport = new FileTransport({...mockConfig, maxSize: smallMaxSize});

      // Write enough entries to trigger rotation
      for (let i = 0; i < 10; i++) {
        await transport.write(testEntry);
      }
      await transport.flush();

      // Should have triggered rotation - check for rotated files
      const files = fs.readdirSync(testDir);
      const rotatedFiles = files.filter(f => f.startsWith('app.') && f !== 'app.log');
      expect(rotatedFiles.length).toBeGreaterThan(0);
    });

    it('should use timestamp in rotated filename', async () => {
      const smallMaxSize = 100;
      const transport = new FileTransport({...mockConfig, maxSize: smallMaxSize});

      // Write enough to trigger rotation
      for (let i = 0; i < 10; i++) {
        await transport.write(testEntry);
      }
      await transport.flush();

      const files = fs.readdirSync(testDir);
      const rotatedFile = files.find(f => f.startsWith('app.') && f !== 'app.log');

      expect(rotatedFile).toBeDefined();
      expect(rotatedFile).toMatch(/app\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(rotatedFile).toMatch(/\.log$/);
    });

    it('should cleanup old log files beyond maxFiles', async () => {
      const smallMaxSize = 100;
      const transport = new FileTransport({...mockConfig, maxSize: smallMaxSize, maxFiles: 2});

      // Write enough to trigger multiple rotations
      for (let i = 0; i < 50; i++) {
        await transport.write(testEntry);
      }
      await transport.flush();

      // Should have limited number of log files (current + maxFiles - 1 rotated)
      const files = fs.readdirSync(testDir);
      const logFiles = files.filter(f => f.endsWith('.log'));
      expect(logFiles.length).toBeLessThanOrEqual(3); // current + 2 rotated
    });
  });

  describe('isInitialized', () => {
    it('should return true when enabled in Node environment', () => {
      const transport = new FileTransport(mockConfig);
      expect(transport.isInitialized()).toBe(true);
    });

    it('should return false when disabled', () => {
      const transport = new FileTransport({...mockConfig, enabled: false});
      expect(transport.isInitialized()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle write errors gracefully', async () => {
      // Use a read-only directory to trigger write errors
      const readOnlyPath = path.join(testDir, 'readonly', 'app.log');
      fs.mkdirSync(path.dirname(readOnlyPath));
      fs.chmodSync(path.dirname(readOnlyPath), 0o444); // Read-only

      const transport = new FileTransport({...mockConfig, path: readOnlyPath});
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await transport.write(testEntry);
      await transport.flush();

      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      fs.chmodSync(path.dirname(readOnlyPath), 0o755);
      consoleSpy.mockRestore();
    });

    it('should handle missing error stack', async () => {
      const transport = new FileTransport(mockConfig);
      const errorWithoutStack = new Error('No stack');
      delete errorWithoutStack.stack;

      const errorEntry = {
        ...testEntry,
        level: LogLevel.ERROR,
        error: errorWithoutStack,
      };

      await transport.write(errorEntry);
      await transport.flush();

      expect(fs.existsSync(testLogPath)).toBe(true);
      const content = fs.readFileSync(testLogPath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle empty context', async () => {
      const transport = new FileTransport(mockConfig);
      const entryWithEmptyContext = {
        ...testEntry,
        context: {},
      };

      await transport.write(entryWithEmptyContext);
      await transport.flush();

      expect(fs.existsSync(testLogPath)).toBe(true);
    });

    it('should handle very long messages', async () => {
      const transport = new FileTransport(mockConfig);
      const longMessage = 'A'.repeat(10000);

      await transport.write({...testEntry, message: longMessage});
      await transport.flush();

      expect(fs.existsSync(testLogPath)).toBe(true);
      const content = fs.readFileSync(testLogPath, 'utf8');
      expect(content).toContain(longMessage);
    });

    it('should handle concurrent writes correctly', async () => {
      const transport = new FileTransport(mockConfig);

      // Write many entries concurrently
      const writes = Array.from({length: 100}, (_, i) => transport.write({...testEntry, message: `Message ${i}`}));

      await Promise.all(writes);
      await transport.flush();

      // All writes should complete
      const content = fs.readFileSync(testLogPath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(100);
    });
  });

  describe('File Format', () => {
    it('should pad log level to 5 characters in text format', async () => {
      const transport = new FileTransport({...mockConfig, format: 'text'});
      await transport.write({...testEntry, level: LogLevel.INFO});
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      expect(content).toMatch(/\[INFO \]/);
    });

    it('should pad logger name to 20 characters in text format', async () => {
      const transport = new FileTransport({...mockConfig, format: 'text'});
      await transport.write(testEntry);
      await transport.flush();

      const content = fs.readFileSync(testLogPath, 'utf8');
      expect(content).toMatch(/\[test-logger\s+\]/);
    });
  });
});
