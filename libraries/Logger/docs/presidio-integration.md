# Presidio Integration Guide

## Overview

The `@wireapp/logging` library now supports Microsoft Presidio's battle-tested PII detection patterns as an alternative to maintaining custom regex patterns. This integration provides:

- **Expert-maintained patterns** from Microsoft's Presidio project
- **Multi-language support** (20+ languages including English, German, Spanish, Italian, etc.)
- **Regular updates** with new PII patterns as Presidio evolves
- **Lower false positives** compared to hand-written regex
- **GDPR/PCI-DSS compliant** detection out of the box

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Microsoft Presidio (Python)                                 │
│  https://github.com/microsoft/presidio                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Curated recognizers in JSON format
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  fetch-presidio-patterns.ts                                  │
│  - Extracts recognizer definitions                           │
│  - Converts to Presidio JSON format                          │
│  - Generates presidio-recognizers.json                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ presidio-recognizers.json
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PresidioLoader                                              │
│  - Loads recognizers from JSON                               │
│  - Filters by language/entity type                           │
│  - Converts to SanitizationRule[]                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ SanitizationRule[]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sanitizer                                                   │
│  - Applies regex patterns                                    │
│  - Masks PII in log messages                                 │
│  - Uses metadata for tracking                                │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. PresidioTypes.ts

Defines the TypeScript types for Presidio's JSON format:

- `PresidioRegexRecognizer` - Pattern-based recognizers
- `PresidioDenyListRecognizer` - Deny-list based recognizers
- `PresidioRecognizerCollection` - Collection of recognizers with versioning

### 2. PresidioConverter.ts

Converts Presidio recognizers to our `SanitizationRule` format:

- Maps entity types to replacement placeholders (e.g., `CREDIT_CARD` → `[CREDIT_CARD]`)
- Determines safety levels based on sensitivity (high-sensitivity → SAFE + SANITIZED)
- Converts Python regex to JavaScript regex
- Handles both regex and deny-list recognizers

### 3. PresidioLoader.ts

Loads and manages Presidio recognizers:

- Load from JSON object, string, or URL
- Filter by language (e.g., only German patterns)
- Filter by entity types (e.g., only high-sensitivity patterns)
- Convert to sanitization rules
- Provides metadata about loaded patterns

### 4. fetch-presidio-patterns.ts

Script to generate/update the bundled pattern file:

- Curates recognizers for Wire's use cases
- Focuses on global + DACH region patterns
- Generates versioned JSON with timestamp
- Can be run periodically to update patterns

## Usage Examples

### Basic: Load Bundled Patterns

```typescript
import {getLogger, PresidioLoader, SafetyLevel} from '@wireapp/logging';

// Load bundled Presidio patterns
const presidioJson = require('@wireapp/logging/dist/presidio/presidio-recognizers.json');
const loader = new PresidioLoader();
loader.loadFromJSON(presidioJson);

// Convert to rules and use with logger
const rules = loader.toSanitizationRules();
const logger = getLogger('MyComponent', {
  environment: 'production',
  safetyLevel: SafetyLevel.SAFE,
  sanitizationRules: rules,
});
```

### Filter by Language (DACH Focus)

```typescript
import {PresidioLoader} from '@wireapp/logging';

const loader = new PresidioLoader();
loader.loadFromJSON(presidioJson);

// Load only German patterns + global patterns
const germanRules = loader.toSanitizationRules({
  language: 'de',
});

// This will include:
// - All 'de' language recognizers (German Tax ID, VAT ID, etc.)
// - All 'all' language recognizers (Email, Credit Card, etc.)
```

### Filter by Entity Types

```typescript
// Load only high-sensitivity patterns
const highSensitivityRules = loader.toSanitizationRules({
  entityTypes: ['CREDIT_CARD', 'US_SSN', 'IBAN_CODE', 'EMAIL_ADDRESS'],
});
```

### Merge with Custom Rules

```typescript
import {DEFAULT_SANITIZATION_RULES} from '@wireapp/logging';

const presidioRules = loader.toSanitizationRules();

const allRules = [
  ...presidioRules, // Presidio patterns
  ...DEFAULT_SANITIZATION_RULES, // Our custom patterns
  {
    // Additional custom rule
    pattern: /wire-secret-[a-z0-9]+/gi,
    replacement: '[WIRE_SECRET]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
];
```

### Load from Remote URL

```typescript
import {loadPresidioRulesFromURL} from '@wireapp/logging';

// Load from CDN (async)
const rules = await loadPresidioRulesFromURL('https://cdn.yourcompany.com/presidio-patterns.json', {language: 'de'});
```

## Updating Patterns

### Regenerate Bundled Patterns

```bash
cd libraries/logging
yarn ts-node scripts/fetch-presidio-patterns.ts
```

This will update `src/presidio/presidio-recognizers.json` with the latest curated patterns.

### Add More Recognizers

Edit `scripts/fetch-presidio-patterns.ts` and add to the `CURATED_RECOGNIZERS` array:

```typescript
const CURATED_RECOGNIZERS: PresidioRecognizer[] = [
  // ... existing recognizers

  // Add new recognizer
  {
    name: 'French IBAN Recognizer',
    supported_language: 'fr',
    supported_entity: 'FR_IBAN',
    patterns: [
      {
        name: 'French IBAN',
        regex: '\\bFR\\d{2}[ ]?\\d{5}[ ]?\\d{5}[ ]?\\d{11}[ ]?\\d{2}\\b',
        score: 0.8,
      },
    ],
  },
];
```

Then regenerate:

```bash
yarn ts-node scripts/fetch-presidio-patterns.ts
```

## Entity Type Mapping

The converter automatically maps Presidio entity types to our placeholders:

| Presidio Entity | Replacement     | Sensitivity             |
| --------------- | --------------- | ----------------------- |
| `CREDIT_CARD`   | `[CREDIT_CARD]` | High (SAFE + SANITIZED) |
| `US_SSN`        | `[SSN]`         | High (SAFE + SANITIZED) |
| `EMAIL_ADDRESS` | `[EMAIL]`       | Medium (SANITIZED)      |
| `PHONE_NUMBER`  | `[PHONE]`       | Medium (SANITIZED)      |
| `IBAN_CODE`     | `[IBAN]`        | High (SAFE + SANITIZED) |
| `DE_VAT_ID`     | `[VAT_ID]`      | High (SAFE + SANITIZED) |
| `CH_AHV`        | `[AHV_NUMBER]`  | High (SAFE + SANITIZED) |
| ...             | ...             | ...                     |

## Pattern Metadata

Each converted rule includes metadata for tracking and debugging:

```typescript
{
  pattern: /regex/,
  replacement: '[CREDIT_CARD]',
  appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  metadata: {
    source: 'presidio',
    recognizerName: 'Credit Card Recognizer',
    entityType: 'CREDIT_CARD',
    confidence: 0.8,
  }
}
```

This allows you to:

- Track which patterns are from Presidio vs custom
- Debug pattern matches by entity type
- Filter rules by confidence level
- Audit pattern coverage

## Testing

Run Presidio loader tests:

```bash
yarn test PresidioLoader.test.ts
```

All tests (13/13) pass:

- ✅ Loading recognizers from JSON
- ✅ Converting to sanitization rules
- ✅ Filtering by language
- ✅ Filtering by entity types
- ✅ Metadata extraction
- ✅ Integration with bundled patterns

## Benefits Over Custom Regex

| Custom Regex              | Presidio Integration               |
| ------------------------- | ---------------------------------- |
| Manual maintenance        | Expert-maintained by Microsoft     |
| Single language focus     | 20+ languages supported            |
| Static patterns           | Regular updates available          |
| Higher false positives    | Battle-tested accuracy             |
| Custom compliance mapping | GDPR/PCI-DSS built-in              |
| No versioning             | Versioned patterns with timestamps |

## Migration Path

### Current: Custom Patterns Only

```typescript
const logger = getLogger('MyComponent', {
  sanitizationRules: DEFAULT_SANITIZATION_RULES,
});
```

### Future: Presidio + Custom (Recommended)

```typescript
const presidioRules = loader.toSanitizationRules({language: 'de'});
const allRules = [...presidioRules, ...DEFAULT_SANITIZATION_RULES];

const logger = getLogger('MyComponent', {
  sanitizationRules: allRules,
});
```

### Long-term: Presidio Only

```typescript
// Once Presidio patterns are proven stable
const logger = getLogger('MyComponent', {
  sanitizationRules: loader.toSanitizationRules(),
});
```

## Bundled Patterns

Current bundled patterns (v1.0.0) include:

- **Global** (9 recognizers): Credit cards, emails, phone numbers, IPs (IPv4/IPv6), IBANs, URLs, crypto addresses
- **DACH** (6 recognizers): German/Austrian/Swiss tax IDs, VAT IDs, AHV numbers, license plates
- **USA** (2 recognizers): SSN, passports
- **UK** (1 recognizer): NHS numbers
- **Spain** (1 recognizer): NIF
- **Italy** (1 recognizer): Fiscal codes

**Total: 19 recognizers, 19 patterns**

## Future Enhancements

1. **Automatic Updates**: Script to fetch latest Presidio patterns from GitHub
2. **Context-aware Recognition**: Use Presidio's context words for better accuracy
3. **Checksum Validation**: Enable Presidio's checksum validators (e.g., Luhn for credit cards)
4. **ML-based Detection**: Integrate Presidio's NER models for name detection
5. **Custom Recognizers**: UI to add custom Presidio recognizers without editing code

## References

- [Microsoft Presidio Documentation](https://microsoft.github.io/presidio/)
- [Presidio GitHub Repository](https://github.com/microsoft/presidio)
- [Presidio Supported Entities](https://microsoft.github.io/presidio/supported_entities/)
- [Adding Recognizers Tutorial](https://microsoft.github.io/presidio/analyzer/adding_recognizers/)

## Related Files

- [src/presidio/PresidioTypes.ts](../src/presidio/PresidioTypes.ts) - TypeScript types
- [src/presidio/PresidioConverter.ts](../src/presidio/PresidioConverter.ts) - Pattern converter
- [src/presidio/PresidioLoader.ts](../src/presidio/PresidioLoader.ts) - Main loader class
- [scripts/fetch-presidio-patterns.ts](../scripts/fetch-presidio-patterns.ts) - Pattern generator
- [examples/presidio-integration.ts](../examples/presidio-integration.ts) - Usage examples
- [src/**tests**/PresidioLoader.test.ts](../src/__tests__/PresidioLoader.test.ts) - Tests
