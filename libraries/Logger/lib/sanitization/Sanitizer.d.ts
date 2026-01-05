import {LogEntry, SafetyLevel, SanitizationRule} from '../types';
/**
 * Sanitizer class - applies all sanitization rules automatically
 */
export declare class Sanitizer {
  private rules;
  constructor(customRules?: SanitizationRule[]);
  /**
   * Automatically sanitizes a log entry based on safety level
   * Developers don't need to call this manually - it happens automatically
   */
  sanitize(entry: LogEntry, safetyLevel: SafetyLevel): LogEntry;
  /**
   * Apply replacement pattern to a string
   */
  private applyReplacement;
  /**
   * Recursively sanitize an object
   */
  private sanitizeObject;
  /**
   * Get all sanitization rules (for testing)
   */
  getRules(): SanitizationRule[];
  /**
   * Get default sanitization rules (static)
   */
  static getDefaultRules(): SanitizationRule[];
}
//# sourceMappingURL=Sanitizer.d.ts.map
