import {Logger as LogdownLogger} from 'logdown';
import {ProductionLogger, DevelopmentLogger} from './types';
/**
 * Wire Logger - Security-critical logging with automatic PII sanitization
 *
 * This logger provides two distinct logging APIs with different safety guarantees:
 *
 * ## Production Logs (logger.production.*)
 * **CRITICAL**: These logs are sent to external services (DataDog, files)
 * - Automatically sanitized for PII (45+ patterns)
 * - Context keys filtered by whitelist
 * - Safe for production environments
 * - Use for: Error tracking, metrics, operational monitoring
 *
 * @example
 * ```typescript
 * const logger = getLogger('MyComponent');
 *
 * // ✅ SAFE: Goes to DataDog with sanitization
 * logger.production.info('User logged in', { userId: user.id });
 * logger.production.error('API failed', error, { statusCode: 500 });
 * ```
 *
 * ## Development Logs (logger.development.*)
 * **SAFE**: These logs NEVER leave the console, never sent to external services
 * - Only visible in browser/terminal console
 * - Not persisted to files or DataDog
 * - Can contain sensitive data for debugging
 * - Use for: Debugging, state dumps, detailed tracing
 *
 * @example
 * ```typescript
 * // ✅ SAFE: Console only, never sent to DataDog
 * logger.development.debug('Full user state', { user: fullUserObject });
 * logger.development.trace('Processing step 5', { intermediateState });
 * ```
 *
 * ## Security Guarantees
 *
 * 1. **Production logs are automatically sanitized**:
 *    - UUIDs → `123e4567***`
 *    - Emails → `[EMAIL]`
 *    - Bearer tokens → `Bearer [TOKEN]`
 *    - Credit cards, phone numbers, IPs, etc.
 *
 * 2. **Context key whitelist** (production only):
 *    - Only whitelisted keys allowed: `conversationId`, `userId`, `duration`, `errorCode`, etc.
 *    - Unknown keys silently dropped at runtime
 *
 * 3. **Development logs never persisted**:
 *    - File transport rejects non-production logs
 *    - DataDog transport rejects non-production logs
 *    - Only console transport accepts them
 *
 * 4. **Microsoft Presidio PII detection**:
 *    - 19+ expert-maintained patterns
 *    - GDPR/PCI-DSS compliant
 *    - Multi-language support (20+ languages)
 *
 * ## Backward Compatibility
 *
 * Simple methods route directly to console (for migration):
 *
 * @example
 * ```typescript
 * logger.info('message');   // → console only
 * logger.error('message');  // → console only
 * ```
 *
 * **Migration tip**: Replace with explicit `.production.*` or `.development.*` methods
 *
 * @see {@link ProductionLogger} for production-safe methods
 * @see {@link DevelopmentLogger} for development-only methods
 * @see https://github.com/wireapp/wire-webapp/blob/main/libraries/Logger/README.md
 */
export declare class Logger {
  private name;
  private logdownInstance;
  private logBuffer;
  production: ProductionLogger;
  development: DevelopmentLogger;
  constructor(name: string);
  /**
   * Backward-compatible simple logging methods
   * These route to logdown directly for development (preserves colors and formatting)
   * Use logger.production.* for production-safe logs
   */
  log(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
  /**
   * Internal log method - handles all logging logic with sanitization
   */
  private logInternal;
  /**
   * Filter context to only include whitelisted keys for production
   */
  private filterContextWhitelist;
  /**
   * Create metadata for log entry
   */
  private createMetadata;
  /**
   * Generate correlation ID
   */
  private generateCorrelationId;
  /**
   * Detect platform
   */
  private detectPlatform;
  /**
   * Get logger name
   */
  getName(): string;
  /**
   * Get the underlying logdown instance (for advanced usage)
   */
  getLogdownInstance(): LogdownLogger;
}
/**
 * Get or create a lightweight logger instance
 * Shared across all contexts (Electron + Browser)
 *
 * @example
 * // At app startup in Electron (once):
 * import {initializeLogger} from '@wireapp/logger';
 * initializeLogger({
 *   environment: 'production',
 *   transports: {
 *     file: { enabled: true, path: './logs/app.log' }
 *   }
 * });
 *
 * // Later in Browser context:
 * import {initializeLogger} from '@wireapp/logger';
 * initializeLogger({ transports: { datadog: { enabled: true } } });
 * // This will update the existing config, not create a new one
 *
 * // In any file (lightweight, no config overhead):
 * import {getLogger} from '@wireapp/logger';
 * const logger = getLogger('MyComponent');
 * logger.production.info('Hello!');
 */
export declare function getLogger(name: string): Logger;
/**
 * Clear all registered loggers
 */
export declare function clearLoggers(): void;
/**
 * Get all registered logger names
 */
export declare function getLoggerNames(): string[];
//# sourceMappingURL=LoggerWithGlobalConfig.d.ts.map
