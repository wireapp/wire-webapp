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

import {
  initializeLogger,
  isLoggerInitialized,
  updateLoggerConfig,
  LogLevel,
  getLogger as getWireLogger,
  enableDebugLogging,
  Logger,
} from '@wireapp/logger';

import {Config, Configuration} from '../Config';

const LOGGER_NAMESPACE = '@wireapp/webapp';

/**
 * Enable debug logging via URL parameters or feature flags
 * Controls which loggers output to console via the 'debug' localStorage key
 *
 * @param config - Wire configuration
 * @param search - URL search string (defaults to window.location.search)
 *
 * @example
 * Enable via URL: ?enableLogging=*
 * enableLogging(config);
 *
 * @example
 * Force enable via feature flag
 * enableLogging({ FEATURE: { ENABLE_DEBUG: true } });
 */
export function enableLogging(config: Configuration, search = window.location.search): void {
  enableDebugLogging({
    urlParams: search,
    force: config.FEATURE.ENABLE_DEBUG,
  });
}

let isAppLoggerInitialized = false;

/**
 * Get a logger instance with the Wire webapp namespace
 *
 * **IMPORTANT**: Call `initializeWireLogger()` before using loggers in production.
 * If not initialized, the logger will auto-initialize with development defaults.
 *
 * @param name - Component or module name
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * // At app startup (REQUIRED in production):
 * await initializeWireLogger(config, user);
 *
 * // Then anywhere in your code:
 * const logger = getLogger('MyComponent');
 * logger.production.info('User logged in', { userId: user.id });
 * logger.development.debug('Full state', { state });
 * ```
 */
export function getLogger(name: string) {
  // Warn if logger hasn't been initialized in production
  if (!isLoggerInitialized() && typeof window !== 'undefined') {
    const config = Config.getConfig();
    if (config.ENVIRONMENT === 'production') {
      console.warn(
        '[Logger] Logger not initialized! Call initializeWireLogger() at app startup. ' +
          'Auto-initializing with development defaults.',
      );
    }
  }

  return getWireLogger(`${LOGGER_NAMESPACE}/${name}`);
}

/**
 * Initialize the @wireapp/logger library with Wire webapp configuration
 * This replaces the old DataDog initialization
 *
 * @param config - Wire configuration
 * @param user - Optional user info for DataDog tracking
 */
export async function initializeWireLogger(config: Configuration, user?: {id?: string; domain: string}) {
  if (isAppLoggerInitialized) {
    return;
  }

  isAppLoggerInitialized = true;

  const isDevelopment = config.ENVIRONMENT !== 'production';
  const hasDataDog = !!(config.dataDog?.applicationId && config.dataDog?.clientToken);

  // Check if logger was already initialized (e.g., from Electron main process)
  if (!isLoggerInitialized()) {
    initializeLogger(
      {
        platform: 'browser',
        deployment: isDevelopment ? 'development' : 'production',
      },
      {
        transports: {
          console: {
            enabled: true,
            level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
          },
          datadog: hasDataDog
            ? {
                enabled: true,
                level: LogLevel.INFO,
                clientToken: config.dataDog!.clientToken!,
                applicationId: config.dataDog!.applicationId!,
                site: 'datadoghq.eu',
                service: 'web-internal',
                forwardConsoleLogs: false,
                env: config.FEATURE?.DATADOG_ENVIRONMENT || config.ENVIRONMENT,
                version: config.VERSION,
              }
            : undefined,
        },
      },
    );
  } else if (hasDataDog) {
    // If already initialized (from Electron), just add DataDog transport
    updateLoggerConfig({
      transports: {
        datadog: {
          enabled: true,
          level: LogLevel.INFO,
          clientToken: config.dataDog!.clientToken!,
          applicationId: config.dataDog!.applicationId!,
          site: 'datadoghq.eu',
          service: 'web-internal',
          forwardConsoleLogs: false,
          env: config.FEATURE?.DATADOG_ENVIRONMENT || config.ENVIRONMENT,
          version: config.VERSION,
        },
      },
    });
  }

  // Set user if provided (DataDog is initialized by the transport)
  if (user?.id && hasDataDog) {
    setLoggerUser(user.id);
  }
}

/**
 * Update the user ID for DataDog tracking
 * Call this after user authentication
 */
export function setLoggerUser(userId: string) {
  // Import dynamically to avoid issues if library is not rebuilt yet
  import('@wireapp/logger')
    .then(({setDatadogUser}) => {
      setDatadogUser(userId);
    })
    .catch(() => {
      // Silently fail if not available
    });
}

/**
 * Check if DataDog is enabled
 * Used by UI components to show DataDog disclaimer
 */
export function isDataDogEnabled(): boolean {
  // Import dynamically to avoid issues if library is not rebuilt yet
  try {
    const {isDatadogEnabled} = require('@wireapp/logger');
    return isDatadogEnabled();
  } catch {
    return false;
  }
}

export {LOGGER_NAMESPACE, LogLevel, Logger};
