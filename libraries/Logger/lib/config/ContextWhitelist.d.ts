import {SanitizationRule} from '../types';
/**
 * Production context whitelist - only these keys are allowed in production logs
 */
export declare const PRODUCTION_CONTEXT_WHITELIST: Set<string>;
/**
 * Check if a context key is whitelisted for production
 */
export declare function isContextKeyWhitelisted(key: string): boolean;
/**
 * Filter context to only include whitelisted keys
 */
export declare function filterContextWhitelist(context: Record<string, any>): Record<string, any>;
/**
 * Wire-specific sanitization rules (patterns NOT covered by Presidio)
 *
 * These rules complement Presidio patterns and should be used together.
 * Use `getDefaultSanitizationRules()` to get the full merged set.
 *
 * Users can extend or replace these rules.
 */
export declare const WIRE_SPECIFIC_SANITIZATION_RULES: SanitizationRule[];
/**
 * Get default sanitization rules (Wire-specific + Presidio)
 *
 * This function loads bundled Presidio patterns and merges them with
 * Wire-specific patterns to provide comprehensive PII protection.
 *
 * Pattern ordering is CRITICAL to avoid conflicts:
 * 1. Wire-specific high-priority patterns (UUID, Bearer tokens) - must be first
 * 2. Presidio patterns (credit cards, SSN, email, phone, IPs, IBAN, etc.)
 * 3. Wire-specific low-priority patterns (context keys, etc.)
 *
 * This ensures Wire's custom UUID masking and URL whitelisting take precedence
 * over Presidio's generic patterns.
 *
 * @returns Complete set of sanitization rules
 */
export declare function getDefaultSanitizationRules(): SanitizationRule[];
/**
 * Legacy export for backwards compatibility
 * @deprecated Use getDefaultSanitizationRules() or WIRE_SPECIFIC_SANITIZATION_RULES instead
 */
export declare const DEFAULT_SANITIZATION_RULES: SanitizationRule[];
//# sourceMappingURL=ContextWhitelist.d.ts.map
