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
 * Install Wire logging helpers on window object
 */
export declare function installWireLoggingHelper(): void;
/**
 * Uninstall Wire logging helpers (for testing)
 */
export declare function uninstallWireLoggingHelper(): void;
//# sourceMappingURL=wireLoggingHelper.d.ts.map
