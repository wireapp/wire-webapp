# Presidio Integration Guide

## Overview

The logging library integrates Microsoft Presidio's battle-tested PII detection patterns, providing expert-maintained regex patterns that are more accurate than hand-written alternatives. Presidio patterns support multiple languages, receive regular updates, and provide GDPR and PCI-DSS compliant detection out of the box.

## Why Presidio

**Expert Maintenance**: Microsoft's security experts maintain these patterns, continuously updating them as new PII threats emerge.

**Multi-Language Support**: Patterns work across many languages including English, German, Spanish, Italian, and others, with special attention to regional requirements.

**Lower False Positives**: Battle-tested in production systems, Presidio patterns have been refined to minimize false detections.

**Compliance Ready**: Patterns are designed to meet GDPR and PCI-DSS requirements for PII detection.

## How It Works

Microsoft Presidio provides recognizers in JSON format. We fetch these recognizers, convert them to our sanitization rule format, and bundle them with the library. The Presidio Loader reads these patterns and applies them during log sanitization.

Flow:
1. Microsoft Presidio (GitHub) → Recognizers JSON
2. Update script fetches latest patterns
3. Presidio Loader converts to sanitization rules
4. Sanitizer applies patterns to mask PII

## Components

**PresidioTypes**: TypeScript type definitions for Presidio's JSON format (regex recognizers, deny-list recognizers, recognizer collections).

**PresidioConverter**: Converts Presidio recognizers to our sanitization rule format. Maps entity types to placeholders (e.g., `CREDIT_CARD` → `[CREDIT_CARD]`), determines safety levels, and handles Python to JavaScript regex conversion.

**PresidioLoader**: Manages recognizer loading and filtering. Can load from JSON objects, strings, or URLs. Supports filtering by language or entity type.

**Update Script**: `scripts/updatePresidio.js` fetches the latest recognizers from Microsoft's GitHub repository and updates the bundled pattern file.

## Usage

### Using Bundled Patterns (Default)

The library automatically includes bundled Presidio patterns. No additional setup required:

```typescript
import {getLogger} from '@wireapp/logger';

const logger = getLogger('MyComponent');
// Presidio patterns are already active
logger.production.info('User data', {email: 'test@example.com'});
// Email is automatically masked
```

### Loading Patterns Manually

If you need custom pattern loading:

```typescript
import {PresidioLoader} from '@wireapp/logger';

const loader = new PresidioLoader();

// Load from bundled JSON
const presidioJson = require('@wireapp/logger/dist/presidio/presidio-recognizers.json');
loader.loadFromJSON(presidioJson);

// Convert to sanitization rules
const rules = loader.toSanitizationRules();
```

### Filtering by Language

Load patterns for specific languages:

```typescript
// Load German patterns plus global patterns
const germanRules = loader.toSanitizationRules({
  language: 'de',
});

// This includes:
// - All 'de' language recognizers (German Tax ID, VAT ID, etc.)
// - All 'all' language recognizers (Email, Credit Card, etc.)
```

### Filtering by Entity Type

Load only specific PII types:

```typescript
// Load only high-sensitivity patterns
const highSensitivityRules = loader.toSanitizationRules({
  entityTypes: ['CREDIT_CARD', 'US_SSN', 'IBAN_CODE', 'EMAIL_ADDRESS'],
});
```

### Merging with Custom Rules

Combine Presidio patterns with your own:

```typescript
import {DEFAULT_SANITIZATION_RULES} from '@wireapp/logger';

const presidioRules = loader.toSanitizationRules({language: 'de'});

const allRules = [
  ...presidioRules,                    // Presidio patterns
  ...DEFAULT_SANITIZATION_RULES,       // Wire-specific patterns
  {
    pattern: /wire-secret-[a-z0-9]+/gi,
    replacement: '[WIRE_SECRET]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
];
```

## Updating Patterns

Update to the latest Presidio patterns:

```bash
yarn presidio:update
```

This script:
1. Fetches the latest recognizers from Microsoft's Presidio GitHub
2. Updates `src/presidio/presidio-recognizers.json`
3. Displays summary of changes

Run this periodically to keep PII patterns up to date.

## Supported Patterns

The bundled patterns include recognizers for:

**Global**: Credit cards, emails, phone numbers, IP addresses, IBANs, URLs, cryptocurrency addresses

**DACH Region**: German, Austrian, and Swiss tax IDs, VAT IDs, AHV numbers, license plates

**United States**: Social Security Numbers, passport numbers

**United Kingdom**: NHS numbers

**Spain**: NIF (tax identification numbers)

**Italy**: Fiscal codes

## Entity Type Mapping

Presidio entity types are automatically mapped to replacement placeholders:

| Presidio Entity | Replacement     | Sensitivity Level |
|-----------------|-----------------|-------------------|
| CREDIT_CARD     | [CREDIT_CARD]   | High              |
| US_SSN          | [SSN]           | High              |
| EMAIL_ADDRESS   | [EMAIL]         | Medium            |
| PHONE_NUMBER    | [PHONE]         | Medium            |
| IBAN_CODE       | [IBAN]          | High              |
| DE_VAT_ID       | [VAT_ID]        | High              |
| CH_AHV          | [AHV_NUMBER]    | High              |

High-sensitivity patterns apply to both SAFE and SANITIZED safety levels. Medium-sensitivity patterns apply only to SANITIZED level.

## Pattern Metadata

Each converted rule includes metadata for tracking:

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

This metadata helps with:
- Tracking which patterns come from Presidio versus custom sources
- Debugging pattern matches by entity type
- Filtering rules by confidence level
- Auditing pattern coverage

## Benefits Over Custom Patterns

| Custom Patterns         | Presidio Integration    |
|-------------------------|-------------------------|
| Manual maintenance      | Expert-maintained       |
| Single language         | Multi-language support  |
| Static patterns         | Regular updates         |
| Higher false positives  | Battle-tested accuracy  |
| Custom compliance       | GDPR/PCI-DSS built-in   |
| No versioning           | Versioned with metadata |

## Testing

Presidio integration is fully tested:

```bash
yarn test PresidioLoader.test.ts
```

Tests cover:
- Loading recognizers from JSON
- Converting to sanitization rules
- Filtering by language and entity types
- Metadata extraction
- Integration with bundled patterns

## Related Files

- `src/presidio/PresidioTypes.ts` - TypeScript type definitions
- `src/presidio/PresidioConverter.ts` - Pattern converter
- `src/presidio/PresidioLoader.ts` - Main loader class
- `scripts/updatePresidio.js` - Pattern update script
- `src/presidio/presidio-recognizers.json` - Bundled patterns
- `src/__tests__/PresidioLoader.test.ts` - Tests

## References

- [Microsoft Presidio Documentation](https://microsoft.github.io/presidio/)
- [Presidio GitHub Repository](https://github.com/microsoft/presidio)
- [Supported Entities](https://microsoft.github.io/presidio/supported_entities/)
- [Adding Recognizers](https://microsoft.github.io/presidio/analyzer/adding_recognizers/)
