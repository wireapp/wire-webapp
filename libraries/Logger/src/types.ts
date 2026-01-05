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

/**
 * Runtime environment information
 */
export interface RuntimeEnvironment {
  /** Runtime platform: browser, node, electron */
  platform: 'browser' | 'node' | 'electron';
  /** Deployment environment: development, test, edge, staging, production */
  deployment: 'development' | 'test' | 'edge' | 'staging' | 'production';
}

/**
 * Log levels in order of severity
 */
/* eslint-disable no-magic-numbers */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}
/* eslint-enable no-magic-numbers */

/**
 * Safety levels for sanitization
 */
export enum SafetyLevel {
  // Safe for production - no user data
  SAFE = 'safe',

  // Needs sanitization - IDs truncated, strings masked
  SANITIZED = 'sanitized',

  // Development only - full data with warnings
  DEV_ONLY = 'dev_only',
}

/**
 * Log context - additional structured data for log entry
 * Only whitelisted keys are allowed in production logs
 */
export interface LogContext {
  // Safe context keys (whitelisted for production)
  conversationId?: string;
  clientId?: string;
  userId?: string;
  timestamp?: string;
  duration?: number;
  errorCode?: string;
  status?: number;
  protocol?: string;
  category?: string;
  level?: string;
  count?: number;
  size?: number;
  length?: number;
  correlationId?: string;
  sessionId?: string;

  // Custom context (automatically sanitized)
  [key: string]: any;
}

/**
 * Log metadata - system-generated information
 */
export interface LogMetadata {
  timestamp: string;
  correlationId?: string;
  sessionId?: string;
  environment: string;
  platform: string;
  logger: string;
}

/**
 * A complete log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  metadata: LogMetadata;
  isProductionSafe: boolean;
}

/**
 * Sanitization rule definition
 */
export interface SanitizationRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  appliesTo: SafetyLevel[];
  appliesToKeys?: string[]; // Specific context keys to target
  metadata?: {
    source?: 'presidio' | 'custom' | 'default';
    recognizerName?: string;
    entityType?: string;
    confidence?: number;
    denyListSize?: number;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  environment: 'development' | 'test' | 'edge' | 'staging' | 'production';
  safetyLevel: SafetyLevel;
  logLevel: LogLevel;
  transports: TransportConfig;
  contextWhitelist: Set<string>;
  sanitizationRules?: SanitizationRule[];
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  console?: ConsoleTransportConfig;
  file?: FileTransportConfig;
  datadog?: DatadogTransportConfig;
}

/**
 * Console transport configuration
 */
export interface ConsoleTransportConfig {
  enabled: boolean;
  level: LogLevel;
}

/**
 * File transport configuration (Electron only)
 */
export interface FileTransportConfig {
  enabled: boolean;
  level: LogLevel;
  path: string;
  maxSize: number;
  maxFiles: number;
  format: 'json' | 'text';
  /** Runtime environment information (injected from outside) */
  runtimeEnvironment: RuntimeEnvironment;
  currentLogSize?: number;
  logLine?: string;
  rotatedFile?: string;
}

/**
 * Datadog transport configuration
 */
export interface DatadogTransportConfig {
  enabled: boolean;
  level: LogLevel;
  clientToken: string;
  applicationId: string;
  site: string;
  service: string;
  forwardConsoleLogs: boolean; // Default: false - NEVER forward console logs
  env?: string; // Environment name for DataDog
  version?: string; // Application version
}

/**
 * Transport interface
 */
export interface Transport {
  shouldWrite(entry: LogEntry): boolean;
  write(entry: LogEntry): Promise<void> | void;
}

/**
 * Sanitized log entry (after sanitization)
 */
export type SanitizedLogEntry = LogEntry;

/**
 * Production logging methods interface
 */
export interface ProductionLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}

/**
 * Development logging methods interface
 */
export interface DevelopmentLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  trace(message: string, context?: LogContext): void;
}
