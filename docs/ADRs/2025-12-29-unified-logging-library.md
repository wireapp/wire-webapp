# 2025-12-29 - Unified Logging Library (@wireapp/logger)

## Context

The Wire webapp's logging implementation had critical security and operational problems that needed immediate attention.

### Security Vulnerabilities

The existing system automatically forwarded all console logs to Datadog without proper sanitization. This meant that any `console.log` statement—whether from our code or third-party libraries—would send data to external servers without any PII protection. The existing Datadog integration had some UUID and token filters, but these were easily bypassed by using console.log directly.

### Architectural Problems

Multiple logging approaches existed without coordination: direct console statements scattered throughout the code, an older Logger utility from `@wireapp/commons`, and a Datadog integration with limited sanitization. There was no clear distinction between development logging (which can contain sensitive data for debugging) and production logging (which should never contain PII). The system also lacked file logging for the desktop app, meaning logs were lost on crashes.

### Data at Risk

Analysis of existing logging revealed that sensitive data was being logged including error objects with stack traces containing user data, message content, user IDs, email addresses, decryption failures, OAuth tokens, and file paths with personal information.

## Decision

We built a unified, security-first logging library (`@wireapp/logger`) that makes it impossible to accidentally leak sensitive data.

### Explicit Production/Development API

Developers must explicitly choose between production and development logging:

```typescript
// Production logs - can go to Datadog
logger.production.info('API call', {endpoint: '/v3/users'});
logger.production.warn('API slow', {duration: 5000});
logger.production.error('API failed', error, {statusCode: 500});

// Development logs - only for local development and development environments
logger.development.info('Full state dump', {fullState});
logger.development.debug('Processing step', {step: 1});
logger.development.trace('Detailed flow', {details});
```

This explicit choice prevents accidentally logging sensitive debugging data to external services.

### Automatic Multi-Layer Sanitization

All production logs are automatically sanitized through multiple defensive layers—no manual sanitization required.

**Layer 1: Context Key Whitelist**

Only approved keys are allowed in production logs. Identifiers like `conversationId`, `clientId`, and `userId` are automatically truncated. Metadata like `timestamp`, `duration`, `errorCode`, and `status` are allowed. Unknown keys are silently dropped.

**Layer 2: Microsoft Presidio Patterns**

Expert-maintained PII detection patterns from Microsoft's Presidio project detect and mask:
- Global patterns: credit cards, emails, phone numbers, IP addresses, IBANs, URLs, cryptocurrency addresses
- DACH region: German, Austrian, and Swiss tax IDs, VAT IDs, AHV numbers, license plates
- USA: Social Security Numbers, passport numbers
- UK: NHS numbers
- Spain/Italy: NIF and fiscal codes

**Layer 3: Wire-Specific Patterns**

Custom patterns for Wire-specific data:
- UUID masking (partial replacement: `123e4567***`)
- Bearer tokens → `Bearer [TOKEN]`
- JWT tokens → `[JWT_TOKEN]`
- API keys → `[API_KEY]` (Stripe, AWS, generic)
- Message content → `[MESSAGE_CONTENT]`
- Encryption keys → `[ENCRYPTED]`
- URL whitelisting (Wire domains preserved, others masked)
- Stack traces → `[STACK_FRAME]`
- MAC addresses, BIC/SWIFT codes, and context-specific patterns

**Layer 4: Runtime Console Override**

In production, the console override prevents accidental leaks. Direct console.log calls are silenced, console.warn remains visible but isn't forwarded, and console.error goes only to RUM error tracking.

### Global Singleton Architecture

The library uses a global singleton pattern to ensure a single shared configuration across all contexts—Electron main process, Electron renderer, and browser. This means you initialize once and all logger instances share that configuration:

```typescript
// Initialize once (usually at app startup)
initializeLogger({
  environment: 'production',
  transports: {
    file: {enabled: true, path: './logs/app.log'},
  },
});

// Use anywhere without additional configuration
const logger = getLogger('MyComponent');
logger.production.info('Hello!');
```

### Multi-Transport Support

The library supports multiple output destinations:

- **Console Transport**: All logs (development and production) appear in the console with color formatting (based on `logdown`)
- **File Transport**: Electron only, production logs only, with automatic rotation to prevent unbounded growth (electron needs to be initalized with file transport enabled, first in line)
- **Datadog Transport**: Production logs only, with correlation IDs for request tracing
- **In-Memory Buffer**: Browser ring buffer for support export via developer tools

Development logs are never persisted to files or sent to external services.

### Support Export Helpers

Browser console commands make it easy to export logs for debugging:

```javascript
window.wireDebug.exportLogs();           // Export as JSON
window.wireDebug.copyLogsToClipboard(); // One-click copy
window.wireDebug.getDatadogInfo();      // Session ID for correlation
window.wireDebug.clearLogs();           // Clear buffer
```

### Implementation Location

The library lives in `libraries/Logger/` within the monorepo but is also published as `@wireapp/logger` for use outside the Wire webapp. It has minimal dependencies—just `logdown` for colored console output, with optional Datadog peer dependencies.

## Alternatives Considered

### Manual Sanitization Helpers (Rejected)

We considered providing sanitization functions that developers would call manually. This approach was rejected because it's error-prone—developers must remember to sanitize every field, which is easy to forget during urgent bug fixes. There's no compile-time enforcement, and it adds cognitive load.

### Zod Schema Validation (Rejected)

We considered using Zod schemas to validate and transform log context at runtime. This was rejected due to runtime overhead on every log call, complex schema maintenance, and the fact that it doesn't prevent console.log bypasses.

### Single Log Level API (Rejected)

We considered a traditional approach with standard log levels (INFO, DEBUG, etc.) and environment-based filtering. This was rejected because it's not obvious where logs end up—developers might think they're logging locally when data is actually being sent to Datadog. The explicit production/development split makes the destination clear.

## Consequences

### Benefits

**Security**: The library eliminates console.log forwarding to Datadog, automatically sanitizes all data through multiple layers, prevents unknown data leaks via context key whitelist, and catches accidental bypasses through runtime console override.

**PII Protection**: Expert-maintained patterns from Microsoft Presidio provide GDPR and PCI-DSS compliant detection across multiple languages, with special support for DACH region requirements and context-aware masking.

**Developer Experience**: No manual sanitization is needed. The API is self-documenting—`.production.*` versus `.development.*` makes intent clear. TypeScript provides compile-time safety, and support export is available through simple browser commands.

**Operations**: File logging in Electron includes automatic rotation. Correlation IDs enable request tracing across systems. The in-memory buffer facilitates support debugging.

**Maintenance**: The library is published as a standalone npm package. Presidio patterns update automatically via a simple script. The architecture supports custom rules, transports, and patterns.

### Trade-offs

**Adoption**: The team needs to learn the explicit production/development API pattern. The codebase required migration from the old logger (now complete) and from direct console statements (nearly complete).

**Complexity**: The library is more complex than simple console.log. The global singleton pattern requires understanding, though it simplifies usage. Multiple sanitization layers need maintenance, though Presidio patterns auto-update.

**Performance**: Regex sanitization adds some overhead, mitigated by careful pattern design. The in-memory buffer uses minimal memory. Context key filtering happens on every production log.

**Dependencies**: The library adds `logdown` as a dependency and has optional peer dependencies on the Datadog SDK. It requires Node.js 18 or higher.

## References

- **Library README**: [libraries/Logger/README.md](../../libraries/Logger/README.md)
- **Presidio Integration Guide**: [libraries/Logger/docs/presidio-integration.md](../../libraries/Logger/docs/presidio-integration.md)
- **Microsoft Presidio**: https://github.com/microsoft/presidio
- **Datadog Browser SDK**: https://docs.datadoghq.com/logs/log_collection/javascript/

## Security Guarantees

The library provides multiple layers of defense:

1. Console override silences accidental console.log in production
2. Console forwarding to Datadog is explicitly disabled
3. Only explicit production methods send data to Datadog
4. Development logs never persist to files or external services
5. All data passes through multiple sanitization layers
6. Unknown context keys are silently dropped
7. Multiple layers prevent single points of failure
8. Verbose audio/video logs are filtered to reduce noise
9. Production environments warn if logger isn't initialized

## Implementation Status

### Completed (December 2025 - January 2026)

The core library is complete with production/development API separation, automatic PII sanitization through Microsoft Presidio integration, multi-transport support, global singleton architecture, in-memory buffer, and console override implementation.

Wire webapp integration is complete with a unified Logger module, Datadog and RUM initialization, debug logging control, and widespread adoption across the codebase.

All security features are in place: console log forwarding is disabled, AVS log filtering reduces noise, context key whitelist enforcement protects against unknown data leaks, and defense-in-depth sanitization provides multiple protection layers.

Migration from the old `@wireapp/commons` Logger is complete. Migration from direct console statements is nearly complete—only one console.log remains.

Tooling includes automated Presidio pattern updates via `yarn presidio:update`, which fetches the latest patterns from Microsoft's repository.

Comprehensive documentation covers the library, Presidio integration, and this architectural decision record. Full test coverage validates the implementation.

### Remaining Work

The console override code exists but needs activation in production builds. The last remaining console.log statement should be migrated to the new logger.

### Future Enhancements

Optional improvements include log sampling for high-volume scenarios, ESLint rules to enforce logger usage patterns, custom transport plugins, and build-time log statement analysis.
