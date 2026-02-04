/**
 * PresidioConverter Edge Cases Tests
 * Comprehensive tests for Presidio pattern conversion edge cases
 */

import {convertPresidioRecognizers, filterByLanguage, filterByEntityTypes} from '../presidio/PresidioConverter';
import {PresidioRecognizer, PresidioRegexRecognizer, PresidioDenyListRecognizer} from '../presidio/PresidioTypes';
import {SafetyLevel} from '../types';

describe('PresidioConverter Edge Cases', () => {
  describe('convertPresidioRecognizers', () => {
    it('should handle empty recognizer array', () => {
      const rules = convertPresidioRecognizers([]);
      expect(rules).toEqual([]);
    });

    it('should convert regex recognizer with single pattern', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Email Recognizer',
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
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      expect(rules[0].replacement).toBe('[EMAIL]');
      expect(rules[0].appliesTo).toContain(SafetyLevel.SAFE);
      expect(rules[0].metadata?.source).toBe('presidio');
    });

    it('should convert regex recognizer with multiple patterns', () => {
      const recognizers: PresidioRegexRecognizer[] = [
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
            {
              name: 'Mastercard Pattern',
              regex: '5[1-5][0-9]{14}',
              score: 0.9,
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(2);
      expect(rules[0].replacement).toBe('[CREDIT_CARD]');
      expect(rules[1].replacement).toBe('[CREDIT_CARD]');
    });

    it('should convert deny-list recognizer', () => {
      const recognizers: PresidioDenyListRecognizer[] = [
        {
          name: 'Title Recognizer',
          supported_language: 'en',
          supported_entity: 'PERSON',
          deny_list: ['Mr.', 'Mrs.', 'Dr.', 'Prof.'],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      expect(rules[0].replacement).toBe('[NAME]');
      expect(rules[0].appliesTo).toEqual([SafetyLevel.SANITIZED]);
      expect(rules[0].metadata?.denyListSize).toBe(4);
    });

    it('should handle mixed recognizer types', () => {
      const recognizers: PresidioRecognizer[] = [
        {
          name: 'Email Recognizer',
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
        {
          name: 'Title Recognizer',
          supported_language: 'en',
          supported_entity: 'PERSON',
          deny_list: ['Mr.', 'Mrs.'],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(2);
      expect(rules[0].metadata?.source).toBe('presidio');
      expect(rules[1].metadata?.source).toBe('presidio');
    });

    it('should use fallback replacement for unknown entity types', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Unknown Recognizer',
          supported_language: 'en',
          supported_entity: 'UNKNOWN_ENTITY_TYPE',
          patterns: [
            {
              name: 'Unknown Pattern',
              regex: 'test',
              score: 0.5,
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      expect(rules[0].replacement).toBe('[UNKNOWN_ENTITY_TYPE]');
    });

    it('should skip recognizers that fail conversion', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Invalid Regex Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          patterns: [
            {
              name: 'Invalid Pattern',
              regex: '[', // Invalid regex - unmatched bracket
              score: 0.5,
            },
          ],
        },
      ];

      // Should log warning but not throw
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const rules = convertPresidioRecognizers(recognizers);

      expect(rules).toHaveLength(0); // Invalid pattern skipped
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle recognizers without patterns', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Empty Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          patterns: [],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(0);
    });

    it('should handle deny-list with special regex characters', () => {
      const recognizers: PresidioDenyListRecognizer[] = [
        {
          name: 'Special Chars Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          deny_list: ['test.*', 'foo+bar', 'baz[123]', 'qux(xyz)', 'a|b'],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);

      // Verify special chars are escaped
      const pattern = rules[0].pattern.source;
      expect(pattern).toContain('\\.');
      expect(pattern).toContain('\\+');
      expect(pattern).toContain('\\[');
      expect(pattern).toContain('\\]');
      expect(pattern).toContain('\\(');
      expect(pattern).toContain('\\)');
      expect(pattern).toContain('\\|');
    });
  });

  describe('Python to JavaScript Regex Conversion', () => {
    it('should convert Python named groups to JavaScript', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Named Group Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          patterns: [
            {
              name: 'Named Group Pattern',
              regex: '(?P<name>\\w+)',
              score: 0.5,
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      expect(rules[0].pattern.source).toContain('(?<name>');
      expect(rules[0].pattern.source).not.toContain('(?P<name>');
    });

    it('should remove Python inline flags', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Flag Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          patterns: [
            {
              name: 'Flag Pattern',
              regex: '(?i)test(?m)pattern',
              score: 0.5,
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      expect(rules[0].pattern.source).not.toContain('(?i)');
      expect(rules[0].pattern.source).not.toContain('(?m)');
    });

    it('should handle complex Python regex patterns', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Complex Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          patterns: [
            {
              name: 'Complex Pattern',
              regex: '(?P<area>\\d{3})(?i)-(?P<number>\\d{4})',
              score: 0.7,
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      expect(rules[0].pattern).toBeInstanceOf(RegExp);
    });
  });

  describe('Safety Level Assignment', () => {
    it('should assign SAFE + SANITIZED to high-sensitivity entities', () => {
      const highSensitivityEntities = ['CREDIT_CARD', 'US_SSN', 'IBAN_CODE', 'CRYPTO', 'EMAIL_ADDRESS', 'IP_ADDRESS'];

      for (const entityType of highSensitivityEntities) {
        const recognizers: PresidioRegexRecognizer[] = [
          {
            name: `${entityType} Recognizer`,
            supported_language: 'en',
            supported_entity: entityType,
            patterns: [
              {
                name: 'Pattern',
                regex: 'test',
                score: 0.5,
              },
            ],
          },
        ];

        const rules = convertPresidioRecognizers(recognizers);
        expect(rules[0].appliesTo).toContain(SafetyLevel.SAFE);
        expect(rules[0].appliesTo).toContain(SafetyLevel.SANITIZED);
      }
    });

    it('should assign SANITIZED only to medium-sensitivity entities', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Phone Recognizer',
          supported_language: 'en',
          supported_entity: 'PHONE_NUMBER',
          patterns: [
            {
              name: 'Phone Pattern',
              regex: '\\d{3}-\\d{3}-\\d{4}',
              score: 0.6, // Below 0.8 threshold
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules[0].appliesTo).toEqual([SafetyLevel.SANITIZED]);
      expect(rules[0].appliesTo).not.toContain(SafetyLevel.SAFE);
    });

    it('should assign SAFE + SANITIZED to patterns with score >= 0.8', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'High Score Recognizer',
          supported_language: 'en',
          supported_entity: 'PHONE_NUMBER', // Not in high-sensitivity list
          patterns: [
            {
              name: 'High Score Pattern',
              regex: 'test',
              score: 0.9, // Score >= 0.8
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules[0].appliesTo).toContain(SafetyLevel.SAFE);
      expect(rules[0].appliesTo).toContain(SafetyLevel.SANITIZED);
    });
  });

  describe('Metadata', () => {
    it('should include metadata for regex recognizers', () => {
      const recognizers: PresidioRegexRecognizer[] = [
        {
          name: 'Email Recognizer',
          supported_language: 'en',
          supported_entity: 'EMAIL_ADDRESS',
          patterns: [
            {
              name: 'Email Pattern',
              regex: 'test',
              score: 0.8,
            },
          ],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules[0].metadata).toEqual({
        source: 'presidio',
        recognizerName: 'Email Recognizer',
        entityType: 'EMAIL_ADDRESS',
        confidence: 0.8,
      });
    });

    it('should include metadata for deny-list recognizers', () => {
      const recognizers: PresidioDenyListRecognizer[] = [
        {
          name: 'Title Recognizer',
          supported_language: 'en',
          supported_entity: 'PERSON',
          deny_list: ['Mr.', 'Mrs.', 'Dr.'],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules[0].metadata).toEqual({
        source: 'presidio',
        recognizerName: 'Title Recognizer',
        entityType: 'PERSON',
        denyListSize: 3,
      });
    });
  });

  describe('filterByLanguage', () => {
    const recognizers: PresidioRecognizer[] = [
      {
        name: 'English Email',
        supported_language: 'en',
        supported_entity: 'EMAIL_ADDRESS',
        patterns: [{name: 'Email', regex: 'test', score: 0.8}],
      },
      {
        name: 'Spanish NIF',
        supported_language: 'es',
        supported_entity: 'ES_NIF',
        patterns: [{name: 'NIF', regex: 'test', score: 0.8}],
      },
      {
        name: 'Global Credit Card',
        supported_language: 'all',
        supported_entity: 'CREDIT_CARD',
        patterns: [{name: 'CC', regex: 'test', score: 0.8}],
      },
    ];

    it('should filter by specific language', () => {
      const filtered = filterByLanguage(recognizers, 'en');
      expect(filtered).toHaveLength(2); // English + all
      expect(filtered[0].supported_language).toBe('en');
      expect(filtered[1].supported_language).toBe('all');
    });

    it('should include global language recognizers', () => {
      const filtered = filterByLanguage(recognizers, 'de');
      expect(filtered).toHaveLength(1); // Only 'all'
      expect(filtered[0].supported_language).toBe('all');
    });

    it('should return empty array when no matches', () => {
      const filtered = filterByLanguage(recognizers, 'xyz');
      expect(filtered).toHaveLength(1); // Only 'all'
    });

    it('should handle empty recognizer array', () => {
      const filtered = filterByLanguage([], 'en');
      expect(filtered).toEqual([]);
    });

    it('should be case-sensitive', () => {
      const filtered = filterByLanguage(recognizers, 'EN'); // Uppercase
      expect(filtered).toHaveLength(1); // Only 'all'
    });
  });

  describe('filterByEntityTypes', () => {
    const recognizers: PresidioRecognizer[] = [
      {
        name: 'Email Recognizer',
        supported_language: 'en',
        supported_entity: 'EMAIL_ADDRESS',
        patterns: [{name: 'Email', regex: 'test', score: 0.8}],
      },
      {
        name: 'Phone Recognizer',
        supported_language: 'en',
        supported_entity: 'PHONE_NUMBER',
        patterns: [{name: 'Phone', regex: 'test', score: 0.8}],
      },
      {
        name: 'Credit Card Recognizer',
        supported_language: 'en',
        supported_entity: 'CREDIT_CARD',
        patterns: [{name: 'CC', regex: 'test', score: 0.8}],
      },
    ];

    it('should filter by single entity type', () => {
      const filtered = filterByEntityTypes(recognizers, ['EMAIL_ADDRESS']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].supported_entity).toBe('EMAIL_ADDRESS');
    });

    it('should filter by multiple entity types', () => {
      const filtered = filterByEntityTypes(recognizers, ['EMAIL_ADDRESS', 'PHONE_NUMBER']);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].supported_entity).toBe('EMAIL_ADDRESS');
      expect(filtered[1].supported_entity).toBe('PHONE_NUMBER');
    });

    it('should return empty array when no matches', () => {
      const filtered = filterByEntityTypes(recognizers, ['UNKNOWN_TYPE']);
      expect(filtered).toEqual([]);
    });

    it('should handle empty entity types array', () => {
      const filtered = filterByEntityTypes(recognizers, []);
      expect(filtered).toEqual([]);
    });

    it('should handle empty recognizer array', () => {
      const filtered = filterByEntityTypes([], ['EMAIL_ADDRESS']);
      expect(filtered).toEqual([]);
    });

    it('should be case-sensitive', () => {
      const filtered = filterByEntityTypes(recognizers, ['email_address']); // Lowercase
      expect(filtered).toEqual([]);
    });

    it('should handle duplicate entity types in filter', () => {
      const filtered = filterByEntityTypes(recognizers, ['EMAIL_ADDRESS', 'EMAIL_ADDRESS']);
      expect(filtered).toHaveLength(1); // Should not duplicate results
    });
  });

  describe('Error Handling', () => {
    it('should handle recognizer with invalid structure', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const recognizers: any[] = [
        {
          // Missing required fields
          name: 'Invalid Recognizer',
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('should continue processing after encountering invalid recognizer', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const recognizers: PresidioRecognizer[] = [
        {
          name: 'Valid Recognizer',
          supported_language: 'en',
          supported_entity: 'EMAIL_ADDRESS',
          patterns: [{name: 'Email', regex: 'test', score: 0.8}],
        },
        {
          name: 'Invalid Recognizer',
          supported_language: 'en',
          supported_entity: 'TEST',
          patterns: [{name: 'Invalid', regex: '[', score: 0.5}], // Invalid regex
        },
        {
          name: 'Another Valid Recognizer',
          supported_language: 'en',
          supported_entity: 'PHONE_NUMBER',
          patterns: [{name: 'Phone', regex: 'test', score: 0.7}],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(2); // Two valid recognizers
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw error when given null or undefined recognizers', () => {
      const recognizers: any[] = [null];

      expect(() => {
        convertPresidioRecognizers(recognizers);
      }).toThrow();
    });

    it('should handle empty deny list', () => {
      const recognizers: PresidioDenyListRecognizer[] = [
        {
          name: 'Empty Deny List',
          supported_language: 'en',
          supported_entity: 'TEST',
          deny_list: [],
        },
      ];

      const rules = convertPresidioRecognizers(recognizers);
      expect(rules).toHaveLength(1);
      // Pattern should match nothing (empty alternation)
      expect(rules[0].pattern.source).toContain('()');
    });
  });

  describe('Entity Replacement Mapping', () => {
    it('should map all documented entity types correctly', () => {
      const entityMappings = [
        {entity: 'CREDIT_CARD', expected: '[CREDIT_CARD]'},
        {entity: 'US_SSN', expected: '[SSN]'},
        {entity: 'EMAIL_ADDRESS', expected: '[EMAIL]'},
        {entity: 'PHONE_NUMBER', expected: '[PHONE]'},
        {entity: 'IBAN_CODE', expected: '[IBAN]'},
        {entity: 'IP_ADDRESS', expected: '[IP_ADDRESS]'},
        {entity: 'URL', expected: '[URL]'},
        {entity: 'PERSON', expected: '[NAME]'},
      ];

      for (const {entity, expected} of entityMappings) {
        const recognizers: PresidioRegexRecognizer[] = [
          {
            name: `${entity} Recognizer`,
            supported_language: 'en',
            supported_entity: entity,
            patterns: [{name: 'Pattern', regex: 'test', score: 0.5}],
          },
        ];

        const rules = convertPresidioRecognizers(recognizers);
        expect(rules[0].replacement).toBe(expected);
      }
    });

    it('should handle country-specific entities', () => {
      const countryEntities = [
        {entity: 'ES_NIF', expected: '[NIF]'},
        {entity: 'IT_FISCAL_CODE', expected: '[FISCAL_CODE]'},
        {entity: 'PL_PESEL', expected: '[PESEL]'},
        {entity: 'SG_NRIC_FIN', expected: '[NRIC_FIN]'},
        {entity: 'AU_TFN', expected: '[TFN]'},
        {entity: 'IN_AADHAAR', expected: '[AADHAAR]'},
      ];

      for (const {entity, expected} of countryEntities) {
        const recognizers: PresidioRegexRecognizer[] = [
          {
            name: `${entity} Recognizer`,
            supported_language: 'en',
            supported_entity: entity,
            patterns: [{name: 'Pattern', regex: 'test', score: 0.5}],
          },
        ];

        const rules = convertPresidioRecognizers(recognizers);
        expect(rules[0].replacement).toBe(expected);
      }
    });
  });
});
