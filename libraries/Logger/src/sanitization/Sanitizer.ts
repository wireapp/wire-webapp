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

import {DEFAULT_SANITIZATION_RULES} from '../config/ContextWhitelist';
import {LogEntry, SafetyLevel, SanitizationRule} from '../types';

/**
 * Sanitizer class - applies all sanitization rules automatically
 */
export class Sanitizer {
  private rules: SanitizationRule[];

  constructor(customRules?: SanitizationRule[]) {
    // Use custom rules if provided, otherwise use default rules from config
    this.rules = customRules ?? DEFAULT_SANITIZATION_RULES;
  }

  /**
   * Automatically sanitizes a log entry based on safety level
   * Developers don't need to call this manually - it happens automatically
   */
  sanitize(entry: LogEntry, safetyLevel: SafetyLevel): LogEntry {
    let sanitizedMessage = entry.message;
    const sanitizedContext = entry.context ? {...entry.context} : undefined;
    let sanitizedError = entry.error;

    for (const rule of this.rules) {
      if (!rule.appliesTo.includes(safetyLevel)) {
        continue;
      }

      // If rule has appliesToKeys, only apply to context values, not message
      if (!rule.appliesToKeys) {
        // Sanitize message
        sanitizedMessage = this.applyReplacement(sanitizedMessage, rule.pattern, rule.replacement);

        // Sanitize error stack if present
        if (sanitizedError?.stack) {
          sanitizedError = {
            ...sanitizedError,
            stack: this.applyReplacement(sanitizedError.stack, rule.pattern, rule.replacement),
          };
        }

        // Sanitize error message if present
        if (sanitizedError?.message) {
          sanitizedError = {
            ...sanitizedError,
            message: this.applyReplacement(sanitizedError.message, rule.pattern, rule.replacement),
          };
        }
      }

      // Sanitize context values
      if (sanitizedContext) {
        for (const key in sanitizedContext) {
          // Skip if rule targets specific keys and this key is not in the list
          if (rule.appliesToKeys && !rule.appliesToKeys.includes(key)) {
            continue;
          }

          const value = sanitizedContext[key];
          if (typeof value === 'string') {
            sanitizedContext[key] = this.applyReplacement(value, rule.pattern, rule.replacement);
          } else if (typeof value === 'object' && value !== null) {
            // Recursively sanitize nested objects
            sanitizedContext[key] = this.sanitizeObject(value, rule.pattern, rule.replacement, rule.appliesToKeys);
          }
        }
      }
    }

    return {
      ...entry,
      message: sanitizedMessage,
      context: sanitizedContext,
      error: sanitizedError,
    };
  }

  /**
   * Apply replacement pattern to a string
   */
  private applyReplacement(text: string, pattern: RegExp, replacement: string | ((match: string) => string)): string {
    if (typeof replacement === 'function') {
      return text.replace(pattern, replacement);
    }
    return text.replace(pattern, replacement);
  }

  /**
   * Recursively sanitize an object
   */
  private sanitizeObject(
    obj: any,
    pattern: RegExp,
    replacement: string | ((match: string) => string),
    appliesToKeys?: string[],
  ): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, pattern, replacement, appliesToKeys));
    }

    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Skip if rule targets specific keys
        if (appliesToKeys && !appliesToKeys.includes(key)) {
          result[key] = obj[key];
          continue;
        }

        const value = obj[key];
        if (typeof value === 'string') {
          result[key] = this.applyReplacement(value, pattern, replacement);
        } else if (typeof value === 'object' && value !== null) {
          result[key] = this.sanitizeObject(value, pattern, replacement, appliesToKeys);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }

  /**
   * Get all sanitization rules (for testing)
   */
  getRules(): SanitizationRule[] {
    return [...this.rules];
  }

  /**
   * Get default sanitization rules (static)
   */
  static getDefaultRules(): SanitizationRule[] {
    return [...DEFAULT_SANITIZATION_RULES];
  }
}
