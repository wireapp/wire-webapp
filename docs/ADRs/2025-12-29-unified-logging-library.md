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

### Phase 1: Core Library & Initial Integration (Completed)

The core library is complete with production/development API separation, automatic PII sanitization through Microsoft Presidio integration, multi-transport support, global singleton architecture, in-memory buffer, and console override implementation.

Wire webapp integration is complete with a unified Logger module, Datadog and RUM initialization, debug logging control, and widespread adoption across the codebase.

All security features are in place: console log forwarding is disabled, AVS log filtering reduces noise, context key whitelist enforcement protects against unknown data leaks, and defense-in-depth sanitization provides multiple protection layers.

Migration from the old `@wireapp/commons` Logger is complete. Migration from direct console statements is nearly complete—only one console.log remains.

Tooling includes automated Presidio pattern updates via `yarn presidio:update`, which fetches the latest patterns from Microsoft's repository.

Comprehensive documentation covers the library, Presidio integration, and this architectural decision record. Full test coverage validates the implementation.

### Phase 2: Production Validation & Distribution (In Progress)

**Testing & Validation**:
- Test Datadog integration in production environment to verify log delivery, correlation IDs, and RUM integration work correctly
- Test Electron file logging to ensure logs are written to disk with proper rotation and the global singleton pattern works across main and renderer processes
- Verify console override behavior in production builds

**Distribution**:
- Publish library to NPM registry as `@wireapp/logger` for external use and version management
- Establish versioning strategy and release process

**Electron Migration**:
- Remove old file logging implementation from Electron wrapper
- Ensure file transport is initialized first in the Electron main process
- Verify log file location, rotation, and accessibility for support
)

### Phase 3: Development Logging Migration (Not Started)

**Codebase-Wide Migration**:
- Replace all existing logger calls throughout web-packages with `.development.*` methods
- This ensures all current logging is explicitly marked as development-only and will not be sent to Datadog
- Review each logger instance to understand its purpose and appropriate log level

**Rationale**: Start by making all logs development-only to establish a secure baseline. This prevents accidentally sending sensitive data to Datadog while we review what should be production logging.

### Phase 4: Production Logging Strategy (Not Started)

**Define Production Logging Standards**:
- Identify what events and metrics are valuable for production monitoring
- Define which errors require production tracking versus development-only debugging
- Establish guidelines for production log context (what data is safe to include)
- Document production logging patterns and anti-patterns

**Add Production Logging**:
- Systematically add `.production.*` logs for critical events, errors, and metrics
- Focus on operational visibility: API failures, authentication issues, feature usage, performance metrics
- Ensure all production logs contain only whitelisted context keys
- Review each production log for PII safety

**Examples of Production-Worthy Logs**:
- Authentication failures with error codes
- API request failures with status codes and endpoints
- Feature flag activations
- Critical user flows (login, message send, call start)
- Performance metrics (API latency, render times)
- Client configuration issues

### Phase 5: Final Hardening (Not Started)

**Console Override Activation**:
- Activate `installConsoleOverride()` in production builds to silence accidental console.log
- Test in staging environment first

**Remaining Cleanup**:
- Migrate the last console.log statement in MLSConversations
- Final audit of all logging to ensure production/development separation is correct

### Improvements & Enhancements

The following improvements would enhance the library's usability and functionality:

#### Timer API for Performance Measurement

**What**: Console.time/console.timeEnd equivalent that integrates with the logger.

**Why**: Performance measurements often need to correlate with other logs. A timer API that uses the same logger infrastructure would provide better context and ensure timing data is properly sanitized when logged.

**How**:
```typescript
// Start a timer
logger.development.timer.start('apiCall');

// Log intermediate time
logger.development.log('apiCall', 'Request sent'); // Logs elapsed time

// End timer and log final duration
logger.development.timer.end('apiCall'); // Logs total duration
```

**Benefits**:
- Automatic duration calculation
- Consistent formatting across the codebase
- Integration with production/development logging (timing data can be production-safe)
- Correlation IDs can link timers to other log events

#### Log Sampling for High-Volume Scenarios

**What**: Configurable sampling rate to reduce log volume and costs for high-frequency events.

**Why**: Some events (like network requests or render loops) can generate thousands of logs per second. Sending all of these to Datadog is expensive and creates noise. Sampling allows us to capture representative data without overwhelming the system.

**How**:
```typescript
// Sample 10% of logs for this logger
const logger = getLogger('HighVolumeComponent', {sampleRate: 0.1});

// Or configure per-transport
{
  datadog: {
    enabled: true,
    sampleRate: 0.1, // Only send 10% of production logs to Datadog
  }
}
```

**Use Cases**:
- Audio/video signaling logs (already have AVS filtering, sampling would be additional)
- Mouse move or scroll events
- Network request logging in high-traffic scenarios
- Render performance logging
- Websocket message logging

**Benefits**:
- Reduces Datadog costs significantly for high-volume loggers
- Still provides representative data for understanding system behavior
- Can sample differently per environment (100% in staging, 1% in production)
- Sampling decisions made before sanitization, saving processing time

**Implementation Considerations**:
- Sampling happens deterministically (same session always samples or doesn't)
- Or random sampling per log call (different logs from same session)
- Sample rate configurable per logger, per transport, or globally
- Important errors should bypass sampling (ERROR/FATAL always sent)

#### ESLint Rules for Logger Enforcement

**What**: Custom ESLint rules that enforce proper logger usage patterns.

**Why**: Prevent common mistakes before code reaches production. Automated enforcement is more reliable than code review alone.

**Rules**:
- `no-console`: Disallow console.log/info/debug/warn (except in tests)
- `require-production-method`: Prevent accidentally using generic `logger.info()` instead of `logger.production.info()` or `logger.development.info()`
- `no-sensitive-context-keys`: Warn when using non-whitelisted context keys in production logs
- `production-log-review`: Require special comment or annotation for new `.production.*` logs

**Benefits**:
- Catch issues during development, not in production
- Enforce team standards automatically
- Reduce cognitive load in code review
- Build institutional knowledge into tooling

#### Build-Time Log Analysis

**What**: Script that analyzes all log statements during build and generates a report.

**Why**: Understanding what gets logged where helps with security auditing and cost management.

**Output**:
- Count of production vs development logs
- List of all production log context keys used
- Loggers with highest call count (candidates for sampling)
- Production logs that might need review
- Unused loggers

**Benefits**:
- Security audit trail
- Cost estimation for Datadog
- Identify high-volume loggers before they become problems
- Documentation of logging surface area

#### Custom Transport Plugins

**What**: Public API for adding custom transport implementations.

**Why**: Organizations might want to send logs to other destinations beyond Datadog and file (e.g., Sentry, Elasticsearch, custom internal systems).

**How**:
```typescript
class CustomTransport implements Transport {
  log(entry: LogEntry): void {
    // Custom logic
  }
}

updateLoggerConfig({
  transports: {
    custom: new CustomTransport(),
  },
});
```

**Benefits**:
- Flexibility for different deployment scenarios
- Easier testing (mock transport)
- Community contributions
- Gradual migration between monitoring services

#### Structured Error Context

**What**: Helper for extracting safe error context from Error objects.

**Why**: Error objects contain useful debugging information, but they can also contain sensitive data in messages or stack traces. A helper that extracts only safe fields would be useful.

**How**:
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.production.error('Operation failed', error, {
    operation: 'riskyOperation',
    // Error name, code, and sanitized message automatically extracted
  });
}
```

**Benefits**:
- Consistent error logging
- Automatic stack trace sanitization
- Extract error codes and types safely
- Integration with error tracking services

#### Performance Monitoring Integration

**What**: Hooks for integrating with performance monitoring tools beyond Datadog RUM.

**Why**: Some teams use specialized performance monitoring tools (e.g., Sentry, New Relic) and want to correlate logs with performance data.

**How**: Callbacks or events when certain log types occur, allowing integration code to forward data to other systems without coupling the logger to specific services.

**Benefits**:
- Flexible performance monitoring strategy
- Correlate logs with performance traces
- Use best-of-breed tools for different purposes
