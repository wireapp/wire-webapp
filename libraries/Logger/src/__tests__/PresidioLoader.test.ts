/**
 * Presidio Loader Tests
 */

import {PresidioLoader, loadPresidioRulesFromString} from '../presidio/PresidioLoader';
import {PresidioRecognizerCollection} from '../presidio/PresidioTypes';
import {SafetyLevel} from '../types';

describe('PresidioLoader', () => {
  let loader: PresidioLoader;

  beforeEach(() => {
    loader = new PresidioLoader();
  });

  describe('Loading Recognizers', () => {
    it('should load recognizers from JSON', () => {
      const collection: PresidioRecognizerCollection = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'Test Email Recognizer',
            supported_language: 'en',
            supported_entity: 'EMAIL_ADDRESS',
            patterns: [
              {
                name: 'Email Pattern',
                regex: '[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}',
                score: 0.8,
              },
            ],
          },
        ],
      };

      loader.loadFromJSON(collection);
      const metadata = loader.getMetadata();

      expect(metadata.recognizerCount).toBe(1);
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.entityTypes).toEqual(['EMAIL_ADDRESS']);
    });

    it('should load recognizers from JSON string', () => {
      const jsonString = JSON.stringify({
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'Test SSN Recognizer',
            supported_language: 'en',
            supported_entity: 'US_SSN',
            patterns: [
              {
                name: 'SSN Pattern',
                regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
                score: 0.9,
              },
            ],
          },
        ],
      });

      loader.loadFromString(jsonString);
      const recognizers = loader.getRecognizers();

      expect(recognizers).toHaveLength(1);
      expect(recognizers[0].supported_entity).toBe('US_SSN');
    });

    it('should throw error on invalid JSON string', () => {
      expect(() => {
        loader.loadFromString('invalid json');
      }).toThrow('Failed to parse Presidio recognizers JSON');
    });
  });

  describe('Converting to SanitizationRules', () => {
    it('should convert regex recognizers to sanitization rules', () => {
      const collection: PresidioRecognizerCollection = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'Credit Card Recognizer',
            supported_language: 'en',
            supported_entity: 'CREDIT_CARD',
            patterns: [
              {
                name: 'Visa Pattern',
                regex: '4[0-9]{12}(?:[0-9]{3})?',
                score: 0.8,
              },
            ],
          },
        ],
      };

      loader.loadFromJSON(collection);
      const rules = loader.toSanitizationRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].replacement).toBe('[CREDIT_CARD]');
      expect(rules[0].appliesTo).toContain(SafetyLevel.SAFE);
      expect(rules[0].appliesTo).toContain(SafetyLevel.SANITIZED);
      expect(rules[0].metadata?.source).toBe('presidio');
      expect(rules[0].metadata?.entityType).toBe('CREDIT_CARD');
    });

    it('should convert deny-list recognizers to sanitization rules', () => {
      const collection: PresidioRecognizerCollection = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'Title Recognizer',
            supported_language: 'en',
            supported_entity: 'MR_TITLE',
            deny_list: ['Mr', 'Mr.', 'Mister'],
          },
        ],
      };

      loader.loadFromJSON(collection);
      const rules = loader.toSanitizationRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].replacement).toBe('[MR_TITLE]');
      expect(rules[0].metadata?.denyListSize).toBe(3);
    });

    it('should handle multiple patterns in one recognizer', () => {
      const collection: PresidioRecognizerCollection = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'Phone Recognizer',
            supported_language: 'en',
            supported_entity: 'PHONE_NUMBER',
            patterns: [
              {
                name: 'US Phone',
                regex: '\\d{3}-\\d{3}-\\d{4}',
                score: 0.7,
              },
              {
                name: 'Intl Phone',
                regex: '\\+\\d{1,3}\\s?\\d{3,4}\\s?\\d{4}',
                score: 0.6,
              },
            ],
          },
        ],
      };

      loader.loadFromJSON(collection);
      const rules = loader.toSanitizationRules();

      expect(rules).toHaveLength(2);
      expect(rules[0].replacement).toBe('[PHONE]');
      expect(rules[1].replacement).toBe('[PHONE]');
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      const collection: PresidioRecognizerCollection = {
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'US SSN',
            supported_language: 'en',
            supported_entity: 'US_SSN',
            patterns: [{name: 'SSN', regex: '\\d{3}-\\d{2}-\\d{4}', score: 0.9}],
          },
          {
            name: 'German Tax ID',
            supported_language: 'de',
            supported_entity: 'DE_TAX_ID',
            patterns: [{name: 'Tax ID', regex: '\\d{11}', score: 0.7}],
          },
          {
            name: 'Email',
            supported_language: 'all',
            supported_entity: 'EMAIL_ADDRESS',
            patterns: [{name: 'Email', regex: '[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}', score: 0.8}],
          },
        ],
      };

      loader.loadFromJSON(collection);
    });

    it('should filter by language', () => {
      const rules = loader.toSanitizationRules({language: 'en'});

      // Should get US_SSN (en) and EMAIL_ADDRESS (all)
      expect(rules.length).toBeGreaterThanOrEqual(2);
      const entityTypes = rules.map(r => r.metadata?.entityType);
      expect(entityTypes).toContain('US_SSN');
      expect(entityTypes).toContain('EMAIL_ADDRESS');
      expect(entityTypes).not.toContain('DE_TAX_ID');
    });

    it('should filter by entity types', () => {
      const rules = loader.toSanitizationRules({
        entityTypes: ['US_SSN', 'EMAIL_ADDRESS'],
      });

      expect(rules.length).toBeGreaterThanOrEqual(2);
      const entityTypes = rules.map(r => r.metadata?.entityType);
      expect(entityTypes).toContain('US_SSN');
      expect(entityTypes).toContain('EMAIL_ADDRESS');
      expect(entityTypes).not.toContain('DE_TAX_ID');
    });

    it('should combine language and entity type filters', () => {
      const rules = loader.toSanitizationRules({
        language: 'de',
        entityTypes: ['DE_TAX_ID'],
      });

      expect(rules).toHaveLength(1);
      expect(rules[0].metadata?.entityType).toBe('DE_TAX_ID');
    });
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const collection: PresidioRecognizerCollection = {
        version: '2.5.0',
        updated: '2025-01-15T12:00:00Z',
        recognizers: [
          {
            name: 'Email',
            supported_language: 'all',
            supported_entity: 'EMAIL_ADDRESS',
            patterns: [{name: 'Email', regex: '.+@.+', score: 0.5}],
          },
          {
            name: 'SSN',
            supported_language: 'en',
            supported_entity: 'US_SSN',
            patterns: [{name: 'SSN', regex: '\\d{3}-\\d{2}-\\d{4}', score: 0.9}],
          },
        ],
      };

      loader.loadFromJSON(collection);
      const metadata = loader.getMetadata();

      expect(metadata.version).toBe('2.5.0');
      expect(metadata.lastUpdated).toBe('2025-01-15T12:00:00Z');
      expect(metadata.recognizerCount).toBe(2);
      expect(metadata.entityTypes).toEqual(['EMAIL_ADDRESS', 'US_SSN']);
      expect(metadata.languages).toEqual(['all', 'en']);
    });
  });

  describe('Helper Functions', () => {
    it('should load rules from string using helper', () => {
      const jsonString = JSON.stringify({
        version: '1.0.0',
        updated: '2025-01-01T00:00:00Z',
        recognizers: [
          {
            name: 'Email',
            supported_language: 'en',
            supported_entity: 'EMAIL_ADDRESS',
            patterns: [{name: 'Email', regex: '.+@.+', score: 0.5}],
          },
        ],
      });

      const rules = loadPresidioRulesFromString(jsonString);

      expect(rules).toHaveLength(1);
      expect(rules[0].replacement).toBe('[EMAIL]');
    });
  });

  describe('Integration with bundled patterns', () => {
    it('should load bundled Presidio patterns', () => {
      // This tests that the generated JSON file can be loaded
      const presidioJson = require('../presidio/presidio-recognizers.json');

      loader.loadFromJSON(presidioJson);
      const metadata = loader.getMetadata();

      expect(metadata.recognizerCount).toBeGreaterThan(0);
      expect(metadata.entityTypes).toContain('CREDIT_CARD');
      expect(metadata.entityTypes).toContain('EMAIL_ADDRESS');
      expect(metadata.entityTypes).toContain('DE_VAT_ID');
      expect(metadata.entityTypes).toContain('CH_AHV');
    });

    it('should convert bundled patterns to rules', () => {
      const presidioJson = require('../presidio/presidio-recognizers.json');

      loader.loadFromJSON(presidioJson);
      const rules = loader.toSanitizationRules();

      expect(rules.length).toBeGreaterThan(0);

      // All rules should have metadata
      rules.forEach(rule => {
        expect(rule.metadata?.source).toBe('presidio');
        expect(rule.metadata?.entityType).toBeDefined();
      });
    });
  });
});
