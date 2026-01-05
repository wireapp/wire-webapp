import {LogEntry} from '../types';
/**
 * In-memory ring buffer for storing logs
 */
export declare class InMemoryLogBuffer {
  private buffer;
  private maxSize;
  /**
   * Add a log entry to the buffer
   */
  add(entry: LogEntry): void;
  /**
   * Export all logs as JSON string
   */
  export(): string;
  /**
   * Get all log entries
   */
  getAll(): LogEntry[];
  /**
   * Get the number of log entries in the buffer
   */
  size(): number;
  /**
   * Clear all logs from the buffer
   */
  clear(): void;
  /**
   * Get Datadog session ID for correlation
   */
  getDatadogSessionId(): string | null;
  /**
   * Get Datadog RUM status
   */
  getDatadogRumEnabled(): boolean;
  /**
   * Set the maximum buffer size
   */
  setMaxSize(size: number): void;
  /**
   * Get the maximum buffer size
   */
  getMaxSize(): number;
}
/**
 * Get or create the global log buffer
 * Shared across all contexts (Electron + Browser)
 */
export declare function getGlobalLogBuffer(): InMemoryLogBuffer;
/**
 * Set the global log buffer (for testing)
 */
export declare function setGlobalLogBuffer(buffer: InMemoryLogBuffer): void;
/**
 * Clear the global log buffer
 */
export declare function clearGlobalLogBuffer(): void;
//# sourceMappingURL=InMemoryLogBuffer.d.ts.map
