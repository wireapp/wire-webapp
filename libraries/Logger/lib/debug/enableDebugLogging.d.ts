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
export declare function enableDebugLogging(options?: {
  namespace?: string;
  force?: boolean;
  urlParams?: string | URLSearchParams;
  storage?: Storage;
}): void;
/**
 * Disable debug logging
 * Removes the 'debug' key from localStorage
 *
 * @param storage - Storage implementation (defaults to localStorage)
 */
export declare function disableDebugLogging(storage?: Storage): void;
/**
 * Get current debug logging configuration
 *
 * @param storage - Storage implementation (defaults to localStorage)
 * @returns Current debug namespace or null if disabled
 */
export declare function getDebugLogging(storage?: Storage): string | null;
//# sourceMappingURL=enableDebugLogging.d.ts.map
