# Logging Performance, Volume, Persistence & Delivery

## Use this reference when

Read this file for logging overhead, hot paths, stacks, queues, batching, retries, local persistence, lifecycle flushes, offline delivery, or startup logging.

## Performance model

"Async logging" only moves later sink I/O. Callsite work can still be synchronous:

- interpolation
- `toString`
- Map/List construction
- JSON encoding
- sanitizer traversal
- stack capture

Therefore filter/sample before expensive construction.

## Hot-path logging

Treat these as high-frequency risk areas:

- `build`
- layout/paint
- animation ticks
- scroll callbacks
- frame callbacks
- streams
- socket/sensor events
- tight loops

Prefer metrics, aggregation, traces, sampling, or rate limiting.

## Stack cost

Attach useful existing stacks to real errors. Do not collect a stack on every low-severity event.

## Bounded queues

Every in-memory/persistent queue needs explicit limits.

Define:

- max entries
- max bytes when practical
- severity-aware drop policy
- age/expiry
- queue depth observability

An outage must not turn into an application OOM.

## Remote delivery

Avoid one network request per event.

Prefer bounded batching with bounded retry/backoff/jitter and an offline policy.

Crash-reporting vendors often already optimize their own transport. Do not duplicate that pipeline without a need for general remote logs.

## Lifecycle flush

App pause/background callbacks do not guarantee process survival on Android/iOS. Treat flush-on-pause as best effort.

If durable background delivery is an explicit requirement:

- Android: evaluate WorkManager-style persistent scheduling; Android documents log/analytics upload as a valid use case.
- Apple: evaluate system-managed background transfer mechanisms such as background URLSession where appropriate.

Do not add durable scheduling for ordinary telemetry by default.

## Local persistence

Persistent log files are a product/operations requirement, not a default.

If used, define finite:

- total bytes
- file count
- age
- rotation
- deletion
- export security
- account/logout behavior

There is no universal correct "5 files / 10 MB / 7 days" policy.

## Startup logging

Startup is latency-sensitive. Keep early events small and useful:

- release/build identity
- environment selection
- initialization outcome
- migration failure

Avoid synchronous file flushes, remote upload, giant configuration serialization, or verbose startup dumps before first meaningful UI.

Use Timeline instrumentation for startup performance.

## Sampling/rate posture

Research-derived default posture:

- Trace: disabled or heavily sampled.
- Debug: disabled production.
- Info: low volume; sample repeated high-rate events.
- Warn: generally retain, rate-limit storms.
- Error: retain unique failures, dedupe repeated failures.
- Fatal: attempt to retain/report while still respecting hard limits.

## Benchmarking

Benchmark profile/release-like behavior, not debug console output.

Measure disabled path first:

- lazy builder not called
- expensive serializer not invoked
- minimal allocations

Then enabled path:

- event construction
- sanitizer
- enqueue
- persistence/transport as applicable
