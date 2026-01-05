import {Transport, LogEntry, ConsoleTransportConfig} from '../types';
/**
 * Console transport implementation
 * Uses logdown for consistent, colored output across all log methods
 */
export declare class ConsoleTransport implements Transport {
  private config;
  private logdownInstances;
  constructor(config: ConsoleTransportConfig);
  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(entry: LogEntry): boolean;
  /**
   * Get or create a logdown instance for the logger name
   */
  private getLogdownInstance;
  /**
   * Write the log entry to console using logdown for consistent formatting
   * Note: Category is omitted from console output as it's typically not useful for local debugging
   */
  write(entry: LogEntry): void;
  /**
   * Map log level to logdown method
   */
  private mapLogLevel;
  /**
   * Write to the appropriate logdown method
   */
  private writeToLogdown;
}
//# sourceMappingURL=ConsoleTransport.d.ts.map
