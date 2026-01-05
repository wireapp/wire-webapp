import {Sanitizer} from './sanitization/Sanitizer';
import {TransportManager} from './transports/TransportManager';
import {LoggerConfig, RuntimeEnvironment} from './types';
/**
 * Type definition for globalThis extensions
 */
declare global {
  interface GlobalThis {
    [key: symbol]: GlobalLoggerConfig | undefined;
  }
}
/**
 * Global configuration singleton
 */
declare class GlobalLoggerConfig {
  private config;
  private transportManager;
  private sanitizer;
  private initialized;
  /**
   * Initialize global configuration (call once at app startup)
   *
   * **CRITICAL**: This sets up the global logger singleton that all logger instances share.
   * Call this once during application initialization before any getLogger() calls.
   *
   * ## Security Configuration
   *
   * The initialization controls critical security settings:
   *
   * 1. **Transport Configuration**:
   *    - DataDog: MUST set `forwardConsoleLogs: false` to prevent console.log forwarding
   *    - File: Only writes production-safe logs (isProductionSafe: true)
   *    - Console: Always accepts all logs
   *
   * 2. **Sanitization Rules**:
   *    - Defaults include 45+ PII patterns (UUIDs, emails, tokens, etc.)
   *    - Microsoft Presidio patterns (19+ recognizers)
   *    - Wire-specific patterns (message content, encryption keys)
   *
   * 3. **Context Whitelist**:
   *    - Production logs: Only whitelisted keys allowed
   *    - Whitelist: conversationId, userId, duration, errorCode, etc.
   *    - Unknown keys silently dropped
   *
   * ## Platform Detection
   *
   * - `browser`: Web application (uses localStorage, no file transport)
   * - `electron`: Desktop application (supports file transport)
   * - `node`: Server application (supports file transport)
   *
   * ## Deployment Mode
   *
   * - `development`: More verbose console output, debug logs enabled
   * - `production`: Only INFO+ logs, production-safe defaults
   *
   * @param runtimeEnvironment - Platform and deployment information
   * @param config - Optional partial configuration to override defaults
   *
   * @example
   * ```typescript
   * // Browser application with DataDog
   * initializeLogger(
   *   { platform: 'browser', deployment: 'production' },
   *   {
   *     transports: {
   *       console: { enabled: true, level: LogLevel.INFO },
   *       datadog: {
   *         enabled: true,
   *         clientToken: 'YOUR_TOKEN',
   *         applicationId: 'YOUR_APP_ID',
   *         forwardConsoleLogs: false, // CRITICAL: Never forward console logs
   *       }
   *     }
   *   }
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Electron application with file logging
   * initializeLogger(
   *   { platform: 'electron', deployment: 'production' },
   *   {
   *     transports: {
   *       console: { enabled: true, level: LogLevel.INFO },
   *       file: {
   *         enabled: true,
   *         path: './logs/app.log',
   *         maxSize: 10 * 1024 * 1024, // 10MB
   *         maxFiles: 5,
   *       }
   *     }
   *   }
   * );
   * ```
   *
   * @throws Never throws - logs warnings if already initialized
   */
  initialize(runtimeEnvironment: RuntimeEnvironment, config?: Partial<LoggerConfig>): void;
  /**
   * Update configuration after initialization
   */
  updateConfig(updates: Partial<LoggerConfig>): void;
  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig;
  /**
   * Get transport manager
   */
  getTransportManager(): TransportManager;
  /**
   * Get sanitizer
   */
  getSanitizer(): Sanitizer;
  /**
   * Check if initialized
   */
  isInitialized(): boolean;
  /**
   * Reset configuration (useful for tests)
   */
  reset(): void;
  /**
   * Detect runtime platform
   */
  private detectPlatform;
  /**
   * Create default configuration
   */
  private createDefaultConfig;
}
/**
 * Global configuration singleton instance
 */
export declare const globalConfig: GlobalLoggerConfig;
/**
 * Convenience function to initialize global config
 * Call this once at app startup (can be called from both Electron and Browser contexts)
 * If already initialized in another context (e.g., Electron), this will reuse that instance
 */
export declare function initializeLogger(runtimeEnvironment: RuntimeEnvironment, config?: Partial<LoggerConfig>): void;
/**
 * Update global configuration
 */
export declare function updateLoggerConfig(updates: Partial<LoggerConfig>): void;
/**
 * Get current global configuration
 */
export declare function getLoggerConfig(): LoggerConfig;
/**
 * Reset global configuration (for testing)
 */
export declare function resetLoggerConfig(): void;
/**
 * Check if logger has been initialized
 */
export declare function isLoggerInitialized(): boolean;
/**
 * Get the DataDog transport instance (if available)
 * Useful for accessing DataDog-specific features like setUser()
 */
export declare function getDatadogTransport(): any;
/**
 * Set user information for DataDog tracking
 * @param userId - User ID to set (will be truncated to first 8 characters)
 */
export declare function setDatadogUser(userId: string): void;
/**
 * Check if DataDog is enabled and initialized
 */
export declare function isDatadogEnabled(): boolean;
export {};
//# sourceMappingURL=GlobalConfig.d.ts.map
