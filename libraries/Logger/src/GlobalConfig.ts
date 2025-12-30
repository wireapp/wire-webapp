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

import {PRODUCTION_CONTEXT_WHITELIST} from './config/ContextWhitelist';
import {Sanitizer} from './sanitization/Sanitizer';
import {TransportManager} from './transports/TransportManager';
import {LogLevel, LoggerConfig, RuntimeEnvironment, SafetyLevel} from './types';

// Internal logger for config warnings (always enabled to catch initialization issues)
const logger = logdown('@wireapp/logger/GlobalConfig');
logger.state.isEnabled = true;

/**
 * Symbol key for storing logger instance on globalThis
 */
const LOGGER_GLOBAL_KEY = Symbol.for('@wireapp/logger:globalConfig');

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
class GlobalLoggerConfig {
  private config: LoggerConfig | null = null;
  private transportManager: TransportManager | null = null;
  private sanitizer: Sanitizer | null = null;
  private initialized = false;

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
  initialize(runtimeEnvironment: RuntimeEnvironment, config?: Partial<LoggerConfig>): void {
    if (this.initialized) {
      logger.warn('Already initialized. Use updateConfig() to change settings.');
      return;
    }

    this.config = this.createDefaultConfig(runtimeEnvironment, config);
    this.transportManager = new TransportManager(this.config.transports);
    this.sanitizer = new Sanitizer(this.config.sanitizationRules);
    this.initialized = true;
  }

  /**
   * Update configuration after initialization
   *
   * IMPORTANT: Transports are merged, not replaced. This allows:
   * - Browser to update console/datadog without affecting file transport (set by Electron)
   * - Electron to set file transport without affecting browser-configured transports
   */
  updateConfig(updates: Partial<LoggerConfig>): void {
    if (!this.initialized) {
      throw new Error('[GlobalLoggerConfig] Must call initialize() before updateConfig()');
    }

    // Deep merge transports instead of replacing them
    const mergedTransports = updates.transports
      ? {
          ...this.config!.transports,
          ...updates.transports,
        }
      : this.config!.transports;

    this.config = {
      ...this.config!,
      ...updates,
      transports: mergedTransports,
    };

    // Recreate transport manager and sanitizer if needed
    if (updates.transports) {
      this.transportManager = new TransportManager(this.config!.transports);
    }
    if (updates.sanitizationRules) {
      this.sanitizer = new Sanitizer(this.config!.sanitizationRules);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    if (!this.initialized) {
      // Auto-initialize with defaults if not explicitly initialized
      this.initialize({platform: this.detectPlatform(), deployment: 'development'});
    }
    return {...this.config!};
  }

  /**
   * Get transport manager
   */
  getTransportManager(): TransportManager {
    if (!this.initialized) {
      this.initialize({platform: this.detectPlatform(), deployment: 'development'});
    }
    return this.transportManager!;
  }

  /**
   * Get sanitizer
   */
  getSanitizer(): Sanitizer {
    if (!this.initialized) {
      this.initialize({platform: this.detectPlatform(), deployment: 'development'});
    }
    return this.sanitizer!;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset configuration (useful for tests)
   */
  reset(): void {
    this.config = null;
    this.transportManager = null;
    this.sanitizer = null;
    this.initialized = false;
  }

  /**
   * Detect runtime platform
   */
  private detectPlatform(): 'browser' | 'node' | 'electron' {
    if (typeof window !== 'undefined') {
      return 'browser';
    }
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return 'electron';
    }
    return 'node';
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(runtimeEnvironment: RuntimeEnvironment, overrides?: Partial<LoggerConfig>): LoggerConfig {
    const environment = runtimeEnvironment.deployment;
    const platform = runtimeEnvironment.platform;

    // Only production is treated differently - dev, test, edge, staging are all dev-like
    const isProduction = environment === 'production';
    const isElectron = platform === 'electron';

    return {
      environment,
      safetyLevel: isProduction ? SafetyLevel.SAFE : SafetyLevel.DEV_ONLY,
      logLevel: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
      contextWhitelist: PRODUCTION_CONTEXT_WHITELIST,
      transports: {
        console: {
          enabled: true,
          level: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
        },
        file: {
          // File logging enabled by default on Electron, disabled elsewhere
          enabled: isElectron,
          level: LogLevel.DEBUG,
          path: './logs/console.log',
          // eslint-disable-next-line no-magic-numbers
          maxSize: 10 * 1024 * 1024, // 10MB (10 * 1024 * 1024)
          maxFiles: 5,
          format: 'json',
          runtimeEnvironment,
        },
        datadog: {
          // Datadog disabled by default, must be enabled via config
          enabled: false,
          level: LogLevel.INFO,
          clientToken: '',
          applicationId: '',
          site: 'datadoghq.eu',
          service: 'wire-webapp',
          forwardConsoleLogs: false, // CRITICAL: NEVER forward console logs
        },
      },
      ...overrides,
    };
  }
}

/**
 * Get or create the global configuration singleton instance
 * This ensures we only have one instance across all contexts (Electron + Browser)
 */
function getGlobalConfigInstance(): GlobalLoggerConfig {
  // Check if instance already exists on globalThis
  const existingInstance = (globalThis as any)[LOGGER_GLOBAL_KEY] as GlobalLoggerConfig | undefined;

  if (existingInstance) {
    return existingInstance;
  }

  // Create new instance and store it on globalThis
  const newInstance = new GlobalLoggerConfig();
  (globalThis as any)[LOGGER_GLOBAL_KEY] = newInstance;
  return newInstance;
}

/**
 * Global configuration singleton instance
 */
export const globalConfig = getGlobalConfigInstance();

/**
 * Convenience function to initialize global config
 * Call this once at app startup (can be called from both Electron and Browser contexts)
 * If already initialized in another context (e.g., Electron), this will reuse that instance
 */
export function initializeLogger(runtimeEnvironment: RuntimeEnvironment, config?: Partial<LoggerConfig>): void {
  const instance = getGlobalConfigInstance();
  instance.initialize(runtimeEnvironment, config);
}

/**
 * Update global configuration
 */
export function updateLoggerConfig(updates: Partial<LoggerConfig>): void {
  const instance = getGlobalConfigInstance();
  instance.updateConfig(updates);
}

/**
 * Get current global configuration
 */
export function getLoggerConfig(): LoggerConfig {
  const instance = getGlobalConfigInstance();
  return instance.getConfig();
}

/**
 * Reset global configuration (for testing)
 */
export function resetLoggerConfig(): void {
  const instance = getGlobalConfigInstance();
  instance.reset();
}

/**
 * Check if logger has been initialized
 */
export function isLoggerInitialized(): boolean {
  const instance = getGlobalConfigInstance();
  return instance.isInitialized();
}

/**
 * Get the DataDog transport instance (if available)
 * Useful for accessing DataDog-specific features like setUser()
 */
export function getDatadogTransport(): any {
  const instance = getGlobalConfigInstance();
  const manager = instance['transportManager'];
  if (!manager) {
    return null;
  }
  // Access the datadog transport from the transports array
  const transports = (manager as any).transports;
  if (!transports || !Array.isArray(transports)) {
    return null;
  }
  return transports.find((t: any) => t.constructor.name === 'DatadogTransport') || null;
}

/**
 * Set user information for DataDog tracking
 * @param userId - User ID to set (will be truncated to first 8 characters)
 */
export function setDatadogUser(userId: string): void {
  const transport = getDatadogTransport();
  if (transport && typeof transport.setUser === 'function') {
    transport.setUser(userId);
  }
}

/**
 * Check if DataDog is enabled and initialized
 */
export function isDatadogEnabled(): boolean {
  const transport = getDatadogTransport();
  return !!(transport && typeof transport.isInitialized === 'function' && transport.isInitialized());
}
