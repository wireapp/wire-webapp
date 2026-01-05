import {Transport, LogEntry, DatadogTransportConfig} from '../types';
/**
 * Datadog transport implementation - Sends production logs to DataDog
 *
 * ## Security Features
 *
 * 1. **Production-Only Logs**:
 *    - Only accepts logs with `isProductionSafe: true`
 *    - Development logs (logger.development.*) are NEVER sent to DataDog
 *    - Enforced in `shouldWrite()` method
 *
 * 2. **Console Forwarding Disabled**:
 *    - **CRITICAL**: `forwardConsoleLogs` MUST be `false` in config
 *    - Prevents accidental console.log() leaks to DataDog
 *    - Manually verified during initialization
 *
 * 3. **AVS Log Filtering**:
 *    - AVS (Audio Video Signaling) logs are very verbose
 *    - Only specific AVS messages allowed (ccall_hash_user, c3_message_recv, etc.)
 *    - Reduces DataDog costs and noise
 *
 * 4. **Defense-in-Depth Sanitization**:
 *    - Additional sanitization in `beforeSend` hook
 *    - UUIDs → `[UUID]`
 *    - Emails → `[EMAIL]`
 *    - Bearer tokens → `Bearer [TOKEN]`
 *    - IP addresses → `[IP_ADDRESS]`
 *
 * 5. **URL Privacy**:
 *    - View URL always set to '/'
 *    - Referrer always removed
 *    - Prevents leaking sensitive URL parameters
 *
 * ## DataDog RUM Integration
 *
 * This transport initializes both DataDog Logs and DataDog RUM (Real User Monitoring):
 * - Logs: Application logs and errors
 * - RUM: User interactions, performance metrics, session tracking
 * - Correlation IDs link logs to RUM sessions
 *
 * ## Configuration
 *
 * Required peer dependencies:
 * - `@datadog/browser-logs` (optional)
 * - `@datadog/browser-rum` (optional)
 *
 * If not installed, transport silently disables itself.
 *
 * @example
 * ```typescript
 * const transport = new DatadogTransport({
 *   enabled: true,
 *   level: LogLevel.INFO,
 *   clientToken: 'YOUR_CLIENT_TOKEN',
 *   applicationId: 'YOUR_APP_ID',
 *   site: 'datadoghq.eu',
 *   service: 'my-service',
 *   env: 'production',
 *   version: '1.0.0',
 *   forwardConsoleLogs: false, // CRITICAL: Must be false
 * });
 * ```
 *
 * @see {@link DatadogTransportConfig} for configuration options
 * @see {@link isAllowedAVSLog} for AVS filtering logic
 */
export declare class DatadogTransport implements Transport {
  private config;
  private initialized;
  private debugLogger;
  constructor(config: DatadogTransportConfig);
  /**
   * Initialize Datadog SDK
   */
  private initializeDatadog;
  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(entry: LogEntry): boolean;
  /**
   * Write log entry to Datadog
   */
  write(entry: LogEntry): Promise<void>;
  /**
   * Map log level to Datadog level
   */
  private mapLogLevel;
  /**
   * Sanitization as defense in depth
   * Note: Primary sanitization happens before this, this is extra protection
   */
  private sanitizeMessage;
  /**
   * Sanitize context object recursively
   */
  private sanitizeContext;
  /**
   * Check if Datadog is initialized
   */
  isInitialized(): boolean;
  /**
   * Get Datadog RUM session ID for correlation
   */
  getSessionId(): string | null;
  /**
   * Set user information for DataDog tracking
   * @param userId - User ID to set (will be truncated to first 8 characters)
   */
  setUser(userId: string): void;
  /**
   * Get the DataDog Logs instance (for advanced use cases)
   */
  getDatadogLogs(): any;
  /**
   * Get the DataDog RUM instance (for advanced use cases)
   */
  getDatadogRum(): any;
}
//# sourceMappingURL=DatadogTransport.d.ts.map
