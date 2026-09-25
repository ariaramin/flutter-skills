# Reference: 04 Testing Debugging Migration

_Source lines 2766–3232 from the supplied guide. Content below is preserved for progressive disclosure._

## Table of contents

- [Testing Strategy](#testing-strategy)
  - [Pure logic tests](#pure-logic-tests)
- [Worker Integration Tests](#worker-integration-tests)
- [Pool Tests](#pool-tests)
- [Serialization Tests](#serialization-tests)
- [Cancellation Tests](#cancellation-tests)
- [Stream Tests](#stream-tests)
- [Web Worker Tests](#web-worker-tests)
- [Performance Tests](#performance-tests)
- [Debugging Workflow](#debugging-workflow)
  - [Worker never starts](#worker-never-starts)
- [Method Not Found / NoSuchMethod](#method-not-found-nosuchmethod)
- [Worker Method Hangs](#worker-method-hangs)
- [Serialization Failure](#serialization-failure)
- [Worker Slower Than Main Isolate](#worker-slower-than-main-isolate)
- [UI Still Janks](#ui-still-janks)
- [Excessive Memory](#excessive-memory)
- [Wrong / Stale Results](#wrong-stale-results)
- [Web Worker Failure](#web-worker-failure)
- [Migration Workflow](#migration-workflow)
- [Refactoring Rules](#refactoring-rules)

---

# Testing Strategy

Separate correctness tests from concurrency/platform tests.

## Pure logic tests

Extract core computation into ordinary Dart functions/classes.

Example:

```dart
final class WordCounter {
  const WordCounter();

  int count(String text) {
    final value = text.trim();

    if (value.isEmpty) {
      return 0;
    }

    return value.split(RegExp(r'\s+')).length;
  }
}
```

Test directly:

```dart
void main() {
  test('counts words', () {
    const counter = WordCounter();

    expect(
      counter.count('one two three'),
      3,
    );
  });
}
```

Worker service:

```dart
@SquadronService()
base class WordCounterService {
  const WordCounterService();

  @SquadronMethod()
  FutureOr<int> count(String text) {
    return const WordCounter().count(text);
  }
}
```

Most business correctness should be testable without threads.

---

# Worker Integration Tests

Test generated worker behavior for:

- startup;
- service call;
- result;
- exception;
- stop;
- custom marshaler;
- stream;
- cancellation.

Example:

```dart
test('worker executes service', () async {
  final worker = WordCounterServiceWorker();

  try {
    await worker.start();

    expect(
      await worker.count('one two three'),
      3,
    );
  } finally {
    worker.stop();
  }
});
```

Run on platforms where worker behavior matters.

---

# Pool Tests

Test:

- concurrent independent calls;
- bounded worker count;
- queueing;
- task cancellation;
- pool shutdown;
- state affinity if using `execute()`.

Do not assert exact completion order unless the API/business contract promises it.

---

# Serialization Tests

For custom DTOs test:

```text
value
↓ marshal
wire form
↓ unmarshal
equivalent value
```

Include:

- nullables;
- empty collections;
- large numeric values;
- typed data;
- nested DTOs;
- web conversion behavior.

---

# Cancellation Tests

Test two different behaviors:

### Pending cancellation

Task never starts.

### Running cooperative cancellation

Worker sees token and exits.

Do not merely assert caller gets canceled; prove worker resource is reclaimed when that is required.

For latest-wins pipelines, test stale-result rejection separately.

---

# Stream Tests

Verify:

- ordered events for one stream;
- completion;
- worker-side error propagation;
- cancellation;
- subscriber cleanup.

Avoid timing-sensitive expectations where possible.

---

# Web Worker Tests

Native tests do not prove web deployment.

Test actual built web assets:

```text
worker artifact served
↓
browser loads worker
↓
RPC succeeds
↓
custom DTO marshals
↓
errors propagate
↓
stop/disposal succeeds
```

Run at least one browser smoke/integration suite in CI if web is production-critical.

---

# Performance Tests

Do not put brittle assertions such as:

```dart
expect(elapsed, lessThan(10));
```

in ordinary unit tests.

Maintain benchmarks separately.

Compare trends and ratios on controlled hardware.

Performance is evidence, not a unit-test constant.

---

# Debugging Workflow

## Worker never starts

Inspect:

1. package version;
2. generated code exists;
3. `squadron_builder` compatibility;
4. service annotation;
5. constructor argument marshaling;
6. explicit `start()` error;
7. target platform;
8. web entry artifact;
9. web base URL;
10. browser console/network.

---

# Method Not Found / NoSuchMethod

Current first-party troubleshooting guidance points to stale generated code.

Run:

```bash
dart run build_runner build --delete-conflicting-outputs
```

Then verify Squadron and builder versions are compatible.

Do not hand-edit generated command IDs.

---

# Worker Method Hangs

Inspect:

```text
Is worker running?
↓
Is queue saturated?
↓
Is task pending or running?
↓
Is worker method awaiting something that never resolves?
↓
Is stateful worker deadlocked logically?
↓
Is shared-worker orchestration circular?
↓
Is cancellation state inconsistent?
↓
Did worker crash/channel close?
```

Use:

- `Task.waitTime`;
- `Task.runningTime`;
- pool stats;
- `channelLogger`.

Avoid adding random delays.

---

# Serialization Failure

Inspect:

1. service argument types;
2. return type;
3. custom marshalers;
4. nested custom classes;
5. typed-data assumptions;
6. native/web difference;
7. numeric conversion;
8. cyclic graph handling;
9. generated code freshness.

Reduce the failing message to the smallest reproducible payload.

---

# Worker Slower Than Main Isolate

Measure:

```text
cold startup
message size
marshaling
queue wait
compute
return message size
```

Likely causes:

- task too small;
- worker created per call;
- repeated giant payload transfer;
- thousands of RPC calls;
- pool too large;
- queue saturated;
- heavy custom marshaling;
- debug-mode benchmark.

Do not solve by automatically adding more workers.

---

# UI Still Janks

Inspect main isolate for:

- preprocessing before dispatch;
- huge request construction;
- marshaling work;
- giant result materialization;
- synchronous UI model transformation after return;
- large state equality checks;
- widget rebuild cost;
- layout;
- raster/GPU bottleneck.

Squadron cannot fix a raster bottleneck.

---

# Excessive Memory

Inspect:

- pool size;
- worker state;
- input copies;
- result copies;
- decoded image buffers;
- retained caches;
- stream buffering;
- queued tasks holding payload references.

Try:

```text
reduce workers
↓
reduce payload size
↓
batch differently
↓
keep large state on one worker
```

only after confirming semantics remain correct.

---

# Wrong / Stale Results

Inspect:

- request revision;
- task IDs;
- cancellation;
- stateful worker interleaving;
- pool worker affinity;
- mutable inputs;
- app-level ordering assumptions.

Do not assume Future completion order equals submission order.

---

# Web Worker Failure

Inspect:

1. browser console;
2. Network request for worker script;
3. base URL;
4. generated `.web.g.dart`;
5. compiled JS/Wasm output;
6. deployment path;
7. CSP;
8. custom DTO marshaling;
9. browser support;
10. JS vs Wasm target mismatch.

---

# Migration Workflow

Before upgrading Squadron:

1. inspect current `squadron` version;
2. inspect current `squadron_builder` version;
3. read changelog between versions;
4. inspect service annotations;
5. inspect deprecated worker/pool APIs;
6. regenerate all code;
7. compare generated API changes;
8. run native integration tests;
9. rebuild web worker artifacts;
10. run browser integration tests;
11. verify custom marshalers;
12. verify custom exceptions;
13. verify cancellation;
14. verify streams;
15. benchmark representative workloads;
16. verify pool behavior.

Squadron's historical changelog includes breaking protocol changes such as moving worker request/response serialization from `Map` to `List`, plus evolution of pool task/cancellation APIs. Do not assume generated protocol internals remain compatible across major versions.

---

# Refactoring Rules

Changing worker boundaries can alter:

- execution order;
- timing;
- copying;
- memory;
- cancellation;
- failure timing;
- thread affinity;
- stale-result exposure.

Therefore:

> Preserve behavior first, then optimize.

Before:

```text
local function
```

becomes:

```text
pool call
```

write tests for:

- result correctness;
- error behavior;
- ordering assumptions;
- cancellation expectations;
- lifecycle.

Then benchmark.

---
