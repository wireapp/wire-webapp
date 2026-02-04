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

import {Transport, LogEntry, LogLevel, ConsoleTransportConfig} from '../types';

/**
 * Console transport implementation
 * Uses logdown for consistent, colored output across all log methods
 */
export class ConsoleTransport implements Transport {
  private config: ConsoleTransportConfig;
  private logdownInstances: Map<string, ReturnType<typeof logdown>>;

  constructor(config: ConsoleTransportConfig) {
    this.config = config;
    this.logdownInstances = new Map();
  }

  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(entry: LogEntry): boolean {
    return this.config.enabled && entry.level >= this.config.level;
  }

  /**
   * Get or create a logdown instance for the logger name
   */
  private getLogdownInstance(loggerName: string): ReturnType<typeof logdown> {
    const name = loggerName || 'unknown';
    if (!this.logdownInstances.has(name)) {
      const instance = logdown(name);
      instance.state.isEnabled = true;
      this.logdownInstances.set(name, instance);
    }
    return this.logdownInstances.get(name)!;
  }

  /**
   * Write the log entry to console using logdown for consistent formatting
   * Note: Category is omitted from console output as it's typically not useful for local debugging
   */
  write(entry: LogEntry): void {
    const logdownInstance = this.getLogdownInstance(entry.metadata.logger);
    const level = this.mapLogLevel(entry.level);
    const args: any[] = [entry.message];

    if (entry.context && Object.keys(entry.context).length > 0) {
      args.push(entry.context);
    }

    if (entry.error) {
      args.push(entry.error);
    }

    this.writeToLogdown(logdownInstance, level, args);
  }

  /**
   * Map log level to logdown method
   */
  private mapLogLevel(level: LogLevel): 'log' | 'info' | 'warn' | 'error' | 'debug' {
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
        return 'log';
    }
  }

  /**
   * Write to the appropriate logdown method
   */
  private writeToLogdown(
    instance: ReturnType<typeof logdown>,
    level: 'log' | 'info' | 'warn' | 'error' | 'debug',
    args: any[],
  ): void {
    switch (level) {
      case 'info':
        instance.info(...args);
        break;
      case 'warn':
        instance.warn(...args);
        break;
      case 'error':
        instance.error(...args);
        break;
      case 'debug':
        instance.debug(...args);
        break;
      default:
        instance.log(...args);
    }
  }
}
