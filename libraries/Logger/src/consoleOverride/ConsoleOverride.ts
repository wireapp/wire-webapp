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
 * Original console methods (stored for restoration)
 */
/* eslint-disable no-console */
const originalConsole = {
  log: console.log,
  info: console.info,
  debug: console.debug,
  warn: console.warn,
  error: console.error,
  trace: console.trace,
};
/* eslint-enable no-console */

/**
 * Check if console override is already active
 */
let isOverrideActive = false;

/**
 * Install production console override
 * - Silences console.log, console.info, console.debug
 * - Preserves console.warn and console.error for critical issues
 * - Tracks console.error in Datadog RUM if available
 */
export function installConsoleOverride(): void {
  if (isOverrideActive) {
    console.warn('[ConsoleOverride] Already installed, skipping');
    return;
  }

  // Only override in production environments
  // Note: This function should generally not be called directly
  // The logger initialization handles console configuration based on the RuntimeEnvironment

  console.warn('[ConsoleOverride] Manual console override - ensure this is intentional');
  // In browser environment, we skip the check as we don't have access to process.env
  // The caller should only invoke this in production contexts

  /* eslint-disable no-console, @typescript-eslint/no-unused-vars */
  // Silence development console methods
  console.log = function silencedLog(..._args: any[]) {
    // No-op: prevents data leaks via console.log
  };

  console.info = function silencedInfo(..._args: any[]) {
    // No-op: prevents data leaks via console.info
  };

  console.debug = function silencedDebug(..._args: any[]) {
    // No-op: prevents data leaks via console.debug
  };

  console.trace = function silencedTrace(..._args: any[]) {
    // No-op: prevents data leaks via console.trace
  };
  /* eslint-enable no-console, @typescript-eslint/no-unused-vars */

  // Preserve console.warn (still useful in production)
  console.warn = function interceptedWarn(...args: any[]) {
    originalConsole.warn(...args);
  };

  // Preserve console.error and send to Datadog RUM
  console.error = function interceptedError(...args: any[]) {
    // Always write to original console.error
    originalConsole.error(...args);

    // Send to Datadog RUM if available
    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      try {
        const errorMessage = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');

        (window as any).DD_RUM.addError(new Error(errorMessage), {
          source: 'console',
          type: 'console.error',
        });
      } catch (rumError) {
        // Silently fail if RUM tracking fails
        originalConsole.warn('[ConsoleOverride] Failed to track error in Datadog RUM:', rumError);
      }
    }
  };

  isOverrideActive = true;
  console.warn('[ConsoleOverride] Production console override installed');
  console.warn('[ConsoleOverride] console.log/info/debug are now silenced');
  console.warn('[ConsoleOverride] Use logger.production.* for production logs');
}

/**
 * Restore original console methods
 * Useful for testing or debugging
 */
export function restoreConsole(): void {
  if (!isOverrideActive) {
    console.warn('[ConsoleOverride] Not active, nothing to restore');
    return;
  }

  /* eslint-disable no-console */
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.trace = originalConsole.trace;
  /* eslint-enable no-console */

  isOverrideActive = false;
  /* eslint-disable-next-line no-console */
  console.log('[ConsoleOverride] Original console methods restored');
}

/**
 * Check if console override is currently active
 */
export function isConsoleOverrideActive(): boolean {
  return isOverrideActive;
}

/**
 * Get information about the console override status
 */
export function getConsoleOverrideInfo(): {
  active: boolean;
  environment: string;
  silencedMethods: string[];
  preservedMethods: string[];
} {
  return {
    active: isOverrideActive,
    environment: 'unknown', // Environment info should come from GlobalConfig
    silencedMethods: ['log', 'info', 'debug', 'trace'],
    preservedMethods: ['warn', 'error'],
  };
}
