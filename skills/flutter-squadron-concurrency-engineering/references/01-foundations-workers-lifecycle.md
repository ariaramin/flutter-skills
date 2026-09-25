# Reference: Squadron Concurrency & Worker Engineering Skill for Flutter

_Source lines 1–851 from the supplied guide. Content below is preserved for progressive disclosure._

## Table of contents

  - [Purpose](#purpose)
- [When to Use This Skill](#when-to-use-this-skill)
- [When NOT to Use Squadron](#when-not-to-use-squadron)
- [Core Principles](#core-principles)
- [Mental Model](#mental-model)
- [CPU-Bound vs I/O-Bound](#cpu-bound-vs-i-o-bound)
  - [CPU-bound](#cpu-bound)
  - [I/O-bound](#i-o-bound)
- [Squadron vs Future vs compute vs Isolate](#squadron-vs-future-vs-compute-vs-isolate)
- [Dart Isolate Mental Model](#dart-isolate-mental-model)
- [Async Execution Inside One Worker](#async-execution-inside-one-worker)
- [Package Architecture](#package-architecture)
- [Package Setup](#package-setup)
- [Worker Setup](#worker-setup)
- [Code Generation](#code-generation)
- [@SquadronService](#squadronservice)
- [@SquadronMethod](#squadronmethod)
- [Worker Service Design](#worker-service-design)
- [Worker Initialization](#worker-initialization)
- [PlatformThreadHook](#platformthreadhook)
- [Worker Lifecycle](#worker-lifecycle)
  - [App-scoped worker](#app-scoped-worker)
  - [Feature-scoped worker](#feature-scoped-worker)
  - [One-shot worker](#one-shot-worker)
- [Startup and Warmup](#startup-and-warmup)
- [Worker Startup Cost](#worker-startup-cost)

---

# Squadron Concurrency & Worker Engineering Skill for Flutter

## Purpose

Use this skill to design, implement, review, test, debug, migrate, and optimize production Flutter/Dart concurrency built with `squadron`.

Treat Squadron as a structured worker/RPC abstraction over:

- Dart `Isolate`s on native Dart/Flutter platforms;
- browser Web Workers on web;
- generated worker clients and pools;
- explicit message marshaling;
- bounded worker concurrency;
- cancellation-aware worker tasks;
- worker streams;
- lifecycle and observability infrastructure.

Do not treat Squadron as a blanket performance wrapper around arbitrary `async` code.

The current stable package is **Squadron 7.4.3**. Current first-party documentation describes native Isolate support plus Web Worker support for both JavaScript and WebAssembly builds. It uses `squadron_builder` code generation for type-safe generated `Worker` and `WorkerPool` APIs.

Use this skill to answer these questions before writing worker code:

```text
What work is actually slow?
↓
Is it CPU-bound or mostly waiting?
↓
Is main-isolate responsiveness affected?
↓
How much data must cross the boundary?
↓
How often does the work run?
↓
Does worker startup dominate?
↓
Would one persistent worker be enough?
↓
Would true parallel throughput justify a pool?
↓
How is concurrency bounded?
↓
How are obsolete tasks canceled?
↓
How are stale results rejected?
↓
How are workers stopped?
↓
Does web require a different build/deployment path?
↓
Does measurement prove the architecture is better?
```

---

# When to Use This Skill

Use this skill when working on:

- CPU-heavy JSON parsing or transformation;
- image manipulation;
- compression/decompression;
- CPU-heavy cryptography;
- large sorting/filtering/aggregation workloads;
- local search/indexing;
- parsers and decoders;
- recurring heavy transformations;
- reusable worker services;
- worker pools;
- Web Worker deployment;
- cross-platform worker APIs;
- worker cancellation;
- worker streams;
- worker observability;
- concurrency-related UI jank;
- migration from raw isolates;
- replacing repeated `compute()` calls with persistent workers;
- generated Squadron service APIs;
- stateful worker review;
- large-message performance review;
- pool sizing;
- queue/backpressure design;
- task ordering and stale-result handling.

---

# When NOT to Use Squadron

Do not introduce workers before proving the workload benefits.

Avoid Squadron for:

- ordinary HTTP requests;
- waiting on sockets;
- simple database calls;
- secure-storage reads;
- tiny calculations;
- trivial JSON payloads;
- simple preference access;
- UI state mutations;
- widget construction;
- route navigation;
- short one-off transformations where worker startup dominates;
- operations that are already efficiently asynchronous because they spend most of their time waiting for external I/O;
- code that fundamentally depends on `BuildContext`, Widgets, RenderObjects, or other main-isolate UI state;
- plugin operations that are not explicitly safe/available from worker isolates;
- workloads whose inputs cannot be transferred/marshaled safely;
- workloads where transferring the data costs more than computing locally.

Do not use:

```text
function returns Future
→ therefore put it in worker
```

That is the wrong model.

---

# Core Principles

Apply these rules by default:

1. **Measure before offloading.**
2. **Use workers primarily for meaningful CPU-bound or long-running isolated work.**
3. **Do not move ordinary asynchronous I/O to a worker merely because it returns a `Future`.**
4. **Measure end-to-end worker cost, not compute time alone.**
5. **Treat the worker boundary as a serialization/marshaling boundary.**
6. **Keep messages intentionally small.**
7. **Batch tiny operations instead of issuing thousands of RPC calls.**
8. **Reuse workers for recurring workloads when startup cost matters.**
9. **Use a pool only when actual parallel throughput is needed.**
10. **Set `maxParallel: 1` for CPU-bound pool workloads unless measurement and semantics justify otherwise.**
11. **Bound worker count deliberately.**
12. **Do not blindly set worker count to CPU count.**
13. **Protect Flutter's UI/raster workload from CPU oversubscription.**
14. **Keep worker logic as pure and platform-independent as practical.**
15. **Do not pass UI/framework objects across workers.**
16. **Do not assume arbitrary Dart classes survive the worker boundary.**
17. **Use marshalers for custom DTOs.**
18. **Do not claim zero-copy unless the selected platform/type actually provides transfer semantics.**
19. **Make cancellation cooperative for long-running CPU tasks.**
20. **Reject stale results even when cancellation exists.**
21. **Manage worker and pool lifecycle explicitly.**
22. **Call `stop()` for owned workers/pools.**
23. **Test web separately from native.**
24. **Compile and deploy generated Web Worker entry points explicitly.**
25. **Measure memory, responsiveness, and battery/thermal behavior as well as raw throughput.**

---

# Mental Model

Use this cost model:

```text
Main Isolate
↓
marshal arguments
↓
message dispatch
↓
worker queue
↓
Worker / WorkerPool
↓
actual computation
↓
marshal result
↓
message return
↓
Main Isolate
```

Therefore:

```text
Total worker cost
=
startup/warmup
+
argument marshaling
+
data copy/transfer
+
dispatch
+
queue wait
+
computation
+
result marshaling
+
result copy/transfer
+
main-isolate post-processing
```

The worker is only an improvement when that complete system cost produces a useful result:

- better frame responsiveness;
- lower user-visible latency;
- greater throughput;
- better parallelism;
- more predictable workload isolation.

A worker can improve responsiveness even when total elapsed computation is similar, because the main isolate remains available to service UI work.

A worker can also make the application slower if IPC/startup cost dominates.

---

# CPU-Bound vs I/O-Bound

## CPU-bound

Good candidates include:

```text
large JSON parse
image resize
image transform
compression
hashing
cryptographic derivation
large sort
large aggregation
full-text local search
index construction
binary parsing
large model transformation
```

These spend substantial time executing instructions on the CPU.

## I/O-bound

Usually do not need worker offloading:

```text
HTTP request
database query waiting on storage
file read
socket wait
secure storage call
remote API call
sleep/timer
```

These spend substantial time waiting.

Normal Dart asynchronous APIs already allow the isolate's event loop to continue while waiting.

Separate a pipeline into its actual components.

Example:

```text
HTTP GET
↓
network wait             ← async I/O
↓
receive 20 MB JSON
↓
decode + transform       ← potentially CPU-heavy
```

Do not offload the HTTP wait just because the parsing stage needs a worker.

---

# Squadron vs Future vs compute vs Isolate

| Situation | Preferred approach |
| --- | --- |
| Tiny synchronous calculation | Main isolate |
| Ordinary nonblocking I/O | `Future`/async I/O |
| One occasional CPU-heavy native Flutter operation | Consider `compute()` |
| One-off native Dart CPU job | Consider `Isolate.run()` |
| Recurring CPU-heavy workload | Reusable Squadron `Worker` |
| Multiple independent recurring heavy jobs | Squadron `WorkerPool` after profiling |
| Need cross-platform native + Web Worker abstraction | Squadron |
| Need generated RPC/service API | Squadron |
| Need worker streams | Squadron |
| Need cooperative worker cancellation | Squadron |
| Need full custom low-level isolate protocol | Raw `Isolate` |
| Heavy computation better performed on backend | Server/background service |

Dart isolates have independent memory and communicate through messages; they do not share ordinary mutable object state. `dart:isolate` is a native-Dart facility.

Squadron's primary architectural advantage is persistent/generated worker infrastructure across native and browser platforms. Its README specifically contrasts persistent Squadron workers with `Isolate.run()`'s overhead for frequent operations and notes browser support through Web Workers.

---

# Dart Isolate Mental Model

On native Dart:

```text
Main isolate memory
       │
       │ SendPort
       ▼
serialized/copied/transferable message
       │
       ▼
Worker isolate memory
```

There is no normal shared mutable object graph between isolates.

Each isolate has:

- its own event loop;
- its own globals/statics;
- its own object graph;
- message-based communication.

Do not rely on:

```dart
static int counter = 0;
```

being shared between the main isolate and a worker.

Each isolate has its own state.

---

# Async Execution Inside One Worker

A critical Squadron nuance:

> One generated `Worker` represents one background thread, but async service methods can still interleave at `await` points.

Current Squadron stateful-worker documentation explicitly warns that, even on one worker thread, a second request may begin between `await`s in the first request because Dart uses cooperative asynchronous scheduling.

Therefore this is unsafe:

```dart
@SquadronService()
base class SessionProcessor {
  String? _currentId;

  @SquadronMethod()
  Future<void> process(String id) async {
    _currentId = id;
    await Future<void>.delayed(
      const Duration(milliseconds: 10),
    );

    // _currentId might now belong to another request.
    doSomethingWith(_currentId!);
  }
}
```

One thread does **not** automatically mean one logical operation at a time across `await` boundaries.

For pure synchronous CPU methods, the synchronous execution itself runs to completion before another event executes.

For async methods, design against interleaving.

---

# Package Architecture

Current Squadron concepts include:

- `@SquadronService`;
- `@SquadronMethod`;
- generated service activators;
- generated `Worker` clients;
- generated `WorkerPool` clients;
- `WorkerService`;
- `Worker`;
- `WorkerPool`;
- `ConcurrencySettings`;
- `ValueTask`;
- `StreamTask`;
- `SquadronMarshaler`;
- `MarshalingContext`;
- cancellation tokens;
- worker/pool statistics;
- worker streams;
- custom cross-worker exceptions.

The normal generated architecture is:

```text
Annotated service class
↓
squadron_builder
↓
generated Worker + WorkerPool proxy
↓
Squadron channel
↓
WorkerService in Isolate/Web Worker
```

The calling side interacts with generated methods that resemble the original service API.

---

# Package Setup

Current first-party setup uses:

```yaml
dependencies:
  squadron: ^7.4.3

dev_dependencies:
  build_runner:
  squadron_builder: ^9.0.0
```

The package README currently documents `squadron_builder` 9.x with Squadron 7.4.x.

Always verify compatible current versions before upgrading either package.

---

# Worker Setup

A minimal current generated service:

```dart
import 'dart:async';

import 'package:squadron/squadron.dart';

import 'text_processor.activator.g.dart';

part 'text_processor.worker.g.dart';

@SquadronService(
  baseUrl: '~/workers',
  targetPlatform: TargetPlatform.all,
)
base class TextProcessor {
  @SquadronMethod()
  FutureOr<int> countWords(String text) {
    if (text.trim().isEmpty) {
      return 0;
    }

    return text
        .trim()
        .split(RegExp(r'\s+'))
        .length;
  }
}
```

Generate:

```bash
dart run build_runner build
```

The current generator produces the worker-side/client plumbing, including generated `Worker` and `WorkerPool` types.

Use:

```dart
Future<int> countWordsInWorker(String text) async {
  final worker = TextProcessorWorker();

  try {
    await worker.start();

    return await worker.countWords(text);
  } finally {
    worker.stop();
  }
}
```

Workers also auto-start on first use, but explicit `start()` lets initialization errors surface before the first business request.

---

# Code Generation

Squadron's current primary workflow is generator-based.

Use:

```bash
dart run build_runner build
```

or during development:

```bash
dart run build_runner watch
```

For:

```text
my_service.dart
```

current docs describe generated files including:

```text
my_service.worker.g.dart
my_service.activator.g.dart
```

and require the service source to reference them appropriately.

Typical structure:

```dart
import 'my_service.activator.g.dart';

part 'my_service.worker.g.dart';
```

Do not edit generated files manually.

CI should either:

- regenerate and verify no diff; or
- build from committed generated output according to repository policy.

After changing:

- a method name;
- a constructor;
- a parameter type;
- an annotation;
- a return type;
- a marshaler;

regenerate before debugging worker protocol errors.

Current Squadron troubleshooting documentation identifies stale generated code as a cause of worker `NoSuchMethodError`/method-not-found behavior.

---

# @SquadronService

Current target values include:

```dart
TargetPlatform.vm
TargetPlatform.js
TargetPlatform.wasm
TargetPlatform.web
TargetPlatform.all
```

where:

```text
vm   → native/mobile/desktop/server
js   → JS web
wasm → Wasm web
web  → JS | Wasm
all  → VM | web
```

`baseUrl` is especially important for web because it tells the browser where generated worker artifacts are served.

Example:

```dart
@SquadronService(
  baseUrl: '~/workers',
  targetPlatform: TargetPlatform.all,
)
base class ImageProcessor {
  // ...
}
```

---

# @SquadronMethod

Expose only worker-callable operations:

```dart
@SquadronMethod()
Future<int> parseCount(String input) async {
  return expensiveParse(input);
}
```

Current supported service return patterns include:

- `Future<T>`;
- `FutureOr<T>`;
- `Stream<T>`.

Keep helper implementation private:

```dart
int _computeInternal(...) {
  ...
}
```

Private members remain worker-side implementation details and are not exposed by generated clients.

---

# Worker Service Design

Design worker APIs around expensive operations, not around arbitrary internal function boundaries.

Bad:

```text
worker.readByte()
worker.transformByte()
worker.writeByte()
```

10 million times.

Better:

```text
worker.transformImage(bytes, options)
```

one meaningful call.

Expose application-relevant coarse operations:

```dart
abstract interface class ImageProcessingService {
  Future<Uint8List> resize({
    required Uint8List bytes,
    required int width,
    required int height,
  });

  Future<Uint8List> compress({
    required Uint8List bytes,
    required int quality,
  });
}
```

Then let the implementation use Squadron.

The rest of the application should not know whether processing uses:

- one worker;
- a pool;
- local fallback;
- server processing.

---

# Worker Initialization

Service constructor arguments can be marshaled into the worker by generated infrastructure.

Example:

```dart
@SquadronService()
base class SearchService {
  SearchService(this.stopWords);

  final List<String> stopWords;

  @SquadronMethod()
  FutureOr<List<int>> search(
    String query,
    List<String> documents,
  ) {
    // CPU-heavy search implementation.
    return <int>[];
  }
}
```

Current Squadron service-setup documentation says generated code manages service constructor arguments across the main/worker boundary.

Use constructor initialization for:

- small immutable configuration;
- lookup tables that are worth loading once;
- worker-local algorithm configuration.

Do not ship giant configuration graphs with every task.

---

# PlatformThreadHook

Current Squadron also exposes a `PlatformThreadHook` for low-level platform-thread setup.

The hook receives:

- native `Isolate` on VM;
- browser `Worker` on web.

Use this only for actual thread/platform configuration, not normal business dependencies.

Prefer service constructors for ordinary worker initialization.

---

# Worker Lifecycle

Treat lifecycle as ownership.

```text
Feature/Application Service
↓ owns
Worker or WorkerPool
↓
start / auto-start
↓
process many tasks
↓
stop
```

Current docs state:

- `start()` explicitly starts a worker/pool;
- otherwise first use auto-starts;
- `stop()` terminates underlying threads;
- failure to stop native workers can keep a Dart VM program alive.

## App-scoped worker

Use when:

- workload is common across app;
- startup cost should be amortized;
- worker holds expensive initialization;
- memory cost is acceptable.

## Feature-scoped worker

Use when:

- feature is rarely entered;
- initialization is expensive;
- keeping worker alive would waste memory.

## One-shot worker

Use only when:

- task is genuinely expensive enough;
- `compute()`/`Isolate.run()` is insufficient for cross-platform requirements;
- measurements justify spawn + teardown.

Do not create and kill Squadron workers around tiny calculations.

---

# Startup and Warmup

Squadron workers auto-start lazily on the first task.

Explicit:

```dart
await worker.start();
```

or:

```dart
await pool.start();
```

can move initialization latency earlier and expose startup failures intentionally.

Do not prewarm everything at application startup.

Choose based on:

```text
probability feature is used
×
worker startup latency
×
first-interaction sensitivity
×
memory retained
```

Good warmup candidate:

```text
photo editor screen opens
↓
user will almost certainly resize/filter image
↓
start image pool during screen preparation
```

Poor warmup candidate:

```text
launch app
↓
start ten pools for rarely used admin features
```

---

# Worker Startup Cost

Measure startup separately.

Benchmark:

```text
cold first call
warm subsequent calls
```

Example measurement:

```dart
final worker = TextProcessorWorker();

final coldWatch = Stopwatch()..start();
await worker.countWords(largeText);
coldWatch.stop();

final warmWatch = Stopwatch()..start();
await worker.countWords(largeText);
warmWatch.stop();

worker.stop();
```

Do not interpret cold and warm latency as the same workload.

---
