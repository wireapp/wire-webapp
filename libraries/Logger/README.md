# @wireapp/logger

A security-first logging library for the Wire ecosystem with automatic PII sanitization and multi-transport support.

## Why This Library Exists

The Wire webapp previously forwarded all console logs to Datadog without sanitization, creating a serious security risk. Any `console.log` statement—from our code or third-party libraries—could leak sensitive user data to external servers. This library solves that problem by requiring explicit intent and automatically sanitizing all production logs.

## Key Features

**Security First**: Automatic PII sanitization with no manual calls required. Multiple defensive layers prevent data leaks.

**Explicit Intent**: Developers must choose `.production.*` (goes to Datadog) or `.development.*` (stays local), making it impossible to accidentally log sensitive data.

**Microsoft Presidio Integration**: Expert-maintained PII patterns for credit cards, emails, phone numbers, tax IDs, and more across multiple languages and regions.

**Multi-Transport**: Console (with color formatting), File (Electron only, with rotation), Datadog (with correlation IDs), and in-memory buffer (for support export).

**Global Singleton**: Shared configuration across Electron main process, Electron renderer, and browser contexts.

**Debug Control**: URL parameters and feature flags enable/disable specific loggers without code changes.

## Installation

```bash
yarn add @wireapp/logger
```

## Quick Start

```typescript
import {getLogger} from '@wireapp/logger';

const logger = getLogger('MyComponent');

// Production logs - go to Datadog if configured
logger.production.info('API call successful', {endpoint: '/v3/users'});
logger.production.warn('API slow', {duration: 5000});
logger.production.error('API request failed', error, {statusCode: 500});

// Development logs
logger.development.info('Full state dump', {fullState});
logger.development.debug('Processing step', {step: 1});
logger.development.trace('Detailed flow', {details});
```

## Initialization

### Browser Application

Initialize once at app startup:

```typescript
import {initializeLogger, LogLevel} from '@wireapp/logger';

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
```

Then use the logger anywhere:

```typescript
import {getLogger} from '@wireapp/logger';

const logger = getLogger('MyComponent');
logger.production.info('App started');
```

### Electron Application

Initialize in the main process first, then update configuration in the renderer:

**Electron Main Process:**

```typescript
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
      },
    },
  },
);
```

**Renderer Process:**

```typescript
import {updateLoggerConfig, isLoggerInitialized, LogLevel} from '@wireapp/logger';

// Check if already initialized from Electron
if (!isLoggerInitialized()) {
  // Fallback for standalone mode
  initializeLogger({platform: 'browser', deployment: 'production'}, {});
}

// Add Datadog transport without removing file transport
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
```

## How It Works

### Global Singleton Pattern

The library uses `globalThis` with a symbol to ensure a single shared instance across all JavaScript contexts. When you initialize in the Electron main process, that configuration is available in the renderer process. When you call `updateLoggerConfig()`, it merges transports instead of replacing them.

Benefits:
- Single source of truth for configuration
- No duplicate logger instances
- File transport remains active when webapp adds Datadog
- Full TypeScript support across all contexts

### Automatic Sanitization Layers

**Layer 1: Context Key Whitelist**

Only approved keys are allowed in production logs. Identifiers like `conversationId`, `clientId`, and `userId` are automatically truncated. Metadata like `timestamp`, `duration`, `errorCode`, and `status` are allowed. Everything else is silently dropped.

**Layer 2: Microsoft Presidio Patterns**

Expert-maintained PII detection from Microsoft's Presidio project masks:
- Credit cards, emails, phone numbers, IP addresses, IBANs, URLs, cryptocurrency addresses
- Regional patterns for DACH (German, Austrian, Swiss tax IDs, VAT, AHV, license plates)
- US patterns (Social Security Numbers, passport numbers)
- UK, Spain, and Italy patterns

**Layer 3: Wire-Specific Patterns**

Custom patterns for Wire data:
- UUIDs (partial masking: `123e4567***`)
- Tokens (Bearer, JWT, API keys)
- Message content
- Encryption keys
- Stack traces
- MAC addresses

**Layer 4: Console Override (Production)**

In production environments, direct console.log calls are silenced to prevent accidental leaks. Console.warn remains visible but isn't forwarded. Console.error goes only to RUM error tracking.

## API Reference

### Production Logging

Only these methods send logs to external services:

```typescript
logger.production.info(message, context?);
logger.production.warn(message, context?);
logger.production.error(message, error?, context?);
```

### Development Logging

These methods never leave the dev environment:

```typescript
logger.development.info(message, context?);
logger.development.warn(message, context?);
logger.development.error(message, error?, context?);
logger.development.debug(message, context?);
logger.development.trace(message, context?);
```

### Debug Logging Control

Enable specific loggers via URL parameters or feature flags:

```typescript
import {enableDebugLogging, disableDebugLogging} from '@wireapp/logger';

// Enable via URL parameter: ?enableLogging=*
enableDebugLogging({urlParams: window.location.search});

// Enable specific namespace
enableDebugLogging({namespace: '@wireapp/webapp/calling'});

// Enable all (useful for feature flags)
enableDebugLogging({force: true});

// Disable
disableDebugLogging();
```

Common patterns:
- `*` - All loggers
- `@wireapp/webapp/*` - All webapp loggers
- `@wireapp/webapp/calling` - Only calling logs

### Support Export

Browser console commands for debugging:

```javascript
// Export logs as JSON
window.wireDebug.exportLogs();

// Copy to clipboard
window.wireDebug.copyLogsToClipboard();

// Get Datadog session ID for correlation
window.wireDebug.getDatadogInfo();

// Clear log buffer
window.wireDebug.clearLogs();

// Get buffer statistics
window.wireDebug.getLogStats();
```

### Console Override

Prevent accidental console.log leaks in production:

```typescript
import {installConsoleOverride} from '@wireapp/logger';

if (process.env.NODE_ENV === 'production') {
  installConsoleOverride();
}
```

This silences console.log/info/debug/trace while preserving console.warn and sending console.error to RUM tracking.

### Configuration Management

```typescript
import {
  initializeLogger,
  updateLoggerConfig,
  getLoggerConfig,
  isLoggerInitialized,
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
    datadog: {enabled: true},
  },
});

// Get current configuration
const currentConfig = getLoggerConfig();
```

### AVS Log Filtering

Audio Video Signaling logs are very verbose and automatically filtered in production. Only specific messages are allowed through:
- `ccall_hash_user`
- `c3_message_recv` / `c3_message_send`
- `dce_message_recv` / `dce_message_send`
- `WAPI wcall: create userid`

No manual filtering needed—this happens automatically in Datadog and File transports.

### Datadog User Tracking

Set user ID for Datadog correlation:

```typescript
import {setDatadogUser, getDatadogSessionId} from '@wireapp/logger';

// Set user (ID automatically truncated to 8 characters)
setDatadogUser(userId);

// Get session ID for correlation with Datadog logs
const sessionId = getDatadogSessionId();
```

## Security Best Practices

### Safe Logging ✅

```typescript
// Production logs with whitelisted context
logger.production.info('API call', {endpoint: '/v3/users'});
logger.production.warn('API slow', {duration: 5000});
logger.production.error('API failed', {errorCode: 'NETWORK_ERROR'});

// Development logs for debugging
logger.development.debug('Processing message', {messageId: '123***'});
logger.development.trace('Flow step', {step: 1});
```

### Unsafe Logging ❌

```typescript
// Direct console.log bypasses all sanitization
console.log('User logged in', user);

// Message content in production logs
logger.production.info('Message sent', {content: 'Hello world'});

// User PII in production logs
logger.production.info('User logged in', {email: 'alice@example.com'});

// Decrypted content
logger.production.error('Decryption failed', {plaintext: 'Secret message'});

// Encryption keys
logger.production.debug('Key generated', {privateKey: '0x123...'});

// Access tokens
logger.production.info('API call', {authorization: 'Bearer eyJhb...'});
```

## Security Guarantees

1. All sensitive data is automatically sanitized
2. Only `.production.*` methods send to Datadog
3. Console forwarding is always disabled
4. Console override silences accidental console.log in production
5. Unknown context keys are silently dropped
6. Multiple sanitization layers provide defense in depth
7. Configuration cannot be overwritten, only updated
8. Development logs never persist to files or external services

## Configuration Options

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

### Transport Configuration

**Console Transport**: All logs with color formatting

```typescript
{
  console: {
    enabled: true,
    level: LogLevel.DEBUG,
  }
}
```

**File Transport**: Electron only, production logs only, with rotation

```typescript
{
  file: {
    enabled: true,
    level: LogLevel.DEBUG,
    path: './logs/app.log',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5, // Keep 5 rotated files
  }
}
```

**Datadog Transport**: Production logs only, with correlation

```typescript
{
  datadog: {
    enabled: true,
    level: LogLevel.INFO,
    clientToken: 'YOUR_CLIENT_TOKEN',
    applicationId: 'YOUR_APP_ID',
    site: 'datadoghq.eu',
    service: 'webapp',
    env: 'production',
    version: '1.0.0',
    forwardConsoleLogs: false, // Always false for security
  }
}
```

## Building and Publishing

### Build Commands

```bash
# Clean build output
yarn clean

# Build library (ESM + CJS + TypeScript declarations)
yarn build

# Type check
yarn type-check

# Run tests
yarn test
yarn test:watch
yarn test:coverage

# Lint
yarn lint
yarn lint:fix
```

### Nx Integration

```bash
# From workspace root
nx build logging
nx test logging
nx lint logging
```

### Publishing to NPM

```bash
# Prepare and publish
yarn prepublishOnly
npm publish --access public
```

### Presidio Pattern Updates

Update PII patterns from Microsoft Presidio:

```bash
yarn presidio:update
```

This fetches the latest recognizers from Microsoft's Presidio GitHub repository and updates the bundled patterns.

## Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Run in watch mode
yarn test:watch

# Run via Nx
nx test logging --coverage
```

## License

GPL-3.0 - Wire Swiss GmbH
