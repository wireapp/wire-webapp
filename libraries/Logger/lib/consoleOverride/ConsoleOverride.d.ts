/**
 * Install production console override
 * - Silences console.log, console.info, console.debug
 * - Preserves console.warn and console.error for critical issues
 * - Tracks console.error in Datadog RUM if available
 */
export declare function installConsoleOverride(): void;
/**
 * Restore original console methods
 * Useful for testing or debugging
 */
export declare function restoreConsole(): void;
/**
 * Check if console override is currently active
 */
export declare function isConsoleOverrideActive(): boolean;
/**
 * Get information about the console override status
 */
export declare function getConsoleOverrideInfo(): {
  active: boolean;
  environment: string;
  silencedMethods: string[];
  preservedMethods: string[];
};
//# sourceMappingURL=ConsoleOverride.d.ts.map
