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
export declare enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}
/**
 * Safety levels for sanitization
 */
export declare enum SafetyLevel {
  SAFE = 'safe',
  SANITIZED = 'sanitized',
  DEV_ONLY = 'dev_only',
}
/**
 * Log context - additional structured data for log entry
 * Only whitelisted keys are allowed in production logs
 */
export interface LogContext {
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
  appliesToKeys?: string[];
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
  forwardConsoleLogs: boolean;
  env?: string;
  version?: string;
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
//# sourceMappingURL=types.d.ts.map
