# Async, Concurrency & Lifecycle

## Dart execution model [D]

Dart concurrency includes:
- asynchronous `Future`/`Stream` APIs on an isolate's event loop;
- isolates for parallel execution with separate memory and message passing.

Do not use an isolate for ordinary network waiting. Async I/O already avoids blocking while waiting.

## Use isolates for CPU-bound work [D/F]

Consider an isolate when measured work can block responsive UI:
- large JSON/data transformations;
- compression/encryption;
- image processing;
- expensive parsing;
- heavy algorithms.

Evaluate transfer/copy/serialization overhead. Small work can be slower when moved.

## Future ownership

A `Future` does not automatically cancel because a widget disappeared.

For async work define:
- owner;
- whether result remains useful after caller disposal;
- stale-result handling;
- cancellation mechanism if the library supports it;
- error sink.

## Stale result race

Example:
```text
query "fl" starts request A
query "flutter" starts request B
B returns first
A returns later
```

Without identity/cancellation, A can overwrite B.

Solutions:
- request generation ID;
- switch/latest semantics in state library;
- cancellation token/client support;
- compare current input before commit.

## Streams

For every subscription:
- who subscribes?
- who cancels?
- single-subscription or broadcast semantics?
- what happens on error?
- what is replay/current-value behavior?
- does listener lifetime match owner scope?

Do not expose a broadcast stream simply to support multiple listeners unless semantics are understood.

## Timers/debounce

Debounce/throttle policy belongs with the feature/presentation owner, not buried in a widget helper.
Dispose timers.
Test with controllable time where practical.

## Widget lifecycle

Do not update local widget state after disposal.
Prefer moving durable feature work to a longer-lived owner rather than adding `mounted` checks everywhere.

If view-local async work truly belongs to the widget, guard lifecycle correctly.

## App lifecycle

Decide whether a feature must react to:
- inactive;
- paused/background;
- resumed;
- detached;
- platform-specific interruptions.

Examples:
- pause camera/location listeners;
- refresh stale content on resume;
- persist drafts before suspension;
- avoid assuming background execution continues indefinitely.

## Background work

Mobile OS rules determine what survives backgrounding.
Use platform-supported schedulers/plugins/services for durable background work.
Do not keep a Dart timer alive and assume it is a job scheduler.

## Platform channels from isolates [F]

Flutter supports some platform-channel use from background isolates, with limitations. Validate the specific plugin/channel capability before architecting around it.

## Fire-and-forget

Use only when:
- loss is acceptable or operation is independently owned;
- errors are captured/logged;
- process death semantics are understood.

Avoid accidental unawaited futures.

## Concurrency review checklist

- Can two commands mutate the same state concurrently?
- Can old response overwrite new intent?
- Can refresh and pagination overlap?
- Can two retries duplicate a write?
- Are streams/subscriptions disposed?
- Is CPU work blocking frames?
- Does background behavior rely on unsupported lifetime assumptions?
- Is there a clear error sink for detached async work?
