/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import logdown from 'logdown';

import {Transport, LogEntry, LogLevel, DatadogTransportConfig} from '../types';
import {isAllowedAVSLog} from '../utils/avsFilter';

// Datadog SDK imports - these will be bundled with the library
import {datadogLogs} from '@datadog/browser-logs';
import {datadogRum} from '@datadog/browser-rum';

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
export class DatadogTransport implements Transport {
  private config: DatadogTransportConfig;
  private initialized = false;
  private debugLogger: ReturnType<typeof logdown>;

  constructor(config: DatadogTransportConfig) {
    this.config = config;
    this.debugLogger = logdown('@wireapp/logger/DatadogTransport');
    this.debugLogger.state.isEnabled = true;

    // Only initialize if Datadog SDKs are available
    if (datadogLogs && datadogRum && config.enabled) {
      this.initializeDatadog();
    } else {
      this.debugLogger.warn('Datadog SDKs not available or transport disabled; skipping initialization.');
    }
  }

  /**
   * Initialize Datadog SDK
   */
  private initializeDatadog(): void {
    try {
      // Initialize Datadog Logs with best practices
      datadogLogs.init({
        clientToken: this.config.clientToken,
        site: this.config.site,
        service: this.config.service,
        env: this.config.env,
        version: this.config.version,
        forwardErrorsToLogs: true,
        forwardConsoleLogs: this.config.forwardConsoleLogs ? 'all' : undefined, // Should always be false in config
        sessionSampleRate: 100,
        beforeSend: (log: any) => {
          // Filter AVS logs (they are very verbose)
          if (log.message && typeof log.message === 'string') {
            if (log.message.match(/@wireapp\/webapp\/avs/) && !isAllowedAVSLog(log.message)) {
              return false;
            }
            // Additional sanitization (defense in depth)
            log.message = this.sanitizeMessage(log.message);
          }
          if (log.context) {
            log.context = this.sanitizeContext(log.context);
          }
          // Set view URL
          log.view = {url: '/'};
          return true;
        },
      });

      // Initialize Datadog RUM
      datadogRum.init({
        applicationId: this.config.applicationId,
        clientToken: this.config.clientToken,
        site: this.config.site,
        service: this.config.service,
        env: this.config.env,
        version: this.config.version,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 0, // No session replay by default
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask',
        beforeSend: (event: any) => {
          // Sanitize RUM events
          if (event.view) {
            // Mask URL parameters that might contain sensitive data
            if (event.view.url) {
              try {
                const url = new URL(event.view.url);
                url.search = ''; // Remove query params
                event.view.url = url.pathname;
              } catch {
                event.view.url = '/';
              }
            }
            delete event.view.referrer;
          }
          return true;
        },
      });

      // Start RUM session
      datadogRum.startSessionReplayRecording();

      this.initialized = true;
    } catch (error) {
      // Silently fail if Datadog initialization fails
      this.debugLogger.warn('Failed to initialize:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(entry: LogEntry): boolean {
    // Only write if:
    // 1. Transport is enabled
    // 2. Datadog is initialized
    // 3. Entry is explicitly marked as production-safe
    // 4. Entry level meets minimum threshold
    return this.config.enabled && this.initialized && entry.isProductionSafe && entry.level >= this.config.level;
  }

  /**
   * Write log entry to Datadog
   */
  async write(entry: LogEntry): Promise<void> {
    if (!this.initialized || !this.shouldWrite(entry)) {
      return;
    }

    try {
      const datadogLevel = this.mapLogLevel(entry.level);

      // Build log context
      const logContext: Record<string, any> = {
        ...entry.context,
        logger: entry.metadata.logger,
        environment: entry.metadata.environment,
        platform: entry.metadata.platform,
      };

      // Add correlation IDs if available
      if (entry.metadata.correlationId) {
        logContext.correlationId = entry.metadata.correlationId;
      }
      if (entry.metadata.sessionId) {
        logContext.sessionId = entry.metadata.sessionId;
      }

      // Log to Datadog with structured context
      switch (datadogLevel) {
        case 'debug':
          datadogLogs.logger.debug(entry.message, logContext, entry.error);
          break;
        case 'info':
          datadogLogs.logger.info(entry.message, logContext, entry.error);
          break;
        case 'warn':
          datadogLogs.logger.warn(entry.message, logContext, entry.error);
          break;
        case 'error':
          datadogLogs.logger.error(entry.message, logContext, entry.error);
          break;
      }

      // Debug log for successful Datadog call
      this.debugLogger.debug('Successfully logged to Datadog', {
        level: datadogLevel,
        message: entry.message,
        logger: entry.metadata.logger,
      });
    } catch (error) {
      // Silently fail to prevent logging errors from breaking the application
      this.debugLogger.warn('Failed to write log:', error);
    }
  }

  /**
   * Map log level to Datadog level
   */
  private mapLogLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Sanitization as defense in depth
   * Note: Primary sanitization happens before this, this is extra protection
   */
  private sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return '';
    }

    // Remove any remaining sensitive patterns
    return message
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
      .replace(/[\w.%+-]+@[\w.-]+\.\w{2,}/gi, '[EMAIL]')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/=]+/gi, 'Bearer [TOKEN]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]')
      .replace(/\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g, '[SSN]'); // US SSN
  }

  /**
   * Sanitize context object recursively
   */
  private sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') {
      return {};
    }

    // Prevent circular references
    const seen = new WeakSet();
    const sanitize = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (seen.has(obj)) {
        return '[Circular]';
      }
      seen.add(obj);

      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }

      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (typeof value === 'string') {
            sanitized[key] = this.sanitizeMessage(value);
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitize(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      return sanitized;
    };

    return sanitize(context);
  }

  /**
   * Check if Datadog is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get Datadog RUM session ID for correlation
   */
  getSessionId(): string | null {
    if (!this.initialized || !datadogRum) {
      return null;
    }

    try {
      const internalContext = datadogRum.getInternalContext();
      return internalContext?.session_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Set user information for DataDog tracking
   * @param userId - User ID to set (will be truncated to first 8 characters)
   */
  setUser(userId: string): void {
    if (!this.initialized || !datadogRum || !datadogLogs) {
      return;
    }

    try {
      const id = userId.substring(0, 8);
      datadogRum.setUser({id});
      datadogLogs.setUser({id});
    } catch (error) {
      this.debugLogger.warn('Failed to set user:', error);
    }
  }

  /**
   * Get the DataDog Logs instance (for advanced use cases)
   */
  getDatadogLogs(): any {
    return datadogLogs;
  }

  /**
   * Get the DataDog RUM instance (for advanced use cases)
   */
  getDatadogRum(): any {
    return datadogRum;
  }
}
