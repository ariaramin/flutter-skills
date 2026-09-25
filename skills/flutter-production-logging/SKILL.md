---
name: flutter-production-logging
description: Design, implement, review, optimize, secure, test, and troubleshoot production logging and error-reporting architecture in Flutter/Dart across Android, iOS, macOS, Windows, Linux, and Web. Use this skill whenever Flutter work mentions logging, print/debugPrint/developer.log, structured logs, crash reporting, FlutterError.onError, PlatformDispatcher.onError, runZonedGuarded, isolate errors, breadcrumbs, redaction, PII/secrets in logs, log files, remote log upload, sampling/rate limiting, logging performance, HTTP interceptor logging, Sentry/Crashlytics, production diagnostics, observability, or “make logging production-ready,” even if the request is framed as debugging, error handling, performance, or release cleanup.
---

# Flutter Production Logging
Build logging as a bounded observability subsystem, not a collection of print statements. Optimize for diagnostic value, privacy, predictable resource use, runtime safety, and maintainability.

## Operating rules
1. Inspect existing logging, error capture, crash reporting, interceptors, and release configuration before replacing anything.
2. Separate **logs**, **errors/crashes**, **metrics**, **traces**, **analytics**, and **authoritative audit records**. They solve different problems.
3. Treat `print` as console output, not a production logging architecture.
4. Remember that `debugPrint` still logs in release; gate development-only calls deliberately.
5. Prefer stable structured events over long formatted strings.
6. Filter/sample before expensive construction. Make debug/trace payloads lazy.
7. Sanitize before every sink. Never rely on a console, vendor, native logger, file, or transport to make unsafe data safe.
8. Never log credentials, tokens, cookies, private keys, recovery codes, server secrets, signed URLs, or raw sensitive request/response payloads.
9. Preserve original error stacks for real failures when available; do not collect fresh stacks for routine events.
10. Route framework, root-isolate, child-isolate, zone, and manually caught failures through one application reporting gateway to avoid duplicate uploads.
11. Logging an exception does not mean it was handled. Keep recovery/propagation semantics explicit.
12. Make logging fail-safe: sink failures, serialization failures, disk-full conditions, or backend outages must not break business logic.
13. Bound every queue, disk store, batch, and retry sequence. High severity never justifies unbounded memory.
14. Do not send one network request per log event. Batch remote diagnostics only when they provide real operational value.
15. Treat lifecycle flushes as best-effort unless an OS-managed durable background mechanism is explicitly required.
16. Avoid uncontrolled logging in `build`, layout/paint, animation ticks, scroll callbacks, high-rate streams, sockets, sensors, or hot loops.
17. Use DevTools/Timeline/metrics for performance investigation instead of high-volume text logs.
18. Keep event names stable; dynamic values belong in fields when justified.
19. Do not use `runtimeType.toString()` as a durable event/error category.
20. Add a package only for a demonstrated capability gap. Pretty console formatting is not a production observability strategy.
21. Benchmark disabled and enabled logging in profile/release-like conditions, not debug console mode.
22. Treat platform-native logging as optional deployment integration, not a mandatory mirror of every Dart event.
23. Treat browser console output as visible to the user.
24. Never make client logs the sole authoritative security/compliance audit trail.

## Research baseline and freshness
The bundled research was validated on 2026-08-09 against Flutter documentation reflecting 3.44.7 and Dart API documentation reflecting 3.12.2. Inspect the repository's actual SDK and re-check current docs for version-sensitive error hooks, DevTools behavior, isolate semantics, platform background execution, and package/vendor support.

Use `references/06-research-findings.md` for the full evidence-backed conclusions and `references/07-research-sources.md` for primary source attribution.

## Reference routing
| Need | Read |
|---|---|
| Logger API, event schema, severity, lazy construction, signal separation | `references/01-architecture-events.md` |
| Flutter/root/child-isolate errors, zones, dedupe, crash adapters | `references/02-errors-reporting.md` |
| Hot-path cost, queues, batching, retries, persistence, lifecycle delivery | `references/03-performance-delivery.md` |
| Secrets/PII, network logging, Android/Apple/Windows/Linux/Web behavior | `references/04-security-platforms.md` |
| Package choices, architecture scenarios, tests, CI/release checks | `references/05-validation-packages.md` |
| Full source-derived findings | `references/06-research-findings.md` |
| Full source catalog | `references/07-research-sources.md` |

# Workflow
## 1. Inspect the repository
Inventory current behavior before designing a replacement.

Search for:

```text
print(
debugPrint(
debugPrintSynchronously(
developer.log(
FlutterError.onError
PlatformDispatcher.instance.onError
runZoned / runZonedGuarded
Isolate.addErrorListener
logger packages
HTTP interceptors
crash SDK calls
analytics SDK calls
local log files
custom queues/sinks
```

Also record:

- Flutter/Dart versions and target platforms
- current crash/observability vendor
- privacy/data-classification constraints
- network/authentication stack
- lifecycle/background scheduling
- local storage
- production logging flags and CI checks

Do not create a second reporting pipeline when the existing one can be corrected.

## 2. Define the requirement
For each diagnostic capability state:

- event/failure to diagnose
- consumer: developer, support, operations, security, crash triage
- severity
- safe fields
- correlation requirement
- expected frequency
- persistence/remote-delivery requirement
- retention requirement
- acceptable loss behavior
- privacy classification
- performance budget

Prefer the **smallest safe set of structured information that explains important production behavior**.

## 3. Choose the correct signal
Use:

- **logs** for discrete diagnostic events
- **metrics** for aggregated counts, rates, queue depth, latency distributions
- **traces/timeline** for execution paths and performance spans
- **crash/error reporting** for exceptions/fatal and nonfatal failures
- **analytics** for product/user behavior
- **trusted backend/platform systems** for authoritative audit records

Do not emit high-frequency text logs when another signal is the actual requirement.

## 4. Define a structured event contract
Prefer fields such as:

```text
eventName
severity
timestamp
component
operation
safe message/description
error category
original error/stack when appropriate
request/correlation ID when justified
sanitized structured fields
```

Good event names:

```text
cache.read.failed
auth.refresh.failed
sync.batch.completed
```

Do not put timestamps, UUIDs, user IDs, raw URLs, or exception text into the event name.

## 5. Filter before work
Preferred path:

```text
level/category enabled?
→ sample/rate decision
→ lazily construct expensive fields
→ sanitize
→ enqueue/route
```

Avoid eager work such as:

```dart
logger.debug(jsonEncode(expensiveModel.toJson()));
```

when the event may be dropped.

Prefer logger APIs that accept lazy builders/closures for expensive content.

## 6. Make sanitization the central boundary
Sanitize before console, file, crash SDK, breadcrumbs, native logging, or remote transport.

Prefer explicit allowlisted safe fields in sensitive domains.

Always reject/redact:

- passwords
- access/refresh tokens
- Authorization
- Cookie / Set-Cookie
- private keys
- recovery codes
- payment secrets
- signed query tokens
- raw sensitive bodies

Treat `error.toString()` and network exception messages as untrusted log input. Apply length and collection-depth/size limits.

## 7. Design the application logger boundary
For medium/large apps prefer:

```text
Feature code
   ↓
AppLogger
   ↓
cheap policy + lazy context
   ↓
LogSanitizer
   ↓
sampling / rate / dedupe
   ↓
bounded dispatcher
   ├─ developer sink
   ├─ bounded breadcrumbs
   ├─ optional rotating local sink
   └─ optional batched remote sink
```

Keep the application API independent from any specific vendor where replacement/testing value exists.

## 8. Design error reporting separately
Use one gateway:

```text
FlutterError.onError --------\
PlatformDispatcher.onError ---+→ ErrorReporter
zone handler -----------------+
child-isolate forwarding -----+
caught important errors ------/
                               ↓
                    normalize + sanitize
                               ↓
                     dedupe + severity
                               ↓
                      crash backend
```

Key rules:

- `FlutterError.onError` covers framework-routed failures.
- `PlatformDispatcher.instance.onError` covers uncaught root-isolate errors outside that path.
- `PlatformDispatcher.onError` does not directly cover child isolates.
- Child-isolate error capture must be installed explicitly when required.
- Use `runZonedGuarded` only when deliberate error-zone semantics are needed.
- Preserve useful original stacks.
- Trace vendor auto-capture plus manual capture to prevent duplicates.

## 9. Keep error semantics explicit
After recording an error, deliberately choose one:

```text
recover
retry
translate to application failure
propagate/rethrow
fail the operation
```

Do not swallow a failure merely because it was logged.

## 10. Make the logging subsystem fail-safe
Every sink must isolate its own failures.

Require:

- sink exceptions caught internally
- no change to business result
- reentrancy/recursive-reporting protection
- minimal fallback that bypasses the main logger
- bounded retry
- safe handling for serialization/disk/network failure

Observability failure should reduce diagnostics, not application reliability.

## 11. Bound volume and storage
For every queue/buffer define:

- max entries
- max bytes when practical
- severity-aware drop policy
- expiry/age
- queue-depth diagnostics

Default posture from the research:

```text
Trace → usually disabled/heavily sampled
Debug → disabled production
Info  → low volume; sample repeated events
Warn  → retain, rate-limit storms
Error → retain unique failures; dedupe repeats
Fatal → attempt to retain/report within hard limits
```

High priority means “drop last,” not “allocate forever.”

## 12. Add remote delivery only when justified
Avoid per-event network uploads.

Prefer:

```text
bounded batch
→ async upload
→ bounded backoff/jitter retry
→ remove on success
→ retain on failure only within limits
```

Define offline, auth-expiry, backend-outage, queue-full, termination, logout, and privacy-deletion behavior.

If durable background delivery is a real requirement, use platform-appropriate OS-managed mechanisms rather than assuming a Dart Future survives process death. See `references/03-performance-delivery.md`.

## 13. Persist locally only for a real requirement
Local rotating files are appropriate for cases such as enterprise desktop support or offline diagnostics, not as a default mobile architecture.

Define finite:

- total bytes
- files
- age
- rotation
- deletion
- export control
- account/logout behavior

Do not assume native filesystem persistence works identically on Web.

## 14. Use a safe network log schema
Prefer:

```text
method
service/host
route template
status
latency
request ID
retry count
outcome/error category
encoded size when useful
```

Avoid raw headers/bodies and signed query parameters.

## 15. Protect hot paths and startup
Avoid uncontrolled logging in rendering or high-rate callbacks.

For startup, keep only small useful events such as build/environment identity and initialization/migration outcomes. Do not synchronously open/flush large files, upload logs, or serialize giant configuration trees before first meaningful UI.

Use Timeline/DevTools for performance timing.

## 16. Preserve profile-mode representativeness
Prefer `kDebugMode` or assertions for development-only logging.

Do not assume:

- `debugPrint` disappears in release
- `debugPrintSynchronously` is the production-fast alternative
- R8 strips Dart logger calls automatically

Benchmark real production logging policy in profile/release-like conditions.

## 17. Apply platform behavior intentionally
### Android
Treat Logcat as potentially exposing sensitive information. Sanitize first. Use native logging primarily when native/plugin diagnostics require it.

### Apple
Apple unified logging privacy controls do not automatically sanitize Dart console/file/remote logs. Keep Dart sanitization centralized.

### Windows
Do not use Windows Event Log as a high-volume general trace sink. Use it only for significant events when deployment/support requirements justify it.

### Linux
Systemd-managed stdout/stderr can naturally reach journald; ordinary GUI apps may not run in that environment. Add journal integration only when required.

### Web
Assume browser console is visible to the user. Minification is not confidentiality. Use browser tooling for Web performance profiling.

## 18. Add packages only for capability gaps
From the researched package set:

- `logging`: useful levels/hierarchy/`LogRecord`/lazy closures; not a complete production pipeline.
- `logger`: ergonomic formatting/output; does not solve privacy, retention, batching, or error capture.
- `path_provider`: useful for native local-file locations when needed; not a Web filesystem abstraction.
- Crashlytics/Sentry: crash/observability vendors with different platform coverage; keep behind an app adapter.

Re-check current versions/platform support before adoption.

## 19. Test behavior, not pretty output
Use fake sinks and verify:

- filtering/severity
- lazy builder not invoked when disabled
- event name/fields
- redaction and exception sanitization
- field size limits
- sampling/rate limits/deduplication
- queue-full policy
- sink failure isolation
- recursion guard
- framework/root/child-isolate routing
- no duplicate crash upload
- local rotation/retention if used
- remote retry/offline behavior if used
- logout/account-scope cleanup

Keep formatting tests separate from event-contract tests.

## 20. Add CI/release guards
Useful checks include:

- `avoid_print`
- raw `debugPrint` inventory
- HTTP interceptor inventory
- secret scanning
- forbidden sensitive field tests
- production logging-policy tests
- synthetic redaction canaries
- crash symbol/source-map checks for selected vendors

Linting alone does not prove logs are safe.

# Anti-patterns
Reject by default:

```text
print/debugPrint everywhere
raw HTTP body/header logging
stack trace on every low-severity event
one request per log
unbounded error queue or log files
retry forever
flush-on-pause as a durability guarantee
runZonedGuarded because every app "should" use it
multiple global crash upload paths
logging-and-swallowing errors
remote switches that can disable sanitization
client logs as authoritative audit trail
native logging mirror for every Dart event
Windows Event Log as routine debug stream
browser console as private storage
logger package chosen only for pretty output
debug-console logger benchmarks as production evidence
```

# Production definition of done
A production logging system is ready when relevant conditions are true:

## Architecture
- structured stable event contract exists
- signal boundaries are clear
- vendor coupling is contained where useful

## Security/privacy
- sanitizer precedes every sink
- safe-field allowlists are used where sensitivity warrants
- credentials and sensitive payloads are absent
- exceptions/network metadata are sanitized
- client ingestion credentials are scoped appropriately

## Performance/reliability
- disabled logs avoid expensive construction
- hot paths have controlled event volume
- stack collection is intentional
- sinks cannot break business logic
- recursion is prevented
- queues/storage/retries are bounded

## Errors
- framework/root-isolate coverage is correct
- child-isolate coverage exists when workers are used
- duplicate uploads are prevented
- original stacks are preserved
- logging does not replace recovery/propagation semantics

## Platform
- native sinks exist only when operationally justified
- Web console is treated as public
- persistence is platform-appropriate
- durable background delivery follows real OS capabilities when required

## Validation
- fake-sink structured tests pass
- redaction tests pass
- overflow/sink-failure tests pass
- production logging configuration is verified
- CI inventories uncontrolled logging paths
- dependency/vendor versions are current when used

Never claim that more logs mean better observability. Prefer the smallest safe set of structured events that explains production behavior.
