# Async, Futures, Streams, Cancellation, Isolates

## Future ownership

A future represents work with lifecycle semantics. Ask:

- who starts it;
- can it restart;
- can it become irrelevant;
- can it be canceled;
- how errors are surfaced;
- whether completion order matters.

## `Future.wait`

Use for independent work that can run concurrently.

```dart
final (user, settings) = await () async {
  final results = await Future.wait([
    repository.loadUser(),
    repository.loadSettings(),
  ]);
  return (results[0] as User, results[1] as Settings);
}();
```

For heterogeneous futures, records plus separate awaits/concurrency helpers may be clearer. Understand `Future.wait` error/cleanup semantics before relying on partial results.

Do not parallelize operations with ordering/dependency requirements.

## Avoid needless `async`/`await`

If a function simply returns a future unchanged, returning it directly avoids an extra async boundary and preserves the original stack behavior more directly.

```dart
Future<User> load() => repository.loadUser();
```

Use `async`/`await` when it improves control flow, error handling, cleanup, or readability.

## Cleanup with `try/finally`

A 2022 source example chains `Future.then(...).onError(...)` to run API cleanup. Preserve the intent but prefer explicit structured cleanup when ownership matters.

```dart
final client = HttpClient();
try {
  return await checkout(client);
} finally {
  client.close();
}
```

If failure requires a compensating remote action, keep that action explicit and decide what happens if cleanup itself fails.

## Cancellation

Cancellation has layers:

1. **ignore result** — caller stops caring;
2. **cancel subscription/timer** — stops future callbacks from that resource;
3. **cancel transport/operation** — underlying network/worker stops doing work.

`CancelableOperation` can make caller-facing completion cancelable, but underlying work only stops if the underlying API supports cancellation and the cancellation hook actually triggers it.

For search/request scopes, prefer transport-native cancellation tokens when available.

## `unawaited`

Use to document intentional fire-and-forget work.

```dart
unawaited(analytics.track('opened_profile'));
```

Ensure errors are handled by the called API or intentionally routed. Do not use `unawaited` to silence a future you should await.

## Streams

### Controller ownership

Prefer creating controllers only when you truly need imperative event production. Close owned controllers. If data can be expressed with `async*`, existing streams, or state objects, avoid unnecessary controllers.

### Transformations

Common operations include:

- `map`, `where`, `asyncMap`, `expand`;
- timeout/recovery;
- debounce/throttle/combineLatest via packages when needed;
- initial values / start-with behavior.

Before using package operators, confirm:

- single vs broadcast stream behavior;
- cancellation propagation;
- error propagation;
- whether events can be dropped/reordered.

## Error handling

Do not absorb stream errors by converting them to empty data unless “error means no data” is actually the domain policy.

A source tip demonstrates absorbing/recovering errors; production code should instead explicitly choose among:

- propagate error to UI/state;
- map infrastructure error to domain failure;
- retry bounded transient failures;
- recover with cached data;
- terminate stream.

## Debounce vs throttle

- **Debounce:** wait for inactivity; good for search queries.
- **Throttle:** limit execution rate while events continue; good for high-frequency gestures/telemetry depending on semantics.

Test with fake time where possible.

## Async startup

App initialization should not create a permanently blank/crashed app when one optional dependency fails.

Classify dependencies:

- required to render anything;
- required only for a feature;
- optional telemetry/config.

Give required initialization a user-visible error/retry path. Initialize optional services defensively.

## Isolates and `compute`

Use for CPU work that risks frame drops (parsing, transforms, algorithms), not ordinary async network waiting.

Current Flutter behavior:

- native: `compute` executes in a separate isolate (conceptually `Isolate.run`);
- web: callback runs on the current event loop, so it does not create true parallel execution.

Inputs/results must satisfy sendability constraints on native platforms.

Measure transfer/copy overhead, especially for large object graphs.

## Retry

A robust retry policy specifies:

- which failures are retryable;
- maximum attempts/time;
- delay/backoff/jitter if needed;
- idempotency safety;
- cancellation;
- user-visible final failure.

Never blindly retry a payment/write that may have succeeded server-side without idempotency protection.
