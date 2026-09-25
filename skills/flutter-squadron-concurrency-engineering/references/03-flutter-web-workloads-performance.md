# Reference: 03 Flutter Web Workloads Performance

_Source lines 1952–2765 from the supplied guide. Content below is preserved for progressive disclosure._

## Table of contents

- [Flutter Integration](#flutter-integration)
- [BuildContext and Widgets](#buildcontext-and-widgets)
- [Platform Plugins](#platform-plugins)
- [Pure Worker Logic](#pure-worker-logic)
- [Bloc / Cubit Integration](#bloc-cubit-integration)
- [Search Example](#search-example)
- [Repository Integration](#repository-integration)
- [Dependency Injection](#dependency-injection)
  - [App-scoped pool](#app-scoped-pool)
  - [Lazy app-scoped service](#lazy-app-scoped-service)
  - [Feature-scoped worker](#feature-scoped-worker)
- [Web Workers](#web-workers)
- [Web Worker Build](#web-worker-build)
- [Web Deployment](#web-deployment)
- [Web Worker 404](#web-worker-404)
- [Web Type Errors](#web-type-errors)
- [Web CSP](#web-csp)
- [Web Worker Limits](#web-worker-limits)
- [Wasm](#wasm)
- [Native Platforms](#native-platforms)
- [Common Workload Patterns](#common-workload-patterns)
  - [JSON](#json)
- [Image Processing](#image-processing)
- [Compression](#compression)
- [Cryptography](#cryptography)
- [File Processing](#file-processing)
- [Sorting and Aggregation](#sorting-and-aggregation)
- [Heavy Algorithms / ML](#heavy-algorithms-ml)
- [Performance Cost Model](#performance-cost-model)
- [Performance Profiling](#performance-profiling)
- [Debug vs Release Benchmarks](#debug-vs-release-benchmarks)
- [UI Responsiveness](#ui-responsiveness)
- [Memory](#memory)
- [Battery and Thermals](#battery-and-thermals)
- [Worker Pool Statistics](#worker-pool-statistics)

---

# Flutter Integration

Keep on main isolate:

- Widgets;
- `BuildContext`;
- navigation;
- rendering;
- most state emission;
- framework object manipulation.

Move to workers:

```text
pure CPU transformation
```

then return compact results.

Preferred architecture:

```text
Widget
↓
Cubit/ViewModel
↓
Repository/Application Service
↓
CPU Processing Service
↓
Squadron Worker/Pool
```

Avoid:

```text
Widget
↓
generated Squadron Worker directly
```

throughout the UI tree.

---

# BuildContext and Widgets

Never put these in worker service messages:

```dart
BuildContext
Widget
Element
State
RenderObject
AnimationController
TextEditingController
```

They belong to Flutter UI/runtime state, not the worker message model.

Bad:

```dart
await worker.render(context);
```

Better:

```dart
final request = RenderModel(
  width: constraints.maxWidth,
  data: immutableData,
);

final result = await processingService.process(request);
```

---

# Platform Plugins

Do not assume every Flutter plugin can be invoked safely from a worker isolate.

Some Flutter platform-channel use cases can support background-isolate messaging through Flutter's background messenger infrastructure, but:

- plugin implementations vary;
- some APIs assume root/main isolate;
- web behavior differs;
- plugins may have native-thread restrictions.

Before moving plugin use into a Squadron worker:

1. verify the plugin's official background-isolate support;
2. verify Flutter's current platform-channel requirements;
3. test target platforms;
4. prefer doing plugin I/O on the main/root isolate and CPU transformation in the worker when uncertain.

Squadron orchestration can technically enable workers to call shared main-thread services, but that adds another RPC hop and should not be the default architecture. Current Squadron docs describe this shared-service capability.

---

# Pure Worker Logic

Prefer:

```dart
@SquadronMethod()
FutureOr<ParsedDocument> parse(DocumentPayload payload) {
  return parser.parse(payload);
}
```

where parsing is deterministic and isolated.

Benefits:

- easier unit tests;
- cross-platform portability;
- easier serialization;
- fewer plugin restrictions;
- predictable failure semantics.

---

# Bloc / Cubit Integration

Preferred:

```text
UI event
↓
Cubit
↓
Processing repository/service
↓
Squadron worker
↓
result
↓
Cubit checks request revision
↓
emit state
```

Do not put:

```text
Worker
WorkerPool
WorkerException
ValueTask
```

into Bloc state unless the UI explicitly manages worker infrastructure.

Bloc should reason about:

```text
loading
success
failure
progress
```

not Squadron internals.

---

# Search Example

For CPU-heavy local search:

```text
query changed
↓
debounce
↓
increment revision
↓
cancel previous cooperative token
↓
worker search
↓
result returns
↓
check revision
↓
emit result if current
```

For remote search:

```text
HTTP request
```

is I/O and usually does not need Squadron.

Only offload expensive client-side parsing/ranking/transformation.

---

# Repository Integration

Do not use workers merely because code sits inside a repository.

Bad:

```dart
class UserRepository {
  Future<User> fetchUser() {
    return worker.fetchUser();
  }
}
```

when `fetchUser()` is just HTTP.

Better:

```text
Repository
↓
HTTP fetch
↓
large CPU transform
↓
ProcessingService/Squadron
```

Move CPU work, not architecture labels.

---

# Dependency Injection

Choose lifecycle deliberately.

## App-scoped pool

Use when:

- worker workload is common;
- startup amortization is valuable;
- memory is acceptable.

## Lazy app-scoped service

Use when:

- workload may not be used every session;
- first use can pay startup cost.

## Feature-scoped worker

Use when:

- feature has expensive initialization;
- worker can be stopped when leaving long-lived feature scope.

DI container teardown should stop owned workers/pools.

Do not register every generated pool as permanent singleton by habit.

---

# Web Workers

Web is not just "native isolates compiled to JavaScript."

Current Squadron web implementation uses actual browser Web Workers. Memory/global scope and transfer behavior differ from native isolates.

Test web separately.

---

# Web Worker Build

For a Squadron service file such as:

```text
lib/hello.dart
```

the generator produces a web entry point such as:

```text
lib/hello.web.g.dart
```

Current documentation requires compiling that worker entry point into a web-served artifact.

JavaScript:

```bash
dart compile js \
  "lib/hello.web.g.dart" \
  -o "web/workers/hello.web.g.dart.js"
```

WebAssembly:

```bash
dart compile wasm \
  "lib/hello.web.g.dart" \
  -o "web/workers/hello.web.g.dart.wasm"
```

Ensure `@SquadronService(baseUrl: ...)` matches deployed worker location.

Do not assume `flutter build web` magically fixes an incorrectly located Squadron worker artifact unless your build pipeline explicitly integrates the generation/compilation step.

---

# Web Deployment

Production CI must verify worker output exists.

A useful build sequence:

```text
dart pub get
↓
build_runner generate
↓
compile each generated *.web.g.dart worker
↓
flutter build web
↓
copy/verify worker artifacts
↓
deploy
↓
smoke-test actual Worker startup
```

Automate this.

Do not rely on developers manually compiling workers before release.

---

# Web Worker 404

Current Squadron troubleshooting docs identify:

```text
wrong baseUrl
or
worker artifact not compiled/copied
```

as common causes of web worker 404 failures.

Debug:

1. inspect browser Network panel;
2. inspect generated Worker URL;
3. request the URL directly;
4. verify deployment path;
5. verify base URL;
6. verify JS/Wasm worker build exists.

Do not debug worker service logic before worker script loading succeeds.

---

# Web Type Errors

If native succeeds but web fails with errors such as:

```text
double is not subtype of int
missing property
unknown custom type
```

inspect:

- marshaler;
- numeric conversion;
- generic collection assumptions;
- generated code;
- Squadron/package-builder version compatibility.

Current Squadron docs specifically describe JavaScript's number representation and custom type marshaling as web-specific concerns.

---

# Web CSP

Squadron's current primary docs focus on worker URL generation/deployment rather than prescribing one universal CSP.

If your application deploys Content Security Policy, verify that it permits the exact worker loading strategy and worker asset origin used by the generated deployment.

In practice, review directives affecting:

- worker script loading;
- script sources;
- same-origin worker assets;
- Wasm compilation/loading.

Do not weaken CSP broadly just to make workers start.

Change only the directives required by your verified deployment model.

---

# Web Worker Limits

Do not create very large browser pools.

Practical concurrency depends on:

- browser scheduler;
- device;
- CPU count;
- page memory;
- background-tab throttling;
- mobile browser policy.

Benchmark real browsers.

Do not assume desktop Chrome results represent mobile Safari or low-end Android browsers.

---

# Wasm

Current Squadron supports web workers compiled to both JavaScript and WebAssembly and exposes target-platform controls for JS/Wasm/web.

Do not assume Wasm is automatically faster.

Benchmark the actual algorithm.

WebAssembly performance can depend on:

- algorithm;
- generated code;
- browser;
- data transfer;
- warmup;
- memory behavior.

---

# Native Platforms

On Android, iOS, macOS, Windows, Linux, and Dart VM/server, Squadron uses native Dart isolate semantics through its VM target.

The key architectural concern is not the OS name but:

```text
Dart Native isolate
```

versus:

```text
browser Web Worker
```

Keep platform-specific plugin dependencies outside worker logic unless explicitly supported.

---

# Common Workload Patterns

## JSON

Offload only when parse/transform cost is material.

Bad:

```text
2 KB JSON
→ worker
```

Better:

```text
large response
↓
measure decode/transform jank
↓
offload if meaningful
```

Do not count network latency as parsing cost.

---

# Image Processing

Strong candidate when processing is CPU-heavy.

Design request around:

```text
bytes
target dimensions
quality/options
```

rather than large UI objects.

Watch:

- input byte size;
- decoded bitmap size;
- output size;
- worker count;
- simultaneous image memory peaks.

A pool processing four 40-megapixel images simultaneously can exhaust memory even if CPU has four cores.

---

# Compression

Compression/decompression often benefits from worker isolation.

Measure:

```text
input copy/transfer
+
compression
+
output transfer
```

For small inputs, worker overhead may dominate.

Batch multiple small files if appropriate.

---

# Cryptography

CPU-heavy cryptographic work can be a worker candidate.

But worker offloading changes secret lifecycle:

```text
secret bytes
↓
worker message boundary
↓
worker memory
```

Do not move sensitive material casually.

If cryptography is already performed by a native platform/FFI implementation with its own threading, adding Squadron may add overhead rather than improve throughput.

Benchmark and threat-model.

---

# File Processing

Split:

```text
file read        → I/O
parse/decode     → CPU
transform        → CPU
file write       → I/O
```

Do not move the entire pipeline to a worker simply because one stage is CPU-heavy.

Architecture may be:

```text
main/service reads file
↓
worker parses/transforms bytes
↓
main/service persists result
```

unless worker-side file access is explicitly appropriate and tested.

---

# Sorting and Aggregation

Large collections may benefit.

Small collections usually do not.

Benchmark crossover size.

Do not send:

```text
20 MB list
→ worker
```

to perform:

```dart
values.take(10)
```

---

# Heavy Algorithms / ML

Use Squadron when the algorithm is:

- Dart-executable;
- CPU-heavy;
- worker-safe;
- message-friendly.

Do not automatically wrap platform ML SDKs or GPU delegates in a worker.

Those systems may have:

- native thread pools;
- GPU contexts;
- plugin restrictions;
- their own asynchronous execution.

---

# Performance Cost Model

Always measure these separately if optimizing serious workloads:

```text
Tstartup
Tmarshal_in
Ttransfer_in
Tqueue
Tcompute
Tmarshal_out
Ttransfer_out
Tpostprocess
```

Then:

```text
Ttotal_worker
=
sum(all above)
```

Compare against:

```text
Tmain
```

and, more importantly for Flutter:

```text
main-isolate blocked duration
```

A worker solution can be worthwhile even with slightly larger `Ttotal_worker` if it removes a 100 ms UI stall.

---

# Performance Profiling

Compare:

```text
A. main isolate
B. compute / Isolate.run
C. one persistent Squadron Worker
D. Squadron WorkerPool size 2
E. Squadron WorkerPool size N
```

Use production-sized input.

Measure:

- median;
- p95/p99;
- cold latency;
- warm latency;
- queue wait;
- worker execution;
- UI frame times;
- memory;
- CPU;
- battery/temperature for mobile.

Do not benchmark only one ideal input.

---

# Debug vs Release Benchmarks

Do not draw production performance conclusions from Flutter debug mode.

Debug mode includes instrumentation/assertions and different compiler/runtime behavior.

Benchmark:

- profile mode for Flutter performance analysis;
- release mode for final throughput/latency where practical.

Use consistent device thermal/battery conditions.

---

# UI Responsiveness

Measure Flutter frame behavior, not only worker stopwatch duration.

Ask:

```text
Did main-isolate jank disappear?
Did build/layout/raster still spike?
Did result handling create another large sync stall?
```

Example:

```text
worker parses 50 MB JSON
↓
returns giant Map
↓
main isolate builds 100,000 widgets
```

still janks.

Workers only solve the stages they actually move.

---

# Memory

Each native isolate has its own execution context and object memory.

Dart documents base isolate overhead as relatively small, but real application worker memory is usually dominated by:

- loaded code/data;
- service state;
- copied payloads;
- decoded images;
- caches;
- concurrent results.

Measure memory peaks, not just steady-state memory.

Large pools can multiply:

```text
dataset size × workers
```

if each worker holds a copy.

---

# Battery and Thermals

On mobile:

```text
more workers
→ more sustained CPU
→ more battery
→ more heat
→ possible throttling
```

A burst that is faster on a cool development device may become slower after sustained execution due to thermal throttling.

For background-like processing, consider:

- fewer workers;
- chunking;
- user interaction priority;
- backend processing.

---

# Worker Pool Statistics

Use current pool statistics during profiling:

```dart
for (final stat in pool.stats) {
  debugPrint(
    'workload=${stat.workload}, '
    'errors=${stat.totalErrors}, '
    'uptime=${stat.upTime}, '
    'init=${stat.initTime}',
  );
}
```

Do not log continuously in production hot paths.

Sample or aggregate.

---
