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

// Main exports - Lightweight logger with global configuration
export {Logger, getLogger, clearLoggers, getLoggerNames} from './LoggerWithGlobalConfig';
export {
  initializeLogger,
  updateLoggerConfig,
  getLoggerConfig,
  resetLoggerConfig,
  isLoggerInitialized,
  getDatadogTransport,
  setDatadogUser,
  isDatadogEnabled,
} from './GlobalConfig';

// Types
export {LogLevel, SafetyLevel} from './types';

export type {
  LogContext,
  LogMetadata,
  LogEntry,
  SanitizationRule,
  LoggerConfig,
  TransportConfig,
  ConsoleTransportConfig,
  FileTransportConfig,
  DatadogTransportConfig,
  Transport,
  ProductionLogger,
  DevelopmentLogger,
} from './types';

// Sanitization
export {Sanitizer} from './sanitization/Sanitizer';

// Transports
export {ConsoleTransport} from './transports/ConsoleTransport';
export {FileTransport} from './transports/FileTransport';
export {DatadogTransport} from './transports/DatadogTransport';
export {TransportManager} from './transports/TransportManager';

// Memory Buffer
export {
  InMemoryLogBuffer,
  getGlobalLogBuffer,
  setGlobalLogBuffer,
  clearGlobalLogBuffer,
} from './memoryBuffer/InMemoryLogBuffer';

// Config
export {
  PRODUCTION_CONTEXT_WHITELIST,
  DEFAULT_SANITIZATION_RULES,
  WIRE_SPECIFIC_SANITIZATION_RULES,
  getDefaultSanitizationRules,
  isContextKeyWhitelisted,
  filterContextWhitelist,
} from './config/ContextWhitelist';

// Debug helpers
export {installWireLoggingHelper, uninstallWireLoggingHelper} from './debug/wireLoggingHelper';
export type {WireLoggingHelper} from './debug/wireLoggingHelper';
export {enableDebugLogging, disableDebugLogging, getDebugLogging} from './debug/enableDebugLogging';

// Console override for production safety
export {
  installConsoleOverride,
  restoreConsole,
  isConsoleOverrideActive,
  getConsoleOverrideInfo,
} from './consoleOverride/ConsoleOverride';

// Presidio pattern loader
export {
  PresidioLoader,
  getGlobalPresidioLoader,
  setGlobalPresidioLoader,
  loadPresidioRulesFromURL,
  loadPresidioRulesFromString,
} from './presidio/PresidioLoader';
export type {PresidioLoaderConfig} from './presidio/PresidioLoader';
export type {
  PresidioRecognizer,
  PresidioRegexRecognizer,
  PresidioDenyListRecognizer,
  PresidioRecognizerCollection,
} from './presidio/PresidioTypes';
export {convertPresidioRecognizers, filterByLanguage, filterByEntityTypes} from './presidio/PresidioConverter';

// Utilities
export {isAllowedAVSLog} from './utils/avsFilter';
