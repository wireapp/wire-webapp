# @wireapp/logger

A security-critical unified logging library for the Wire ecosystem with automatic sanitization and multi-transport support.

## Features

- **Explicit Production/Development API** - Clear separation between production-safe and development-only logs
- **Automatic Sanitization** - No manual sanitization calls needed - happens automatically
- **Microsoft Presidio Integration** - Expert-maintained PII patterns for 20+ languages
- **Multi-Transport Support** - Console, File (Electron), and Datadog transports
- **In-Memory Buffer** - Browser-based ring buffer for support export
- **Context Key Whitelist** - Only whitelisted keys allowed in production logs
- **45+ PII Patterns** - Presidio (19 recognizers) + Wire-specific (26 patterns) for comprehensive coverage
- **DACH Region Focus** - German, Austrian, Swiss patterns (Tax IDs, VAT, AHV, license plates)
- **GDPR/PCI-DSS Compliant** - Battle-tested patterns from Microsoft Presidio
- **Global Singleton** - Shared instance across Electron and Browser contexts via `globalThis`
- **Debug Logging Control** - URL parameter and feature flag support for enabling specific loggers
- **AVS Log Filtering** - Automatic filtering of verbose Audio Video Signaling logs
- **Comprehensive JSDoc** - 200+ lines of inline documentation for IDE IntelliSense

## Installation

```bash
yarn add @wireapp/logger
```

## Building and Publishing

### Build Configuration

The library is built using **Vite** with TypeScript support:

- **Build tool**: Vite 6.x with `vite-plugin-dts` for TypeScript declarations
- **Formats**: Dual ESM/CJS output (`lib/index.js` and `lib/index.cjs`)
- **Type definitions**: Generated automatically via `vite-plugin-dts` (`lib/index.d.ts`)
- **Target**: ESNext (compatible with Node 18+)
- **External dependencies**: `logdown`, `@datadog/browser-logs`, `@datadog/browser-rum` (peer dependencies)

### Build Commands

```bash
# Clean build output
yarn clean

# Build library (ESM + CJS + type declarations)
yarn build

# Type check without emitting
yarn type-check

# Run tests
yarn test
yarn test:watch
yarn test:coverage

# Lint code
yarn lint
yarn lint:fix
```

### Nx Integration

This library is part of an Nx monorepo. Build via Nx:

```bash
# Build via Nx (from workspace root)
nx build logging

# Run tests via Nx
nx test logging

# Type check via Nx
nx run logging:type-check

# Lint via Nx
nx lint logging
```

### Publishing to NPM

The library is published to NPM as `@wireapp/logger`:

```bash
# Prepare for publishing (automatically runs clean + build)
yarn prepublishOnly

# Publish to NPM
npm publish --access public

# Or using yarn
yarn publish --access public
```

**Package exports**:

- ESM: `import {getLogger} from '@wireapp/logger'`
- CJS: `const {getLogger} = require('@wireapp/logger')`
- Types: Automatic via `exports` field in package.json

**Published files**:

- `lib/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Documentation
- `LICENSE` - GPL-3.0 license

## Quick Start

```typescript
import {getLogger} from '@wireapp/logger';

const logger = getLogger('MyComponent');

// Production logs - go to Datadog (if configured)
logger.production.info('API call successful', {endpoint: '/v3/users'});
logger.production.warn('API slow', {duration: 5000});
logger.production.error('API request failed', error, {statusCode: 500});

// Development logs - never go to Datadog
logger.development.info('Full state dump', {fullState});
logger.development.debug('Processing step', {step: 1});
logger.development.trace('Detailed flow', {step1: 'a', step2: 'b'});
```

## Initialization and Configuration Order

### Critical Initialization Rules

**⚠️ IMPORTANT**: The logger uses a global singleton pattern to ensure configuration is shared across all contexts. Follow these rules:

1. **Initialize ONCE** - Call `initializeLogger()` only once at app startup
2. **Check before re-initializing** - Use `isLoggerInitialized()` to check if already initialized
3. **Update don't overwrite** - Use `updateLoggerConfig()` to add transports after initialization
4. **Electron first, Browser second** - In Electron apps, initialize in main process first

### Initialization Order

#### 1. Standalone Browser Application

```typescript
// In your app entry point (e.g., main.tsx or app.ts)
import {initializeLogger, LogLevel} from '@wireapp/logger';

// Initialize ONCE at app startup
initializeLogger(
  {platform: 'browser', deployment: 'production'},
  {
    transports: {
      console: {
        enabled: true,
        level: LogLevel.WARN,
      },
      datadog: {
        enabled: true,
        level: LogLevel.INFO,
        clientToken: process.env.DATADOG_CLIENT_TOKEN!,
        applicationId: process.env.DATADOG_APPLICATION_ID!,
        site: 'datadoghq.eu',
        service: 'webapp',
        forwardConsoleLogs: false, // CRITICAL: Never forward console logs
      },
    },
  },
);

// Later, anywhere in your app
import {getLogger} from '@wireapp/logger';
const logger = getLogger('MyComponent');
logger.production.info('App started');
```

#### 2. Electron Application (Recommended Pattern)

**Step 1: Initialize in Electron Main Process (FIRST)**

```typescript
// In Electron main process (main.js / main.ts)
import {initializeLogger, LogLevel} from '@wireapp/logger';

initializeLogger(
  {platform: 'electron', deployment: 'production'},
  {
    transports: {
      console: {
        enabled: true,
        level: LogLevel.WARN,
      },
      file: {
        enabled: true,
        level: LogLevel.DEBUG,
        path: './logs/electron.log',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        format: 'json',
      },
    },
  },
);

// Config is now stored in globalThis - shared with renderer process
```

**Step 2: Update Config in Renderer Process (SECOND)**

```typescript
// In webapp renderer (e.g., main.tsx or app.ts)
import {initializeLogger, updateLoggerConfig, isLoggerInitialized, LogLevel} from '@wireapp/logger';

// Check if already initialized (from Electron main process)
if (!isLoggerInitialized()) {
  // Fallback: Initialize if running standalone (not in Electron)
  initializeLogger(
    {platform: 'browser', deployment: 'production'},
    {
      transports: {
        console: {enabled: true, level: LogLevel.WARN},
      },
    },
  );
}

// Add Datadog transport to existing config (preserves FileTransport from Electron)
if (config.dataDog?.applicationId && config.dataDog?.clientToken) {
  updateLoggerConfig({
    transports: {
      datadog: {
        enabled: true,
        level: LogLevel.INFO,
        clientToken: config.dataDog.clientToken,
        applicationId: config.dataDog.applicationId,
        site: 'datadoghq.eu',
        service: 'webapp',
        forwardConsoleLogs: false,
      },
    },
  });
}
```

**Step 3: Use Logger Anywhere**

```typescript
// In any file (Electron main, renderer, or standalone)
import {getLogger} from '@wireapp/logger';

const logger = getLogger('MyComponent');
logger.production.info('This works everywhere!');
```

### Why This Order Matters

1. **Electron main process** initializes with FileTransport for persistent logging
2. Config stored in `globalThis[Symbol.for('@wireapp/logger:globalConfig')]` (shared across contexts)
3. **Renderer process** checks `isLoggerInitialized()` → returns `true` (config exists)
4. Renderer calls `updateLoggerConfig()` to **ADD** Datadog (doesn't overwrite)
5. **Result**: Both FileTransport (Electron) and DatadogTransport (webapp) are active ✅

### Global Singleton Pattern (Electron + Browser)

The logger uses `globalThis` with `Symbol.for()` to ensure a **single shared instance** across all contexts:

- **Symbol key**: `Symbol.for('@wireapp/logger:globalConfig')` - Same symbol across all realms
- **Shared registry**: Logger instances, configuration, and buffer are all shared
- **Initialize-once guard**: `initialize()` refuses to re-initialize if already called
- **Safe updates**: `updateLoggerConfig()` merges transports instead of replacing them

**Key Benefits**:

- **Single Source of Truth**: Configuration set in Electron is available in Browser context
- **No Duplicate Instances**: Logger registry, config, and buffer are shared via `globalThis`
- **FileTransport Preserved**: Electron's FileLogger remains active when webapp adds Datadog
- **Type Safety**: Full TypeScript support across all contexts

## API

### Production Logging

Production logs are explicitly marked as safe and can be sent to Datadog:

```typescript
logger.production.info(message: string, context?: LogContext): void;
logger.production.warn(message: string, context?: LogContext): void;
logger.production.error(message: string, error?: Error, context?: LogContext): void;
```

**Only these methods send logs to Datadog.**

### Development Logging

Development logs are never sent to Datadog:

```typescript
logger.development.info(message: string, context?: LogContext): void;
logger.development.warn(message: string, context?: LogContext): void;
logger.development.error(message: string, error?: Error, context?: LogContext): void;
logger.development.debug(message: string, context?: LogContext): void;
logger.development.trace(message: string, context?: LogContext): void;
```

### Debug Logging Control

Control which loggers output to the console via localStorage `debug` key (used by `logdown`):

```typescript
import {enableDebugLogging, disableDebugLogging, getDebugLogging} from '@wireapp/logger';

// Enable all logs via URL parameter: ?enableLogging=*
enableDebugLogging({urlParams: window.location.search});

// Enable specific namespace
enableDebugLogging({namespace: '@wireapp/webapp/calling'});

// Enable all logs (useful for feature flags)
enableDebugLogging({force: true});

// Disable debug logging
disableDebugLogging();

// Get current debug configuration
const currentDebug = getDebugLogging(); // Returns namespace or null
```

**Common patterns**:

- `*` - Enable all loggers
- `@wireapp/webapp/*` - Enable all webapp loggers
- `@wireapp/webapp/calling` - Enable only calling logs
- `@wireapp/webapp/avs` - Enable only AVS logs

**Integration with Wire webapp**:

```typescript
import {enableLogging} from 'Util/Logger';

// Reads ?enableLogging parameter and feature flags
enableLogging(config);
```

### AVS Log Filtering

AVS (Audio Video Signaling) logs are very verbose and filtered by default in production transports (DataDog, File).

**Allowed AVS messages** (all others filtered):

- `ccall_hash_user`
- `c3_message_recv` / `c3_message_send`
- `dce_message_recv` / `dce_message_send`
- `WAPI wcall: create userid`

```typescript
import {isAllowedAVSLog} from '@wireapp/logger';

// Check if an AVS log should be allowed
if (isAllowedAVSLog(message)) {
  // This message will be sent to production transports
}
```

**Usage**: Automatically applied in DataDog and File transports. No manual filtering needed.

### Configuration Management

```typescript
import {
  initializeLogger,
  updateLoggerConfig,
  getLoggerConfig,
  isLoggerInitialized,
  resetLoggerConfig, // For testing only
} from '@wireapp/logger';

// Initialize once at startup
initializeLogger({platform: 'browser', deployment: 'production'}, config);

// Check if initialized
if (isLoggerInitialized()) {
  // Already configured
}

// Update configuration (merges with existing)
updateLoggerConfig({
  transports: {
    datadog: {enabled: true /* ... */},
  },
});

// Get current configuration
const currentConfig = getLoggerConfig();

// Reset (testing only)
resetLoggerConfig();
```

### Configuration Options

All configuration is externally customizable:

```typescript
import {LoggerConfig, LogLevel, SafetyLevel, PRODUCTION_CONTEXT_WHITELIST} from '@wireapp/logger';

const config: Partial<LoggerConfig> = {
  environment: 'production',
  safetyLevel: SafetyLevel.SAFE,
  logLevel: LogLevel.INFO,
  transports: {
    console: {
      enabled: true,
      level: LogLevel.WARN,
    },
    file: {
      enabled: false,
      level: LogLevel.DEBUG,
      path: './logs/app.log',
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: 'json',
      runtimeEnvironment: {
        platform: 'electron',
        deployment: 'production',
      },
    },
    datadog: {
      enabled: true,
      level: LogLevel.INFO,
      clientToken: 'your-datadog-client-token',
      applicationId: 'your-datadog-application-id',
      site: 'datadoghq.eu',
      service: 'wire-webapp',
      forwardConsoleLogs: false, // CRITICAL: Never forward console logs
    },
  },
  contextWhitelist: PRODUCTION_CONTEXT_WHITELIST,
};

initializeLogger({platform: 'browser', deployment: 'production'}, config);
```

#### Customizing Context Whitelist

Extend the default whitelist with custom keys:

```typescript
import {PRODUCTION_CONTEXT_WHITELIST, updateLoggerConfig} from '@wireapp/logger';

// Extend the whitelist
const customWhitelist = new Set([...PRODUCTION_CONTEXT_WHITELIST, 'requestId', 'conversationDomain', 'teamId']);

updateLoggerConfig({
  contextWhitelist: customWhitelist,
});
```

#### Customizing Sanitization Rules

Add custom sanitization rules or replace the defaults:

```typescript
import {
  DEFAULT_SANITIZATION_RULES,
  WIRE_SPECIFIC_SANITIZATION_RULES,
  SafetyLevel,
  SanitizationRule,
} from '@wireapp/logger';

// Add a custom rule
const customRules: SanitizationRule[] = [
  ...DEFAULT_SANITIZATION_RULES,
  {
    pattern: /custom-secret-[a-z0-9]+/gi,
    replacement: '[CUSTOM_SECRET]',
    appliesTo: [SafetyLevel.SAFE, SafetyLevel.SANITIZED],
  },
];

initializeLogger({platform: 'browser', deployment: 'production'}, {sanitizationRules: customRules});
```

#### Using Presidio Patterns (Recommended)

Use Microsoft Presidio's battle-tested PII patterns instead of maintaining custom regex:

```typescript
import {PresidioLoader, DEFAULT_SANITIZATION_RULES} from '@wireapp/logger';

// Option 1: Load bundled Presidio patterns (19 recognizers for global + DACH)
const presidioJson = require('@wireapp/logger/lib/presidio/presidio-recognizers.json');
const loader = new PresidioLoader();
loader.loadFromJSON(presidioJson);

// Convert to sanitization rules
const presidioRules = loader.toSanitizationRules({
  language: 'en', // Filter by language (optional)
  entityTypes: ['CREDIT_CARD', 'EMAIL_ADDRESS', 'US_SSN'], // Filter by types (optional)
});

// Option 2: Load from remote URL
import {loadPresidioRulesFromURL} from '@wireapp/logger';

const presidioRules = await loadPresidioRulesFromURL(
  'https://your-cdn.com/presidio-patterns.json',
  {language: 'de'}, // German patterns
);

// Merge with default rules
const customRules = [...DEFAULT_SANITIZATION_RULES, ...presidioRules];

initializeLogger({platform: 'browser', deployment: 'production'}, {sanitizationRules: customRules});
```

**Why use Presidio patterns?**

- Expert-maintained patterns from Microsoft
- Multi-language support (20+ languages)
- Regular updates with new PII patterns
- Lower false positives than custom regex
- GDPR/PCI-DSS compliant detection

## Production Context Whitelist

Only these context keys are allowed in production logs:

- `conversationId` - Conversation identifier (auto-truncated)
- `clientId` - Client identifier (auto-truncated)
- `userId` - User identifier (auto-truncated)
- `timestamp` - Event timestamp
- `duration` - Duration in milliseconds
- `errorCode` - Error code
- `status` - HTTP status code
- `protocol` - Protocol name
- `count` - Counter
- `size` - Size in bytes
- `length` - Array or string length
- `correlationId` - Correlation ID
- `sessionId` - Session ID

## Automatic Sanitization

The library automatically sanitizes sensitive data using **Microsoft Presidio** (19 recognizers) + **Wire-specific patterns** (26 patterns) for comprehensive PII protection.

### Pattern Sources

1. **Microsoft Presidio** - Expert-maintained patterns from [github.com/microsoft/presidio](https://github.com/microsoft/presidio)
   - Global patterns: Credit cards, emails, phone numbers, IPs, IBANs, URLs, crypto
   - USA: SSN, passports
   - UK: NHS numbers
   - DACH: German/Austrian/Swiss Tax IDs, VAT IDs, AHV numbers, license plates
   - Spain, Italy: NIF, fiscal codes

2. **Wire-Specific** - Custom patterns for Wire ecosystem
   - UUID masking (partial replacement)
   - Bearer tokens, JWT tokens, API keys (Stripe, AWS)
   - Message content & encryption key masking (context-aware)
   - URL whitelisting (Wire domains)
   - Stack traces, MAC addresses
   - BIC/SWIFT codes, German Commercial Register
   - Context-specific patterns (names, DOB, addresses)

### Global Patterns (Messages & Context)

| Data Type                  | Masked As          | Example                                        |
| -------------------------- | ------------------ | ---------------------------------------------- |
| **Credit Card**            | `[CREDIT_CARD]`    | Visa, Mastercard, Amex, Discover, etc.         |
| **SSN**                    | `[SSN]`            | US Social Security: `123-45-6789`              |
| **UUID**                   | `123e4567***`      | `123e4567-e89b-12d3-a456-426614174000`         |
| **Email**                  | `[EMAIL]`          | `alice@example.com`                            |
| **Phone**                  | `[PHONE]`          | `+1 (555) 123-4567`, `+49 30 12345678`         |
| **IPv4 Address**           | `[IP_ADDRESS]`     | `192.168.1.1`                                  |
| **IPv6 Address**           | `[IP_ADDRESS]`     | `2001:0db8:85a3::8a2e:0370:7334`               |
| **IBAN**                   | `[IBAN]`           | `DE89370400440532013000`                       |
| **BIC/SWIFT**              | `[BIC]`            | `DEUTDEFF500`                                  |
| **MAC Address**            | `[MAC_ADDRESS]`    | `00:1B:44:11:3A:B7`                            |
| **Bitcoin Address**        | `[CRYPTO_ADDRESS]` | `bc1qxy2kgdygjrsqtzq2n0yrf...`                 |
| **Bearer Token**           | `Bearer [TOKEN]`   | `Bearer eyJhbGciOiJIUzI1NiIs...`               |
| **JWT Token**              | `[JWT_TOKEN]`      | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`      |
| **API Keys**               | `[API_KEY]`        | Stripe: `sk_live_...`, Generic: `api_key: ...` |
| **AWS Keys**               | `[AWS_KEY]`        | `AKIAIOSFODNN7EXAMPLE`                         |
| **URLs** (non-whitelisted) | `[URL]`            | `https://example.com/api`                      |
| **Stack Traces**           | `[STACK_FRAME]`    | `at Object.<anonymous> (/app/...)`             |

### DACH-Specific Patterns (Germany, Austria, Switzerland)

| Data Type                | Masked As           | Example                                |
| ------------------------ | ------------------- | -------------------------------------- |
| **German Tax ID**        | `[TAX_ID]`          | Steueridentifikationsnummer: 11 digits |
| **German VAT ID**        | `[VAT_ID]`          | `DE123456789`                          |
| **Austrian VAT ID**      | `[VAT_ID]`          | `ATU12345678`                          |
| **Swiss VAT ID**         | `[VAT_ID]`          | `CHE-123.456.789`                      |
| **Swiss AHV Number**     | `[AHV_NUMBER]`      | `756.1234.5678.97`                     |
| **German License Plate** | `[LICENSE_PLATE]`   | `B-AB 1234`                            |
| **German ID Card**       | `[ID_CARD]`         | Personalausweisnummer                  |
| **Commercial Register**  | `[REGISTER_NUMBER]` | `HRB 12345`                            |

### Context-Specific Patterns (Keys Only)

These patterns only apply when specific keys are used in log context:

| Context Key         | Masked As            | Keys Matched                                                    |
| ------------------- | -------------------- | --------------------------------------------------------------- |
| **Names**           | `[NAME]`             | `name`, `firstName`, `lastName`, `displayName`, `username`      |
| **Dates of Birth**  | `[DATE_OF_BIRTH]`    | `dob`, `dateOfBirth`, `birthDate`, `birthday`                   |
| **Addresses**       | `[ADDRESS]`          | `address`, `street`, `city`, `zipCode`, `postalCode`, `country` |
| **Passports**       | `[PASSPORT]`         | `passport`, `passportNumber`                                    |
| **Insurance**       | `[INSURANCE_NUMBER]` | `insuranceNumber`, `versicherungsnummer`, `krankenversicherung` |
| **Message Content** | `[MESSAGE_CONTENT]`  | `content`, `text`, `message`, `plaintext`                       |
| **Encryption Keys** | `[ENCRYPTED]`        | `key`, `secret`, `private`, `privateKey`                        |

**Whitelisted URLs** (not masked):

- `*.wire.com`
- `*.zinfra.io`
- `*.datadoghq.com`

### Updating Presidio Patterns

Keep your PII detection patterns up-to-date:

```bash
# Update bundled Presidio patterns
yarn presidio:update

# Or manually run the script
node scripts/updatePresidio.js
```

The script includes curated recognizers for:

- **Global entities** (9 recognizers): Credit cards, emails, phone numbers, IPs, IBANs, URLs, crypto addresses
- **DACH region** (6 recognizers): German/Austrian/Swiss tax IDs, VAT IDs, AHV numbers, license plates
- **USA** (2 recognizers): SSN, passports
- **UK** (1 recognizer): NHS numbers
- **Spain, Italy** (2 recognizers): NIF, fiscal codes

**Total: 19 Presidio recognizers + 26 Wire-specific patterns = 45+ PII patterns**

### Presidio Pattern Metadata

Each Presidio-sourced rule includes tracking metadata:

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

This allows filtering, debugging, and auditing of patterns.

## Support Export

In browser environments, logs are stored in an in-memory ring buffer (5000 log limit).

### Installing wireDebug Helpers

```typescript
import {installWireLoggingHelper} from '@wireapp/logger';

// Install in browser (typically in your app initialization)
if (typeof window !== 'undefined') {
  installWireLoggingHelper();
}
```

### Using wireDebug in Browser Console

```javascript
// Export all logs as JSON
window.wireDebug.exportLogs();

// Copy logs to clipboard
window.wireDebug.copyLogsToClipboard();

// Get Datadog session info for correlation
window.wireDebug.getDatadogInfo();
// Returns: {sessionId: 'xxx', rumEnabled: true, logCount: 1234}

// Get log statistics
window.wireDebug.getLogStats();
// Returns: {totalLogs: 1234, bufferSize: 5000, oldestLog: '...', newestLog: '...'}

// Clear log buffer
window.wireDebug.clearLogs();
```

## Production Console Override

Prevent accidental data leaks via `console.log` in production:

```typescript
import {installConsoleOverride} from '@wireapp/logger';

// Install console override (only active in production)
if (process.env.NODE_ENV === 'production') {
  installConsoleOverride();
}
```

**What it does:**

- Silences `console.log`, `console.info`, `console.debug`, `console.trace`
- Preserves `console.warn` and `console.error`
- Sends `console.error` to Datadog RUM for tracking
- Only activates in `NODE_ENV=production`

```typescript
// Check if override is active
import {isConsoleOverrideActive, getConsoleOverrideInfo} from '@wireapp/logger';

console.log(isConsoleOverrideActive()); // true in production

console.log(getConsoleOverrideInfo());
// {
//   active: true,
//   environment: 'production',
//   silencedMethods: ['log', 'info', 'debug', 'trace'],
//   preservedMethods: ['warn', 'error']
// }
```

## Security Guarantees

1. **No Data Leaks** - All sensitive data is automatically sanitized
2. **Explicit Production Marking** - Only `logger.production.*` methods send to Datadog
3. **No Console Forwarding** - `forwardConsoleLogs` is always `false` (CRITICAL)
4. **Console Override** - `console.log` silenced in production to prevent leaks
5. **Context Whitelist** - Unknown keys are silently dropped from production logs
6. **Defense in Depth** - Sanitization happens at multiple layers
7. **Global Singleton Protection** - Config cannot be overwritten, only updated via `updateLoggerConfig()`

## Best Practices

### DO - Safe Logging

```typescript
// ✅ SAFE: Production logs with whitelisted context
logger.production.info('API call', {endpoint: '/v3/users'});
logger.production.warn('API slow', {duration: 5000});
logger.production.error('API failed', {errorCode: 'NETWORK_ERROR'});

// ✅ SAFE: Development logs for debugging
logger.development.debug('Processing message', {messageId: '123***'});
logger.development.trace('Flow step', {step: 1});
```

### DON'T - Unsafe Logging

```typescript
// ❌ NOT SAFE: Direct console.log (bypasses sanitization)
console.log('User logged in', user); // Goes to Datadog with NO sanitization!

// ❌ NOT SAFE: Message content in production logs
logger.production.info('Message sent', {content: 'Hello world'}); // Leaks message content!

// ❌ NOT SAFE: User PII in production logs
logger.production.info('User logged in', {email: 'alice@example.com'}); // Leaks email!

// ❌ NOT SAFE: Decrypted content
logger.production.error('Decryption failed', {plaintext: 'Secret message...'}); // Leaks decrypted content!

// ❌ NOT SAFE: Encryption keys
logger.production.debug('Key generated', {privateKey: '0x123...'}); // Leaks key material!

// ❌ NOT SAFE: Access tokens
logger.production.info('API call', {authorization: 'Bearer eyJhb...'}); // Leaks token!
```

## Configuration Options

### Environment

- `development` - Full logging, no Datadog
- `production` - Filtered logging, Datadog enabled

### Log Levels

```typescript
enum LogLevel {
  TRACE = 0, // Most verbose
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5, // Most severe
}
```

## Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Run in watch mode
yarn test:watch

# Run via Nx (from workspace root)
nx test logging
nx test logging --coverage
```

## License

GPL-3.0
