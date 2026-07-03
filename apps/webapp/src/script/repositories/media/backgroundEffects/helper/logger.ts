/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 * Note: Our current logger factory is unfortunately not worker-safe. Or, to put it another way, the Logger object is not
 * transferable to workers. Therefore, I've temporarily built a separate logger factory which we can easily replace once
 * we've solved the problem.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';

type Logger = Record<LogLevel, (...args: unknown[]) => void>;

export function getSafeLogger(scope = 'worker'): Logger {
  const prefix = `[${scope}]`;

  const safeConsole =
    typeof globalThis !== 'undefined' && globalThis.console !== null && globalThis.console !== undefined
      ? globalThis.console
      : undefined;

  const noop = () => {};

  return {
    log: safeConsole?.log?.bind(safeConsole, prefix) ?? noop,
    debug: safeConsole?.debug?.bind(safeConsole, prefix) ?? noop,
    info: safeConsole?.info?.bind(safeConsole, prefix) ?? noop,
    warn: safeConsole?.warn?.bind(safeConsole, prefix) ?? noop,
    error: safeConsole?.error?.bind(safeConsole, prefix) ?? noop,
  };
}
