import {Transport, LogEntry, FileTransportConfig} from '../types';
/**
 * File transport implementation with log rotation
 *
 * Security: Only writes production-safe logs (isProductionSafe: true) to files.
 * Development logs (logger.development.*) are never persisted to disk.
 */
export declare class FileTransport implements Transport {
  private config;
  private currentSize;
  private writeQueue;
  constructor(config: FileTransportConfig);
  /**
   * Check if running in Node.js or Electron environment
   */
  private isNodeEnvironment;
  /**
   * Initialize log file and directory
   */
  private initializeLogFile;
  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(entry: LogEntry): boolean;
  /**
   * Write the log entry to file
   */
  write(entry: LogEntry): Promise<void>;
  /**
   * Write entry to file (internal)
   */
  private writeToFile;
  /**
   * Format the log entry for file output
   */
  private formatLogEntry;
  /**
   * Rotate log file if it exceeds max size
   */
  private rotateLogFile;
  /**
   * Get all log files sorted by modification time
   */
  private getLogFiles;
  /**
   * Clean up old log files beyond maxFiles limit
   */
  private cleanupOldLogs;
  /**
   * Check if transport is initialized
   */
  isInitialized(): boolean;
  /**
   * Get current log file size
   */
  getCurrentSize(): number;
  /**
   * Flush pending writes (useful for testing)
   */
  flush(): Promise<void>;
}
//# sourceMappingURL=FileTransport.d.ts.map
