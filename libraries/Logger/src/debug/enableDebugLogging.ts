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
 * Enable or disable debug logging via localStorage
 *
 * This controls which loggers output to the console by setting the 'debug'
 * localStorage key that logdown uses. Supports wildcard patterns.
 *
 * @param options - Configuration options
 * @param options.namespace - Logger namespace pattern (e.g., '*', '@wireapp/webapp/*', '@wireapp/webapp/calling')
 * @param options.force - Force enable all logs regardless of URL parameters
 * @param options.urlParams - URLSearchParams to read 'enableLogging' parameter from (defaults to window.location.search)
 * @param options.storage - Storage implementation (defaults to localStorage)
 *
 * @example
 * // Enable all logs via URL: ?enableLogging=*
 * enableDebugLogging({ urlParams: window.location.search });
 *
 * @example
 * // Enable specific namespace
 * enableDebugLogging({ namespace: '@wireapp/webapp/calling' });
 *
 * @example
 * // Force enable all logs (useful for feature flags)
 * enableDebugLogging({ force: true });
 *
 * @example
 * // Disable all debug logging
 * disableDebugLogging();
 */
export function enableDebugLogging(options?: {
  namespace?: string;
  force?: boolean;
  urlParams?: string | URLSearchParams;
  storage?: Storage;
}): void {
  const storage = options?.storage ?? getDefaultStorage();
  if (!storage) {
    return;
  }

  let namespace: string | null = null;

  // Priority 1: Explicit namespace parameter
  if (options?.namespace) {
    namespace = options.namespace;
  }
  // Priority 2: URL parameter
  else if (options?.urlParams) {
    const params = typeof options.urlParams === 'string' ? new URLSearchParams(options.urlParams) : options.urlParams;
    namespace = params.get('enableLogging');
  }
  // Priority 3: Force flag (enable all)
  else if (options?.force) {
    namespace = '*';
  }

  if (namespace) {
    storage.setItem('debug', namespace);
  } else {
    storage.removeItem('debug');
  }
}

/**
 * Disable debug logging
 * Removes the 'debug' key from localStorage
 *
 * @param storage - Storage implementation (defaults to localStorage)
 */
export function disableDebugLogging(storage?: Storage): void {
  const storageImpl = storage ?? getDefaultStorage();
  if (storageImpl) {
    storageImpl.removeItem('debug');
  }
}

/**
 * Get current debug logging configuration
 *
 * @param storage - Storage implementation (defaults to localStorage)
 * @returns Current debug namespace or null if disabled
 */
export function getDebugLogging(storage?: Storage): string | null {
  const storageImpl = storage ?? getDefaultStorage();
  if (!storageImpl) {
    return null;
  }
  return storageImpl.getItem('debug');
}

/**
 * Get default storage (localStorage in browser, null in Node.js)
 */
function getDefaultStorage(): Storage | null {
  try {
    // Browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage access denied (privacy mode, etc.)
  }
  return null;
}
