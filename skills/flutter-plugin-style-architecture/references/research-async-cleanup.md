# Research: asynchronous ownership and cleanup

Research date: 2026-11-05. The fetched Dart API pages identify Dart 3.13.7; the local validation SDK is Dart 3.13.5. These APIs predate that patch difference. This note records documented facts separately from their architectural application.

## Documented behavior

| Document | Official URL | Verified insight | Architectural relevance |
| --- | --- | --- | --- |
| Future.timeout | https://api.dart.dev/dart-async/Future/timeout.html | The returned timeout future stops waiting; the source future can still complete later. Late values/errors are not results of the timeout future. | A lifecycle timeout is not cancellation. A timed-out initializer can still acquire resources or publish state. |
| StreamSubscription.cancel | https://api.dart.dev/dart-async/StreamSubscription/cancel.html | Cancellation stops delivery and returns a future that completes after source cleanup; cleanup can fail. | Await subscription cancellation before releasing resources it uses. Retain/report unresolved cleanup failures. |
| StreamController.close | https://api.dart.dev/dart-async/StreamController/close.html | Closing prevents new events; completion can wait for paused listeners. A single-subscription controller with no listener can never complete its close future. | A shutdown protocol that awaits an externally controlled listener indefinitely is not a bounded shutdown protocol. |
| File.writeAsString | https://api.dart.dev/dart-io/File/writeAsString.html | It opens, writes and closes; default mode truncates; default encoding is UTF-8; `flush: true` flushes before future completion. | Await writes before teardown. File replacement is not automatically transactional or crash-atomic. |
| State.dispose | https://api.flutter.dev/flutter/widgets/State/dispose.html | It returns `void`, is terminal for that State, and is not guaranteed at application shutdown or native UI dismissal. | Await module/session teardown before removing its scope when the product requires orderly shutdown. Persist critical state incrementally. |

## Engineering recommendations derived from those facts

1. Make start/stop operations awaitable. Set transition guards synchronously before the first await so concurrent callers cannot both enter a transition.
2. Choose a documented overlap policy: share an in-flight future, serialize transitions, or reject overlap. Rejecting overlap is a small, explicit default; reentrant lifecycle callbacks must not await a transition that is waiting on them.
3. Add a module to its cleanup ownership set before awaiting initialization. Initialization can fail after partial acquisition.
4. Stop accepting new commands before draining accepted commands. If commands are queued, attach an error handler to the drain barrier without converting the command's own failed future into a success.
5. Require repeatable cleanup if cleanup retries are supported. Keep failed ownership entries rather than claiming that resources were released.
6. Retain prerequisites of a dependent whose cleanup failed; continue cleaning independent graph branches. Otherwise a surviving consumer could access an already disposed prerequisite.
7. When bounded shutdown is required, implement cooperative cancellation, generation checks, an escalation policy and residual-resource reporting. Adding `.timeout()` alone is insufficient.
8. Treat UI teardown and process shutdown differently. Asynchronous application cleanup belongs in an explicit owner/coordinator, not an assumed awaitable widget destructor.
9. A file export adapter must document overwrite semantics, location ownership, size limits and errors. Add atomic replacement, concurrency coordination or durability guarantees only if the product requires and verifies them.

These are application-host design choices, not a Flutter-provided application-plugin lifecycle API. No timing or allocation benchmarks are asserted here.

Metadata convention was also checked against the [Agent Skills specification](https://agentskills.io/specification): required `name` and `description`, optional string-valued `metadata`, and progressively disclosed references. Its recommendation to keep the entry point under 500 lines informs packaging, not Flutter architecture.
