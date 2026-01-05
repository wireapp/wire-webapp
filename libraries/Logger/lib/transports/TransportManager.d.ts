import {Transport, LogEntry, TransportConfig} from '../types';
/**
 * Transport Manager - manages all transports and routes logs
 */
export declare class TransportManager {
  private transports;
  private config;
  constructor(config: TransportConfig);
  /**
   * Initialize all configured transports
   */
  private initializeTransports;
  /**
   * Write log entry to all applicable transports
   */
  write(entry: LogEntry): Promise<void>;
  /**
   * Get all transports
   */
  getTransports(): Transport[];
  /**
   * Add a custom transport
   */
  addTransport(transport: Transport): void;
  /**
   * Remove a transport
   */
  removeTransport(transport: Transport): void;
  /**
   * Clear all transports
   */
  clearTransports(): void;
  /**
   * Check if Datadog transport is enabled and initialized
   */
  isDatadogEnabled(): boolean;
}
//# sourceMappingURL=TransportManager.d.ts.map
