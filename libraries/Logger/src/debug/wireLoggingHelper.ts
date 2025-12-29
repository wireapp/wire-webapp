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

import {getGlobalLogBuffer} from '../memoryBuffer/InMemoryLogBuffer';

/**
 * Wire logging helper namespace for browser debugging
 */
export interface WireLoggingHelper {
  /**
   * Export all logs as JSON
   */
  exportLogs(): string;

  /**
   * Copy logs to clipboard
   */
  copyLogsToClipboard(): Promise<void>;

  /**
   * Get Datadog session info for correlation
   */
  getDatadogInfo(): {
    sessionId: string | null;
    rumEnabled: boolean;
    logCount: number;
  };

  /**
   * Clear the log buffer
   */
  clearLogs(): void;

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalLogs: number;
    bufferSize: number;
    oldestLog: string | null;
    newestLog: string | null;
  };
}

/**
 * Implementation of Wire logging helpers
 */
class WireLoggingHelperImpl implements WireLoggingHelper {
  exportLogs(): string {
    const buffer = getGlobalLogBuffer();
    return buffer.export();
  }

  async copyLogsToClipboard(): Promise<void> {
    const logs = this.exportLogs();

    /* eslint-disable no-console */
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(logs);
        console.log('✅ Logs copied to clipboard! Paste them in your support ticket.');
      } catch (error) {
        console.error('❌ Failed to copy logs to clipboard:', error);
        console.log('📋 Copy the logs manually from the output below:');
        console.log(logs);
      }
    } else {
      console.log('📋 Clipboard API not available. Copy the logs manually:');
      console.log(logs);
    }
    /* eslint-enable no-console */
  }

  getDatadogInfo(): {
    sessionId: string | null;
    rumEnabled: boolean;
    logCount: number;
  } {
    const buffer = getGlobalLogBuffer();
    return {
      sessionId: buffer.getDatadogSessionId(),
      rumEnabled: buffer.getDatadogRumEnabled(),
      logCount: buffer.size(),
    };
  }

  clearLogs(): void {
    const buffer = getGlobalLogBuffer();
    const count = buffer.size();
    buffer.clear();
    /* eslint-disable-next-line no-console */
    console.log(`🗑️  Cleared ${count} logs from buffer`);
  }

  getLogStats(): {
    totalLogs: number;
    bufferSize: number;
    oldestLog: string | null;
    newestLog: string | null;
  } {
    const buffer = getGlobalLogBuffer();
    const logs = buffer.getAll();

    return {
      totalLogs: logs.length,
      bufferSize: buffer.getMaxSize(),
      oldestLog: logs.length > 0 ? logs[0].metadata.timestamp : null,
      newestLog: logs.length > 0 ? logs[logs.length - 1].metadata.timestamp : null,
    };
  }
}

/**
 * Install Wire logging helpers on window object
 */
export function installWireLoggingHelper(): void {
  if (typeof window !== 'undefined') {
    (window as any).wireLogging = new WireLoggingHelperImpl();

    /* eslint-disable-next-line no-console */
    console.log(`
🔧 Wire Logging Helpers Available:
  • wireLogging.exportLogs() - Export all logs as JSON
  • wireLogging.copyLogsToClipboard() - Copy logs to clipboard
  • wireLogging.getDatadogInfo() - Get Datadog session info
  • wireLogging.clearLogs() - Clear log buffer
  • wireLogging.getLogStats() - Get log statistics
    `);
  }
}

/**
 * Uninstall Wire logging helpers (for testing)
 */
export function uninstallWireLoggingHelper(): void {
  if (typeof window !== 'undefined') {
    delete (window as any).wireLogging;
  }
}
