# Reference: 05 Antipatterns Workflows Checklists

_Source lines 3233–4203 from the supplied guide. Content below is preserved for progressive disclosure._

## Table of contents

- [Common Anti-Patterns](#common-anti-patterns)
  - [Creating a worker for every tiny task](#creating-a-worker-for-every-tiny-task)
  - [Using workers for HTTP](#using-workers-for-http)
  - [Spawning too many workers](#spawning-too-many-workers)
  - [Blind pool size = CPU count](#blind-pool-size-cpu-count)
  - [Leaving maxWorkers unbounded](#leaving-maxworkers-unbounded)
  - [Huge object graphs](#huge-object-graphs)
  - [Thousands of tiny RPC calls](#thousands-of-tiny-rpc-calls)
  - [UI work inside worker](#ui-work-inside-worker)
  - [Passing BuildContext](#passing-buildcontext)
  - [Assuming arbitrary classes transfer](#assuming-arbitrary-classes-transfer)
  - [Shared-memory assumptions](#shared-memory-assumptions)
  - [Ignoring serialization cost](#ignoring-serialization-cost)
  - [Ignoring startup cost](#ignoring-startup-cost)
  - [Keeping unused pools forever](#keeping-unused-pools-forever)
  - [Forgetting stop()](#forgetting-stop)
  - [Swallowing worker exceptions](#swallowing-worker-exceptions)
  - [Assuming cancel stops CPU work](#assuming-cancel-stops-cpu-work)
  - [Stale search result wins](#stale-search-result-wins)
  - [Expensive initialization per call](#expensive-initialization-per-call)
  - [Benchmarking only computation](#benchmarking-only-computation)
  - [Debug-mode benchmark](#debug-mode-benchmark)
  - [Increase pool size without profiling](#increase-pool-size-without-profiling)
  - [Native = web assumption](#native-web-assumption)
  - [Forget web worker build](#forget-web-worker-build)
  - [Ignore CSP](#ignore-csp)
  - [Unsupported plugin in worker](#unsupported-plugin-in-worker)
  - [Move database/network I/O to worker without reason](#move-database-network-i-o-to-worker-without-reason)
  - [Repeated enormous byte transfer](#repeated-enormous-byte-transfer)
  - [Squadron everywhere because code is async](#squadron-everywhere-because-code-is-async)
  - [Passing tests = performance proof](#passing-tests-performance-proof)
- [New Worker Implementation Workflow](#new-worker-implementation-workflow)
  - [1. Identify the workload](#1-identify-the-workload)
  - [2. Determine CPU vs I/O](#2-determine-cpu-vs-i-o)
  - [3. Measure current local cost](#3-measure-current-local-cost)
  - [4. Determine task frequency](#4-determine-task-frequency)
  - [5. Estimate transfer size](#5-estimate-transfer-size)
  - [6. Select execution strategy](#6-select-execution-strategy)
  - [7. Define worker API](#7-define-worker-api)
  - [8. Define wire types](#8-define-wire-types)
  - [9. Keep core computation pure](#9-keep-core-computation-pure)
  - [10. Choose lifecycle](#10-choose-lifecycle)
  - [11. Choose pool policy](#11-choose-pool-policy)
  - [12. Define backpressure](#12-define-backpressure)
  - [13. Define cancellation](#13-define-cancellation)
  - [14. Define stale-result policy](#14-define-stale-result-policy)
  - [15. Define errors](#15-define-errors)
  - [16. Implement generated service](#16-implement-generated-service)
  - [17. Add pure logic tests](#17-add-pure-logic-tests)
  - [18. Add worker integration tests](#18-add-worker-integration-tests)
  - [19. Benchmark cold + warm](#19-benchmark-cold-warm)
  - [20. Benchmark end-to-end](#20-benchmark-end-to-end)
  - [21. Measure UI responsiveness](#21-measure-ui-responsiveness)
  - [22. Measure memory](#22-measure-memory)
  - [23. Test low-end devices](#23-test-low-end-devices)
  - [24. Test web separately](#24-test-web-separately)
  - [25. Tune based on evidence](#25-tune-based-on-evidence)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
- [Refactoring Rules](#refactoring-rules)
- [Code Review Checklist](#code-review-checklist)
- [Performance Checklist](#performance-checklist)
- [Worker Pool Checklist](#worker-pool-checklist)
- [Web Worker Checklist](#web-worker-checklist)
- [Serialization Checklist](#serialization-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Quick Reference](#quick-reference)
- [Final Engineering Rule](#final-engineering-rule)

---

# Common Anti-Patterns

## Creating a worker for every tiny task

**Bad**

```dart
Future<int> square(int value) async {
  final worker = MathWorker();

  try {
    return await worker.square(value);
  } finally {
    worker.stop();
  }
}
```

for a trivial multiplication.

**Why it is problematic**

Spawn/channel/marshaling cost dominates.

**Better**

```dart
int square(int value) => value * value;
```

---

## Using workers for HTTP

**Bad**

```dart
@SquadronMethod()
Future<String> fetchUrl(String url) {
  return http.read(Uri.parse(url));
}
```

solely because HTTP is async.

**Why it is problematic**

Network wait is already asynchronous.

**Better**

Perform HTTP normally and offload genuinely heavy response processing.

---

## Spawning too many workers

**Bad**

```dart
const ConcurrencySettings(
  minWorkers: 32,
  maxWorkers: 32,
  maxParallel: 1,
);
```

on mobile without measurement.

**Better**

Start small and profile.

---

## Blind pool size = CPU count

**Bad**

```dart
maxWorkers = Platform.numberOfProcessors;
```

as a universal formula.

**Why it is problematic**

Flutter and the OS need CPU too; workload and memory matter.

**Better**

Benchmark multiple bounded sizes.

---

## Leaving maxWorkers unbounded

**Bad**

```dart
const ConcurrencySettings(
  maxWorkers: 0,
);
```

for an uncontrolled burst workload.

Current API defines zero as unbounded.

**Better**

Set an evidence-based upper bound.

---

## Huge object graphs

**Bad**

Send a full application aggregate containing hundreds of nested objects to compute one number.

**Better**

Send a compact worker DTO containing only required values.

---

## Thousands of tiny RPC calls

**Bad**

```dart
for (final row in rows) {
  await pool.transformRow(row);
}
```

**Better**

```dart
await pool.transformRows(rows);
```

or batch into sensible chunks.

---

## UI work inside worker

**Bad**

```dart
@SquadronMethod()
Widget buildCard(...) { ... }
```

**Better**

Worker returns data; main isolate builds Widget.

---

## Passing BuildContext

**Bad**

```dart
worker.process(context);
```

**Better**

Extract serializable input.

---

## Assuming arbitrary classes transfer

**Bad**

```dart
worker.process(complexDomainAggregate);
```

with no marshaling review.

**Better**

Use supported wire types or `SquadronMarshaler`.

---

## Shared-memory assumptions

**Bad**

Expect a worker to update a global variable visible to main isolate.

**Better**

Return messages/results explicitly.

---

## Ignoring serialization cost

**Bad**

Benchmark only:

```text
inside service Stopwatch
```

**Better**

Measure caller dispatch-to-result latency.

---

## Ignoring startup cost

**Bad**

Benchmark a warm persistent worker and claim every one-shot invocation has that latency.

**Better**

Measure cold and warm separately.

---

## Keeping unused pools forever

**Bad**

Create every feature pool at app startup and never stop any.

**Better**

Match scope to feature/application lifecycle.

---

## Forgetting stop()

**Bad**

```dart
final worker = ParserWorker();
await worker.parse(data);
```

without ownership cleanup.

**Better**

```dart
try {
  await worker.parse(data);
} finally {
  worker.stop();
}
```

or stop it during owning service teardown.

---

## Swallowing worker exceptions

**Bad**

```dart
try {
  await worker.process(data);
} catch (_) {
  return null;
}
```

**Better**

Map infrastructure failure to explicit application failure and preserve diagnostics.

---

## Assuming cancel stops CPU work

**Bad**

```dart
task.cancel();
```

and assume worker immediately stops.

**Why it is problematic**

Current Squadron docs explicitly distinguish caller/task cancellation from cooperative worker cancellation for running value tasks.

**Better**

Pass a cancellation token and check it inside long-running work.

---

## Stale search result wins

**Bad**

Publish every worker completion.

**Better**

Use revision IDs plus cancellation.

---

## Expensive initialization per call

**Bad**

```dart
@SquadronMethod()
Future<Result> search(...) async {
  final index = buildHugeIndex();
  return index.search(...);
}
```

on every request.

**Better**

If measured and safe, initialize reusable worker state once.

---

## Benchmarking only computation

**Bad**

```text
worker compute = 20 ms
therefore worker is faster
```

while transfer adds 80 ms.

**Better**

Benchmark end-to-end.

---

## Debug-mode benchmark

**Bad**

Compare architectures in Flutter debug mode and make release decisions.

**Better**

Use profile/release.

---

## Increase pool size without profiling

**Bad**

```text
slow
→ double workers
```

**Better**

Inspect queue, compute, transfer, memory, UI CPU first.

---

## Native = web assumption

**Bad**

Test native and assume custom classes behave identically on web.

**Better**

Run browser integration tests and implement marshalers.

---

## Forget web worker build

**Bad**

Deploy Flutter web without compiled generated worker assets.

**Better**

Automate worker compilation in CI.

---

## Ignore CSP

**Bad**

Disable all CSP because Worker fails.

**Better**

Determine exact worker loading requirement and permit only necessary sources.

---

## Unsupported plugin in worker

**Bad**

Call arbitrary Flutter plugin APIs from service isolate without verification.

**Better**

Keep plugin operation on supported isolate and offload pure CPU stage.

---

## Move database/network I/O to worker without reason

**Bad**

Offload all repository methods.

**Better**

Move expensive transformations, not waiting.

---

## Repeated enormous byte transfer

**Bad**

Send same 100 MB buffer to worker on every query.

**Better**

Use one-time worker state or redesign message boundary when justified.

---

## Squadron everywhere because code is async

**Bad**

Annotate every service.

**Better**

Use Squadron only where concurrency cost model proves value.

---

## Passing tests = performance proof

**Bad assumption**

```text
worker tests green
→ architecture is faster
```

**Better**

Run production-sized benchmarks and frame profiling.

---

# New Worker Implementation Workflow

## 1. Identify the workload

Name the expensive stage precisely.

Bad:

```text
loading is slow
```

Good:

```text
parsing 18 MB JSON blocks main isolate for 95 ms
```

## 2. Determine CPU vs I/O

Use profiling, not intuition.

## 3. Measure current local cost

Capture:

- input size;
- duration;
- frame impact;
- frequency.

## 4. Determine task frequency

Classify:

```text
one-off
occasional
recurring
bursty
continuous
```

## 5. Estimate transfer size

Measure both request and result.

## 6. Select execution strategy

Choose:

```text
main isolate
Future
compute/Isolate.run
one Squadron Worker
Squadron WorkerPool
server-side
```

## 7. Define worker API

Make methods coarse-grained and domain-relevant.

## 8. Define wire types

Use:

- primitives;
- compact lists/maps;
- typed data;
- marshalers for DTOs.

## 9. Keep core computation pure

Extract testable Dart logic.

## 10. Choose lifecycle

Decide:

```text
one shot
feature scoped
lazy app scoped
eager app scoped
```

## 11. Choose pool policy

If pool required, define:

```text
minWorkers
maxWorkers
maxParallel
```

Set CPU work to `maxParallel: 1` unless evidence says otherwise.

## 12. Define backpressure

What happens when 1,000 tasks arrive?

## 13. Define cancellation

For long-running CPU jobs, add cooperative token checks.

## 14. Define stale-result policy

Use revision/task ID where old results can become obsolete.

## 15. Define errors

Map worker exceptions at service boundary.

## 16. Implement generated service

Annotate and regenerate.

## 17. Add pure logic tests

Prove computation.

## 18. Add worker integration tests

Prove boundary.

## 19. Benchmark cold + warm

Measure startup.

## 20. Benchmark end-to-end

Include transfers and queue.

## 21. Measure UI responsiveness

Use Flutter performance tools.

## 22. Measure memory

Especially with pools and large bytes.

## 23. Test low-end devices

Do not tune only on flagship hardware.

## 24. Test web separately

Compile/deploy real worker assets.

## 25. Tune based on evidence

Change batching/pool size/lifecycle only after measurements.

---

# Existing-Code Review Workflow

Before modifying existing Squadron architecture, inspect:

- `squadron` version;
- `squadron_builder` version;
- generated files;
- annotations;
- target platform;
- `baseUrl`;
- service constructors;
- worker ownership;
- explicit/implicit startup;
- worker lifetime;
- every `stop()`;
- pool `ConcurrencySettings`;
- whether `maxWorkers` is unbounded;
- `maxParallel`;
- worker stats;
- queue pressure;
- task granularity;
- request sizes;
- result sizes;
- custom marshalers;
- typed data;
- `TransferableTypedData`;
- stateful fields;
- `await` interleaving;
- `pool.execute()` use;
- cancellation;
- timeout behavior;
- stale-result handling;
- custom exceptions;
- channel logging;
- Flutter plugin dependencies;
- web entry build;
- deployed worker path;
- CSP;
- unit tests;
- integration tests;
- benchmarks.

Do not optimize a single worker method without understanding the entire dispatch pipeline.

---

# Refactoring Rules

Concurrency refactoring can change behavior even when function signatures remain unchanged.

Moving:

```text
local call
```

to:

```text
worker call
```

can change:

- timing;
- ordering;
- object identity;
- exception type;
- stack traces;
- cancellation;
- memory use;
- static/global state;
- plugin availability.

Moving:

```text
one worker
```

to:

```text
pool
```

can additionally change:

- state affinity;
- result ordering;
- simultaneous execution;
- resource consumption.

Write characterization tests before high-risk boundary changes.

---

# Code Review Checklist

- [ ] Workload is genuinely suitable for worker execution.
- [ ] CPU vs I/O distinction is documented.
- [ ] Main-isolate baseline is measured.
- [ ] End-to-end worker baseline is measured.
- [ ] Worker lifecycle is explicit.
- [ ] Startup cost is understood.
- [ ] Pool is necessary.
- [ ] Worker count is bounded.
- [ ] Pool size has evidence.
- [ ] CPU pool uses intentional `maxParallel`.
- [ ] Task granularity is coarse enough.
- [ ] Queue/backpressure policy exists.
- [ ] Request size reviewed.
- [ ] Result size reviewed.
- [ ] Marshalers are correct.
- [ ] Web type conversion is tested.
- [ ] Worker state is deliberate.
- [ ] Async state interleaving reviewed.
- [ ] Cancellation semantics understood.
- [ ] Stale result protection exists.
- [ ] Errors are mapped.
- [ ] Workers are stopped.
- [ ] Plugins used from worker are verified.
- [ ] Web workers are built/deployed.
- [ ] Profile/release benchmarks exist.

---

# Performance Checklist

- [ ] Baseline main-isolate compute duration measured.
- [ ] Cold worker latency measured.
- [ ] Warm worker latency measured.
- [ ] Queue wait measured.
- [ ] Worker runtime measured.
- [ ] Input bytes estimated.
- [ ] Output bytes estimated.
- [ ] Marshaling cost considered.
- [ ] Calls batched appropriately.
- [ ] Pool sizes 1/2/N compared.
- [ ] Frame responsiveness measured.
- [ ] Memory peak measured.
- [ ] Low-end device tested.
- [ ] Battery/thermal impact considered.
- [ ] Debug benchmarks not used for production decisions.
- [ ] Optimization improves real user metric.

---

# Worker Pool Checklist

- [ ] Pool actually needed over one Worker.
- [ ] `minWorkers` intentional.
- [ ] `maxWorkers` bounded.
- [ ] `maxParallel` intentional.
- [ ] CPU workloads normally use `maxParallel: 1`.
- [ ] Queue pressure observed.
- [ ] Producer backpressure exists.
- [ ] Pool state is stateless or worker affinity is explicit.
- [ ] `execute()` used when multi-call affinity is required.
- [ ] Pool cancellation semantics understood.
- [ ] Pool stop belongs to clear owner.
- [ ] Memory × worker count is acceptable.
- [ ] Pool statistics monitored during tuning.

---

# Web Worker Checklist

- [ ] `targetPlatform` correct.
- [ ] `baseUrl` correct.
- [ ] generated `.web.g.dart` exists.
- [ ] JS/Wasm worker compiled.
- [ ] artifact deployed at expected URL.
- [ ] browser can fetch worker.
- [ ] custom marshalers tested.
- [ ] int/double conversions tested.
- [ ] typed-data behavior tested.
- [ ] CSP permits intended Worker loading.
- [ ] actual target browsers tested.
- [ ] browser pool size profiled independently.
- [ ] JS/Wasm performance measured rather than assumed.

---

# Serialization Checklist

- [ ] Every method argument is worker-safe.
- [ ] Every return type is worker-safe.
- [ ] Custom classes have marshalers.
- [ ] Marshaler round-trip tested.
- [ ] No unnecessary object graph is sent.
- [ ] Typed data used for binary payloads.
- [ ] Large payload size measured.
- [ ] Same large dataset is not repeatedly transferred unnecessarily.
- [ ] Web structured-clone/type erasure considered.
- [ ] Native transfer claims verified before saying "zero copy".
- [ ] `TransferableTypedData` ownership semantics understood if used.

---

# Production Readiness Checklist

Before approving production Squadron use, verify:

- [ ] The workload is genuinely CPU-heavy/worker-worthy.
- [ ] End-to-end benchmark shows a meaningful benefit.
- [ ] Main-isolate responsiveness improves or remains acceptable.
- [ ] Worker startup strategy is intentional.
- [ ] Worker/pool owner is clear.
- [ ] Every owned worker/pool is stopped.
- [ ] Pool size is evidence-based.
- [ ] CPU concurrency is bounded.
- [ ] Queue cannot grow uncontrolled without application policy.
- [ ] Task granularity is sensible.
- [ ] Request/result payload sizes are reviewed.
- [ ] Custom objects are marshaled.
- [ ] Native/web transfer differences are understood.
- [ ] Long-running tasks support cooperative cancellation where required.
- [ ] Stale tasks cannot overwrite newer state.
- [ ] Error propagation is tested.
- [ ] Worker crashes/initialization failure have a safe recovery policy.
- [ ] Plugin restrictions are respected.
- [ ] Web worker artifacts are generated and deployed in CI.
- [ ] CSP/browser behavior tested if web is targeted.
- [ ] Memory overhead is acceptable.
- [ ] Low-end mobile hardware tested.
- [ ] Battery/thermal impact is acceptable.
- [ ] Benchmarks use profile/release conditions.
- [ ] Package/generator versions are compatible.

---

# Quick Reference

| Situation | Preferred approach |
| --- | --- |
| Tiny calculation | Main isolate |
| Ordinary HTTP request | Async I/O; no worker |
| File/network wait | Async I/O |
| Occasional medium native CPU task | Consider `compute()` / `Isolate.run()` |
| Repeated CPU-heavy feature | Reusable Squadron Worker |
| Multiple independent heavy jobs | Squadron WorkerPool after profiling |
| CPU pool | Usually `maxParallel: 1` |
| `maxWorkers: 0` | Unbounded; avoid unintentionally |
| Thousands of tiny operations | Batch |
| Huge byte payload | Measure transfer/copy cost first |
| Same huge dataset reused repeatedly | Consider worker-local state if lifecycle/affinity justify it |
| Stateful multi-call pool operation | `pool.execute()` + `maxParallel: 1` |
| Async worker with mutable fields | Review `await` interleaving |
| Custom DTO | `SquadronMarshaler` |
| Binary data | Prefer typed data |
| Native ownership-transfer optimization | Consider `TransferableTypedData` deliberately |
| Cross-platform Web Worker API | Avoid native-only transfer assumptions |
| Running value-task canceled from pool | Do not assume CPU work stopped |
| Need actual running CPU cancellation | Cooperative `CancelationToken` |
| Timeout | `TimeoutToken` for cooperative cancellation |
| Live CPU-heavy search | Debounce + cancellation + revision check |
| Older result finishes late | Reject stale revision |
| Worker exception | Map at service/repository boundary |
| Worker initialization expensive | Reuse/lazy warm worker |
| Rare feature | Lazy feature-scoped worker |
| App-wide recurring processor | App-scoped reusable worker/pool |
| UI object needed | Keep operation on main isolate |
| Flutter plugin call | Verify background-isolate support first |
| Web Worker 404 | Check generated artifact + compile path + `baseUrl` |
| Web custom type fails | Add/fix marshaler |
| Program will not exit | Ensure Worker/Pool `stop()` |
| Worker method missing | Regenerate and check builder compatibility |
| Worker slower than local | Measure startup + transfer + queue + compute |
| Pool saturated | Backpressure, batching, cancellation, or evidence-based resize |
| UI still janks | Profile main preprocessing/postprocessing/build/raster |
| More workers benchmark faster | Still measure UI, memory, battery, thermals |
| Web target | Test JS/Wasm worker deployment separately |
| Passing correctness tests | Not proof of performance gain |

---

# Final Engineering Rule

Do not begin with:

```dart
final pool = SomeWorkerPool();
final result = await pool.doEverything();
```

Begin with:

```text
What exact stage is expensive?
↓
Is it CPU-bound?
↓
How long does it block the main isolate?
↓
How often does it run?
↓
How large is the input?
↓
How large is the output?
↓
What does marshaling cost?
↓
Is spawn cost amortized?
↓
Would one worker be sufficient?
↓
Is a pool truly required?
↓
What is the smallest safe worker count?
↓
How is queue growth bounded?
↓
Can obsolete work be canceled?
↓
Can old results arrive late?
↓
Does state survive safely across await points?
↓
Can the worker run without UI/plugin assumptions?
↓
How does web differ?
↓
Who stops the worker?
↓
What benchmark proves this design is better?
```

Use Squadron when the worker boundary produces a measurable architectural or performance benefit. Keep message boundaries deliberate, concurrency bounded, task APIs coarse, cancellation cooperative, results revision-safe, lifecycle explicit, and web/native behavior independently verified.

A successful Squadron architecture is not the one with the most workers. It is the one that moves the right computation off the main isolate with the smallest justified communication, memory, scheduling, and lifecycle cost.
