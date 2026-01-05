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

import {
  PresidioRecognizer,
  PresidioRegexRecognizer,
  PresidioDenyListRecognizer,
  isRegexRecognizer,
  isDenyListRecognizer,
} from './PresidioTypes';

import {SafetyLevel, SanitizationRule} from '../types';

// Internal logger for conversion warnings (always enabled to catch pattern issues)
const logger = logdown('@wireapp/logger/PresidioConverter');
logger.state.isEnabled = true;

/**
 * Entity type to replacement text mapping
 * Maps Presidio entity types to our sanitization placeholders
 */
const ENTITY_REPLACEMENT_MAP: Record<string, string> = {
  // Global entities
  CREDIT_CARD: '[CREDIT_CARD]',
  CRYPTO: '[CRYPTO_ADDRESS]',
  EMAIL_ADDRESS: '[EMAIL]',
  IBAN_CODE: '[IBAN]',
  IP_ADDRESS: '[IP_ADDRESS]',
  PHONE_NUMBER: '[PHONE]',
  URL: '[URL]',
  PERSON: '[NAME]',
  MEDICAL_LICENSE: '[MEDICAL_LICENSE]',

  // USA
  US_BANK_NUMBER: '[BANK_ACCOUNT]',
  US_DRIVER_LICENSE: '[DRIVER_LICENSE]',
  US_ITIN: '[ITIN]',
  US_PASSPORT: '[PASSPORT]',
  US_SSN: '[SSN]',

  // UK
  UK_NHS: '[NHS_NUMBER]',
  NI_NUMBER: '[NI_NUMBER]',

  // Spain
  ES_NIF: '[NIF]',
  ES_NIE: '[NIE]',

  // Italy
  IT_FISCAL_CODE: '[FISCAL_CODE]',
  IT_DRIVER_LICENSE: '[DRIVER_LICENSE]',
  IT_VAT_CODE: '[VAT_ID]',
  IT_PASSPORT: '[PASSPORT]',
  IT_IDENTITY_CARD: '[ID_CARD]',

  // Poland
  PL_PESEL: '[PESEL]',

  // Singapore
  SG_NRIC_FIN: '[NRIC_FIN]',
  SG_UEN: '[UEN]',

  // Australia
  AU_ABN: '[ABN]',
  AU_ACN: '[ACN]',
  AU_TFN: '[TFN]',
  AU_MEDICARE: '[MEDICARE]',

  // India
  IN_PAN: '[PAN]',
  IN_AADHAAR: '[AADHAAR]',
  IN_VEHICLE_REGISTRATION: '[VEHICLE_REG]',
  IN_VOTER: '[VOTER_ID]',
  IN_PASSPORT: '[PASSPORT]',
  IN_GSTIN: '[GSTIN]',

  // Finland
  FI_PERSONAL_IDENTITY_CODE: '[FI_IDENTITY]',

  // Korea
  KR_RRN: '[RRN]',
  KR_PASSPORT: '[PASSPORT]',

  // Thailand
  TH_NATIONAL_ID: '[TH_NATIONAL_ID]',

  // DACH (Germany, Austria, Switzerland) - our custom additions
  DE_TAX_ID: '[TAX_ID]',
  DE_VAT_ID: '[VAT_ID]',
  AT_VAT_ID: '[VAT_ID]',
  CH_VAT_ID: '[VAT_ID]',
  CH_AHV: '[AHV_NUMBER]',
  DE_LICENSE_PLATE: '[LICENSE_PLATE]',
  DE_ID_CARD: '[ID_CARD]',
  HRB: '[REGISTER_NUMBER]',
  INSURANCE_NUMBER: '[INSURANCE_NUMBER]',
};

/**
 * Determine which SafetyLevels a pattern should apply to based on sensitivity
 */
function determineSafetyLevels(entityType: string, score: number): SafetyLevel[] {
  // High-sensitivity PII (credit cards, SSN, etc.) → SAFE + SANITIZED
  const highSensitivity = [
    'CREDIT_CARD',
    'US_SSN',
    'IBAN_CODE',
    'CRYPTO',
    'US_PASSPORT',
    'UK_NHS',
    'MEDICAL_LICENSE',
    'IN_AADHAAR',
    'EMAIL_ADDRESS', // Email should be masked in production (SAFE mode)
    'IP_ADDRESS', // IP addresses should be masked in production
  ];

  const HIGH_CONFIDENCE_THRESHOLD = 0.8;
  if (highSensitivity.includes(entityType) || score >= HIGH_CONFIDENCE_THRESHOLD) {
    return [SafetyLevel.SAFE, SafetyLevel.SANITIZED];
  }

  // Medium-sensitivity PII → SANITIZED only
  return [SafetyLevel.SANITIZED];
}

/**
 * Convert Presidio regex recognizer to our SanitizationRule
 */
function convertRegexRecognizer(recognizer: PresidioRegexRecognizer): SanitizationRule[] {
  const rules: SanitizationRule[] = [];
  const replacement = ENTITY_REPLACEMENT_MAP[recognizer.supported_entity] || `[${recognizer.supported_entity}]`;

  for (const pattern of recognizer.patterns) {
    try {
      // Convert Presidio regex string to RegExp
      // Presidio uses Python regex, we need to convert to JavaScript regex
      const jsRegex = convertPythonRegexToJS(pattern.regex);
      const appliesTo = determineSafetyLevels(recognizer.supported_entity, pattern.score);

      rules.push({
        pattern: new RegExp(jsRegex, 'gi'),
        replacement,
        appliesTo,
        metadata: {
          source: 'presidio',
          recognizerName: recognizer.name,
          entityType: recognizer.supported_entity,
          confidence: pattern.score,
        },
      });
    } catch (error) {
      logger.warn(`Failed to convert pattern "${pattern.name}":`, error);
    }
  }

  return rules;
}

/**
 * Convert Presidio deny-list recognizer to our SanitizationRule
 */
function convertDenyListRecognizer(recognizer: PresidioDenyListRecognizer): SanitizationRule {
  const replacement = ENTITY_REPLACEMENT_MAP[recognizer.supported_entity] || `[${recognizer.supported_entity}]`;

  // Create a regex that matches any of the deny-list terms
  const escapedTerms = recognizer.deny_list.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regexPattern = `\\b(${escapedTerms.join('|')})\\b`;

  return {
    pattern: new RegExp(regexPattern, 'gi'),
    replacement,
    appliesTo: [SafetyLevel.SANITIZED],
    metadata: {
      source: 'presidio',
      recognizerName: recognizer.name,
      entityType: recognizer.supported_entity,
      denyListSize: recognizer.deny_list.length,
    },
  };
}

/**
 * Convert Python regex syntax to JavaScript regex syntax
 * Handles common differences between Python and JavaScript regex
 */
function convertPythonRegexToJS(pythonRegex: string): string {
  let jsRegex = pythonRegex;

  // Remove Python-specific flags embedded in pattern (e.g., (?i) for case-insensitive)
  jsRegex = jsRegex.replace(/\(\?[iLmsux]+\)/g, '');

  // Convert Python named groups (?P<name>...) to JavaScript named groups (?<name>...)
  jsRegex = jsRegex.replace(/\(\?P<(\w+)>/g, '(?<$1>');

  // Remove Python lookahead/lookbehind that aren't supported in older JS
  // (Modern JS supports these, but keep for compatibility)

  return jsRegex;
}

/**
 * Convert a collection of Presidio recognizers to SanitizationRules
 */
export function convertPresidioRecognizers(recognizers: PresidioRecognizer[]): SanitizationRule[] {
  const rules: SanitizationRule[] = [];

  for (const recognizer of recognizers) {
    try {
      if (isRegexRecognizer(recognizer)) {
        rules.push(...convertRegexRecognizer(recognizer));
      } else if (isDenyListRecognizer(recognizer)) {
        rules.push(convertDenyListRecognizer(recognizer));
      }
    } catch (error) {
      logger.warn(`Failed to convert recognizer "${recognizer.name}":`, error);
    }
  }

  return rules;
}

/**
 * Filter Presidio recognizers by language
 */
export function filterByLanguage(recognizers: PresidioRecognizer[], language: string): PresidioRecognizer[] {
  return recognizers.filter(
    recognizer => recognizer.supported_language === language || recognizer.supported_language === 'all',
  );
}

/**
 * Filter Presidio recognizers by entity types
 */
export function filterByEntityTypes(recognizers: PresidioRecognizer[], entityTypes: string[]): PresidioRecognizer[] {
  const entitySet = new Set(entityTypes);
  return recognizers.filter(recognizer => entitySet.has(recognizer.supported_entity));
}
