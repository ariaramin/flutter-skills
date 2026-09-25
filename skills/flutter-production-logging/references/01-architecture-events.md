# Logging Architecture & Event Design

## Use this reference when

Read this file when designing the logger API, event schema, severity policy, context model, lazy construction, or signal separation.

## Core architecture

Flutter/Dart expose primitives rather than one complete production logging platform. The researched minimal scalable architecture is:

```text
application logger API
→ filtering
→ lazy construction
→ context
→ sanitization
→ sampling/rate limiting
→ bounded sink routing
```

Optional sinks can provide developer console, breadcrumbs, local files, remote diagnostics, crash reporting, or native-platform integration.

Keep sink/vendor details away from ordinary feature callsites.

## Primitive roles

### `print`

- Native: stdout.
- Web: browser console.
- No severity/structure/redaction/rotation/persistence/remote batching contract.
- Can be intercepted by `Zone.print`.

Use for temporary developer work or intentionally console-oriented programs, not a scalable application logging policy.

### `debugPrint`

- Logs to console even in release.
- Default implementation is throttled.
- Throttling exists to reduce platform log loss; it does not make arbitrary log volume safe.
- Mixed `print`/`debugPrint` output may appear out of order.

Gate development-only calls deliberately with `kDebugMode` or assertions.

### `debugPrintSynchronously`

- Unthrottled.
- Implemented through `print`.
- Documented primarily for tests.

Do not treat it as a production performance optimization.

### `developer.log`

Supports richer event metadata such as level, name, timestamp, error, stack, sequence, and zone and is visible in DevTools Logging.

It is not by itself a persistent/remote/crash-reporting backend.

## Compile-time gating

`kDebugMode`, `kProfileMode`, and `kReleaseMode` are constants. Constant branches can be eliminated.

Prefer `kDebugMode` or assertions for development-only logging. Avoid using `!kReleaseMode` as the default inverse-debug policy when it makes profile behavior significantly different from release.

## Lazy construction

Function arguments are evaluated before a normal call. Expensive serialization can still execute even if the logger drops the event.

Design logger APIs that allow lazy message/field construction:

```text
cheap policy test
→ construct expensive payload only when retained
```

The Dart-maintained `logging` package's closure messages provide direct precedent for this pattern.

## Event schema

Use stable semantic names and structured fields.

Good event names:

```text
cache.read.failed
auth.session.expired
sync.retry.scheduled
```

Dynamic values belong in fields when useful.

Avoid persistent contracts based solely on `runtimeType.toString()`.

## Cardinality

High-cardinality values such as request IDs can be diagnostically useful, but do not promote them into event names or universal indexed dimensions.

## Logs vs other signals

- Logs: discrete events.
- Metrics: aggregated measurements.
- Traces/timeline: execution paths/timing.
- Analytics: product/user behavior.
- Crash reporting: failure diagnostics.
- Audit logs: authoritative security/compliance events, normally server/platform-backed when trust matters.

Do not replace the correct signal with text logging merely because logging is easy.
