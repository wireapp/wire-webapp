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
import type {Logger as LogdownLogger} from 'logdown';

import {globalConfig} from './GlobalConfig';
import {getGlobalLogBuffer} from './memoryBuffer/InMemoryLogBuffer';
import {LogLevel, LogContext, LogEntry, ProductionLogger, DevelopmentLogger, SafetyLevel} from './types';

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
export class Logger {
  private name: string;
  private logdownInstance: LogdownLogger;
  private logBuffer = getGlobalLogBuffer();

  // Explicit production logging methods - ONLY these go to Datadog
  production: ProductionLogger;

  // Development-only logging methods - NEVER go to Datadog
  development: DevelopmentLogger;

  constructor(name: string) {
    this.name = name;

    // Create the logdown instance with the name
    this.logdownInstance = logdown(name);

    // Enable logdown based on environment from global config
    const config = globalConfig.getConfig();
    if (config.environment === 'development') {
      this.logdownInstance.state.isEnabled = true;
    }

    // Bind production logging methods
    this.production = {
      info: (message: string, context?: LogContext) => this.logInternal(LogLevel.INFO, message, true, context),
      warn: (message: string, context?: LogContext) => this.logInternal(LogLevel.WARN, message, true, context),
      error: (message: string, error?: Error, context?: LogContext) =>
        this.logInternal(LogLevel.ERROR, message, true, context, error),
    };

    // Bind development logging methods
    this.development = {
      info: (message: string, context?: LogContext) => this.logInternal(LogLevel.INFO, message, false, context),
      warn: (message: string, context?: LogContext) => this.logInternal(LogLevel.WARN, message, false, context),
      error: (message: string, error?: Error, context?: LogContext) =>
        this.logInternal(LogLevel.ERROR, message, false, context, error),
      debug: (message: string, context?: LogContext) => this.logInternal(LogLevel.DEBUG, message, false, context),
      trace: (message: string, context?: LogContext) => this.logInternal(LogLevel.TRACE, message, false, context),
    };
  }

  /**
   * Backward-compatible simple logging methods
   * These route to logdown directly for development (preserves colors and formatting)
   * Use logger.production.* for production-safe logs
   */

  log(...args: any[]): void {
    this.logdownInstance.log(...args);
  }

  info(...args: any[]): void {
    this.logdownInstance.info(...args);
  }

  warn(...args: any[]): void {
    this.logdownInstance.warn(...args);
  }

  error(...args: any[]): void {
    this.logdownInstance.error(...args);
  }

  debug(...args: any[]): void {
    this.logdownInstance.debug(...args);
  }

  /**
   * Internal log method - handles all logging logic with sanitization
   */
  private logInternal(
    level: LogLevel,
    message: string,
    isProductionSafe: boolean,
    context?: LogContext,
    error?: Error,
  ): void {
    const config = globalConfig.getConfig();

    // Check if log level meets threshold
    if (level < config.logLevel) {
      return;
    }

    // Filter context for production logs
    let filteredContext = context;
    if (isProductionSafe) {
      filteredContext = this.filterContextWhitelist(context);
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      context: filteredContext,
      error,
      metadata: this.createMetadata(),
      isProductionSafe,
    };

    // Sanitize based on safety level
    const safetyLevel = isProductionSafe ? config.safetyLevel : SafetyLevel.DEV_ONLY;
    const sanitizedEntry = globalConfig.getSanitizer().sanitize(entry, safetyLevel);

    // Add to in-memory buffer
    this.logBuffer.add(sanitizedEntry);

    // Write to transports (this handles Datadog, etc.)
    void globalConfig.getTransportManager().write(sanitizedEntry);
  }

  /**
   * Filter context to only include whitelisted keys for production
   */
  private filterContextWhitelist(context?: LogContext): LogContext | undefined {
    if (!context) {
      return undefined;
    }

    const config = globalConfig.getConfig();
    const filtered: LogContext = {};
    for (const key of Object.keys(context)) {
      if (config.contextWhitelist.has(key)) {
        filtered[key] = context[key];
      }
    }
    return filtered;
  }

  /**
   * Create metadata for log entry
   */
  private createMetadata() {
    const config = globalConfig.getConfig();
    return {
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
      sessionId: this.logBuffer.getDatadogSessionId() ?? undefined,
      environment: config.environment,
      platform: this.detectPlatform(),
      logger: this.name,
    };
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    const RADIX_36 = 36;
    const RANDOM_START = 2;
    const RANDOM_END = 9;
    return `corr_${Date.now()}_${Math.random().toString(RADIX_36).substring(RANDOM_START, RANDOM_END)}`;
  }

  /**
   * Detect platform
   */
  private detectPlatform(): string {
    if (typeof window !== 'undefined') {
      return 'browser';
    }
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return 'electron';
    }
    return 'node';
  }

  /**
   * Get logger name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the underlying logdown instance (for advanced usage)
   */
  getLogdownInstance(): LogdownLogger {
    return this.logdownInstance;
  }
}

/**
 * Symbol key for storing logger registry on globalThis
 */
const LOGGER_REGISTRY_KEY = Symbol.for('@wireapp/logger:registry');

/**
 * Get or create the global logger registry
 * This ensures we share the same loggers across all contexts (Electron + Browser)
 */
function getLoggerRegistry(): Map<string, Logger> {
  // Check if registry already exists on globalThis
  const existingRegistry = (globalThis as any)[LOGGER_REGISTRY_KEY] as Map<string, Logger> | undefined;

  if (existingRegistry) {
    return existingRegistry;
  }

  // Create new registry and store it on globalThis
  const newRegistry = new Map<string, Logger>();
  (globalThis as any)[LOGGER_REGISTRY_KEY] = newRegistry;
  return newRegistry;
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
export function getLogger(name: string): Logger {
  const loggerRegistry = getLoggerRegistry();

  if (!loggerRegistry.has(name)) {
    const logger = new Logger(name);
    loggerRegistry.set(name, logger);
  }
  return loggerRegistry.get(name)!;
}

/**
 * Clear all registered loggers
 */
export function clearLoggers(): void {
  const loggerRegistry = getLoggerRegistry();
  loggerRegistry.clear();
}

/**
 * Get all registered logger names
 */
export function getLoggerNames(): string[] {
  const loggerRegistry = getLoggerRegistry();
  return Array.from(loggerRegistry.keys());
}
