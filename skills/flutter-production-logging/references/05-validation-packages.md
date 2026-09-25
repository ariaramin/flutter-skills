# Architecture Scenarios, Packages, Testing & CI

## Use this reference when

Read this file when deciding how much logging infrastructure to build, evaluating packages/vendors, designing tests, or creating production release gates.

## Architecture scenarios

### Small app

Use development console/developer events, a small abstraction if useful, Flutter global error hooks, and optionally a crash reporter.

Avoid remote general log infrastructure or rotating files without a requirement.

### Large mobile app

Use structured logger + sanitizer + production policy + bounded breadcrumbs + centralized `ErrorReporter` + vendor adapter. Add batched remote diagnostics only if operations need them.

### Enterprise desktop

Bounded rotating application logs and controlled user/support export can be justified. Add OS-native sinks only when IT/deployment workflow requires them.

### Web

Use development console plus sanitized production remote events if needed. Keep privacy allowlists strict and batches bounded.

### Offline-first

Use bounded memory → bounded persistent batches → upload after connectivity. Define expiry, byte limits, priority drop, retry, logout/privacy semantics.

### High-throughput

Prioritize: pre-filter → lazy construction → aggregation → sampling → rate limiting → batching.

### Privacy-sensitive

Prefer explicit safe fields, fewer event categories, no raw network payloads, shortest useful retention, controlled exports, sanitized crash reporting. Sometimes less telemetry is the correct design.

## Package findings

### `logging`

Research observed version 1.3.0, publisher dart.dev, all six Flutter platforms.

Useful for:

- levels
- hierarchy
- `LogRecord`
- lazy closure messages

It does not itself solve sanitization, persistence, rotation, batching, remote transport, or crash reporting.

### `logger`

Research observed version 2.7.0. Useful for formatting/output ergonomics. It does not replace production privacy/volume/error policy.

### `path_provider`

Research observed version 2.1.6 with Android/iOS/Linux/macOS/Windows support, not Web. Useful only when native local persistence is actually needed.

### Crash vendors

Research examples:

- `firebase_crashlytics`: Android/iOS/macOS in the observed metadata.
- `sentry_flutter`: all six Flutter platforms in the observed metadata, with platform/native behavior varying.

Re-check current versions/platform support. Keep crash vendors behind an application adapter.

## Testing

Use fake sinks and structured assertions.

Test:

- filtering
- severity
- lazy evaluation
- sanitizer/redaction
- structured event fields
- stack handling
- queue bounds
- drop policy
- dedupe/rate limiting
- recursion prevention
- sink exceptions
- error-hook integration
- isolate forwarding
- no duplicate vendor upload
- file rotation/retention if used
- remote backoff/offline behavior if used
- logout/account-scope cleanup

Formatting tests are separate from event-contract tests.

## CI/release checks

Use repository-appropriate checks such as:

- `avoid_print`
- inventory raw `debugPrint`
- inventory HTTP/network interceptors
- secret scanning
- forbidden sensitive field tests
- production log-level tests
- synthetic redaction canaries
- crash symbol/source-map setup checks

Logging defects are release/security defects, not merely style issues.

## Anti-myths

Do not repeat these claims:

- `debugPrint` disappears in release.
- `debugPrintSynchronously` is the fast production alternative.
- `developer.log` is a remote backend.
- `FlutterError.onError` catches every application error.
- `PlatformDispatcher.onError` catches child-isolate errors.
- every app must use `runZonedGuarded`.
- async sinks make logging free.
- disabled log calls have zero cost automatically.
- every log needs a stack.
- more logs always improve diagnosis.
- raw production HTTP bodies are good telemetry.
- Logcat/browser console are private.
- R8 removes Dart logger calls by magic.
- one request per event is a sound remote design.
- error queues can be unbounded because errors are important.
- lifecycle pause guarantees final upload.
- client-side audit logs are authoritative.
- Windows Event Log should receive all Flutter debug events.
- a popular logger package is mandatory.
- crash reporting, logging, analytics, metrics, and tracing are interchangeable.
