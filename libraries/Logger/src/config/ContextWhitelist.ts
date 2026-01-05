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

import presidioRecognizersJson from '../presidio/presidio-recognizers.json';
import {PresidioLoader} from '../presidio/PresidioLoader';
import {SafetyLevel, SanitizationRule} from '../types';

// Internal logger for library warnings (always enabled to catch initialization issues)
const logger = logdown('@wireapp/logger/ContextWhitelist');
logger.state.isEnabled = true;

/**
 * Production context whitelist - only these keys are allowed in production logs
 */
export const PRODUCTION_CONTEXT_WHITELIST = new Set<string>([
  // Identifiers (automatically truncated)
  'conversationId',
  'clientId',
  'userId',

  // Metadata
  'timestamp',
  'duration',
  'errorCode',
  'status',
  'protocol',
  'category',
  'level',

  // Counters
  'count',
  'size',
  'length',

  // Datadog-specific
  'correlationId',
  'sessionId',
]);

/**
 * Check if a context key is whitelisted for production
 */
export function isContextKeyWhitelisted(key: string): boolean {
  return PRODUCTION_CONTEXT_WHITELIST.has(key);
}

/**
 * Filter context to only include whitelisted keys
 */
export function filterContextWhitelist(context: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};
  for (const key of Object.keys(context)) {
    if (isContextKeyWhitelisted(key)) {
      filtered[key] = context[key];
    }
  }
  return filtered;
}

/**
 * Wire-specific sanitization rules (patterns NOT covered by Presidio)
 *
 * These rules complement Presidio patterns and should be used together.
 * Use `getDefaultSanitizationRules()` to get the full merged set.
 *
 * Users can extend or replace these rules.
 */
export const WIRE_SPECIFIC_SANITIZATION_RULES: SanitizationRule[] = [
  // UUID masking (partial replacement - Wire-specific behavior)
  // Presidio doesn't have UUID support, so we keep this
  {
    pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
    replacement: (match: string) => {
      const UUID_PREFIX_LENGTH = 8;
      return `${match.substring(0, UUID_PREFIX_LENGTH)}***`;
    },
    appliesTo: [SafetyLevel.SANITIZED],
  },

  // Access token masking (applies to all string values)
  {
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+/gi,
    replacement: 'Bearer [TOKEN]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // Message content masking in messages (looks for quoted content in logs)
  {
    pattern: /(?:content|text|message|plaintext)\s*[:=]\s*["'][^"']*["']/gi,
    replacement: (match: string) => {
      const prefix = match.split(':')[0] || match.split('=')[0];
      return `${prefix}: "[MESSAGE_CONTENT]"`;
    },
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // Encryption key masking in messages (looks for quoted keys/secrets in logs)
  {
    pattern: /(?:key|secret)\s*[:=]\s*["'][^"']*["']/gi,
    replacement: (match: string) => {
      const prefix = match.split(':')[0] || match.split('=')[0];
      return `${prefix}: "[ENCRYPTED]"`;
    },
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // Message content masking (targets specific keys in context) - matches values directly
  {
    pattern: /.+/,
    replacement: '[MESSAGE_CONTENT]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['content', 'text', 'message', 'plaintext'],
  },

  // Encryption key masking (targets specific keys in context) - matches values directly
  {
    pattern: /.+/,
    replacement: '[ENCRYPTED]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['key', 'secret', 'private', 'privateKey'],
  },

  // URL masking (except whitelisted domains)
  {
    pattern: /https?:\/\/[^\s'"]+/gi,
    replacement: (match: string) => {
      const whitelisted = ['wire.com', 'zinfra.io', 'nginz-https', 'datadoghq.com'];
      const isWhitelisted = whitelisted.some(domain => match.includes(domain));
      return isWhitelisted ? match : '[URL]';
    },
    appliesTo: [SafetyLevel.SANITIZED],
  },

  // Stack trace sanitization (applies to error.stack)
  // Wire-specific: Presidio doesn't handle stack traces
  {
    pattern: /at\s+[\w.<>]+\s*\([^)]+\)/g,
    replacement: '[STACK_FRAME]',
    appliesTo: [SafetyLevel.SANITIZED],
  },

  // MAC address masking
  // Wire-specific: Presidio doesn't handle MAC addresses
  {
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    replacement: '[MAC_ADDRESS]',
    appliesTo: [SafetyLevel.SANITIZED],
  },

  // API Keys (Stripe, generic patterns)
  // Wire-specific: Presidio doesn't handle Stripe-specific keys
  {
    pattern: /\b(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{10,}\b/gi,
    replacement: '[API_KEY]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // AWS Access Key ID
  // Wire-specific: More specific than Presidio's generic patterns
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: '[AWS_KEY]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // JWT Token masking
  // Wire-specific: Presidio doesn't have JWT-specific patterns
  {
    pattern: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
    replacement: '[JWT_TOKEN]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // Generic API/Secret key patterns
  // Wire-specific: Context-aware key detection
  {
    pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["']?[a-zA-Z0-9_\-]{20,}["']?/gi,
    replacement: (match: string) => {
      const prefix = match.split(/[:=]/)[0];
      return `${prefix}: "[API_KEY]"`;
    },
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // Name patterns in specific contexts
  {
    pattern: /.+/,
    replacement: '[NAME]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['name', 'fullName', 'firstName', 'lastName', 'displayName', 'username'],
  },

  // Date of birth patterns
  {
    pattern: /.+/,
    replacement: '[DATE_OF_BIRTH]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['dob', 'dateOfBirth', 'birthDate', 'birthday'],
  },

  // Address patterns
  {
    pattern: /.+/,
    replacement: '[ADDRESS]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['address', 'street', 'streetAddress', 'city', 'zipCode', 'postalCode', 'country'],
  },

  // Passport numbers
  {
    pattern: /.+/,
    replacement: '[PASSPORT]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['passport', 'passportNumber'],
  },

  // === Wire-Specific Patterns (Not in Presidio) ===

  // BIC/SWIFT codes (international bank identifier)
  // Wire-specific: Presidio doesn't have BIC/SWIFT support
  // Pattern matches 8-11 character bank codes, but excludes common placeholder words
  {
    pattern: /\b(?!PASSPORT|REGISTER|CREDITCA|INSURANC)[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g,
    replacement: '[BIC]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // German Handelsregisternummer (Commercial Register Number) - HRB 12345
  // Wire-specific: Presidio doesn't have this pattern
  {
    pattern: /\bHR[AB]\s?\d{1,6}\b/gi,
    replacement: '[REGISTER_NUMBER]',
    appliesTo: [SafetyLevel.SANITIZED],
  },

  // German Personalausweisnummer (ID card) - alphanumeric
  // Wire-specific: Context-aware ID card detection
  {
    pattern: /\b[A-Z0-9]{9,10}\b(?=.*ausweis|.*personalausweis)/gi,
    replacement: '[ID_CARD]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },

  // Insurance number patterns
  {
    pattern: /.+/,
    replacement: '[INSURANCE_NUMBER]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
    appliesToKeys: ['insuranceNumber', 'versicherungsnummer', 'krankenversicherung'],
  },

  // Full object dump sanitization (for development debugging) - matches any object literal
  {
    pattern: /(?:object|state)\s*dump\s*[:=]\s*\{.+?\}/gis,
    replacement: (match: string) => {
      return match.replace(/\{.+\}/s, '[OBJECT_DUMP]');
    },
    appliesTo: [SafetyLevel.DEV_ONLY],
  },

  // Error object sanitization (for development debugging)
  {
    pattern: /error\s+occurred\s*[:=]\s*\{.+?\}/gis,
    replacement: (match: string) => {
      return match.replace(/\{.+\}/s, '[ERROR_OBJECT]');
    },
    appliesTo: [SafetyLevel.DEV_ONLY],
  },
];

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
export function getDefaultSanitizationRules(): SanitizationRule[] {
  try {
    // Load bundled Presidio patterns
    const loader = new PresidioLoader();
    loader.loadFromJSON(presidioRecognizersJson);

    // Get Presidio rules but exclude URL pattern (we have better whitelisting)
    const allPresidioRules = loader.toSanitizationRules();
    const presidioRules = allPresidioRules.filter((rule: SanitizationRule) => rule.metadata?.entityType !== 'URL');

    // Split Wire-specific rules into high/low priority
    const wireHighPriority = WIRE_SPECIFIC_SANITIZATION_RULES.filter(rule => {
      // High priority: UUID, Bearer tokens, Message content, Encryption keys, URL whitelisting, Context-aware patterns
      const source = rule.pattern.source;
      const isHighPriority =
        source.includes('[a-f0-9]{8}') || // UUID (specific hex pattern)
        source.includes('Bearer') || // Bearer tokens
        source.includes('content|text|message') || // Message content
        source.includes('(?:key|secret)') || // Encryption keys
        (source.includes('https?') && rule.replacement instanceof Function) || // URL whitelisting
        (rule.appliesToKeys && rule.appliesToKeys.length > 0); // Context-aware patterns (passport, name, etc.)
      return isHighPriority;
    });

    const wireLowPriority = WIRE_SPECIFIC_SANITIZATION_RULES.filter(rule => !wireHighPriority.includes(rule));

    // Merge with correct ordering
    return [
      ...wireHighPriority, // Wire high-priority patterns FIRST
      ...presidioRules, // Presidio patterns in the middle
      ...wireLowPriority, // Wire low-priority patterns LAST
    ];
  } catch (error) {
    // Fallback to Wire-specific only if Presidio loading fails
    logger.warn('Failed to load Presidio patterns, using Wire-specific only:', error);
    return WIRE_SPECIFIC_SANITIZATION_RULES;
  }
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use getDefaultSanitizationRules() or WIRE_SPECIFIC_SANITIZATION_RULES instead
 */
export const DEFAULT_SANITIZATION_RULES = getDefaultSanitizationRules();
