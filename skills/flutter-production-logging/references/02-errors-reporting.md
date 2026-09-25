# Error Capture, Crash Reporting & Isolates

## Use this reference when

Read this file when implementing `FlutterError.onError`, `PlatformDispatcher.onError`, zones, child-isolate error capture, crash-reporting adapters, deduplication, or fatal/nonfatal policy.

## Framework errors

Flutter framework-controlled callback failures such as build/layout/paint errors route through `FlutterError.onError`.

Preserve useful `FlutterErrorDetails` information while sanitizing before external reporting.

## Root-isolate uncaught errors

Errors outside Flutter framework callbacks can route through `PlatformDispatcher.instance.onError`.

Installing only `FlutterError.onError` is therefore incomplete for root-isolate error capture.

## Child isolates

`PlatformDispatcher.onError` does not directly capture child-isolate errors.

When worker-isolate diagnostics matter:

- install isolate error listeners deliberately
- attach them early enough to avoid startup races
- forward through the application's reporter
- understand `Isolate.addErrorListener` fallback uses stringified error/stack payloads
- send richer structured worker failures intentionally when classification matters

## Zones

`runZonedGuarded` creates an error zone and handles synchronous body failures plus uncaught asynchronous zone errors.

Error-zone boundaries can change how asynchronous errors propagate. Do not add zones casually or treat them as a mandatory third top-level hook.

## One reporting gateway

Multiple independent capture paths can duplicate one incident:

```text
Flutter handler
PlatformDispatcher
zone handler
vendor auto integration
manual recordError
network/interceptor reporter
```

Route them through one application `ErrorReporter` that:

- normalizes
- sanitizes
- deduplicates
- classifies severity/fatality
- routes to the selected crash backend

## Error semantics

Logging a caught error does not define recovery.

After logging, choose explicit application behavior:

- recover
- retry
- translate to domain failure
- propagate/rethrow
- fail operation

Do not silently return success merely because the failure was logged.

## Original stack traces

Use original caught/framework/worker stacks for real errors where available.

Avoid generating a fresh stack for routine debug/info events because it increases CPU, allocation, event size, and backend cost.

## Deduplication

Normalize dynamic values before fingerprinting.

Useful inputs can include:

- stable error category
- component
- operation
- normalized application stack

Avoid raw messages as the only fingerprint. Avoid exception class alone as the only fingerprint.

## Logger/reporter failure domain

A failing sink must not recurse:

```text
app error
→ reporter
→ sink throws
→ reporter catches sink error
→ sink throws
→ ...
```

Use:

- sink-level try/catch
- reentrancy/reporting guard
- bounded minimal fallback that bypasses the main reporter

Observability failures should degrade diagnostics, not application correctness.
