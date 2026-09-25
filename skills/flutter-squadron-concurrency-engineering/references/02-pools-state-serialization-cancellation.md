# Reference: 02 Pools State Serialization Cancellation

_Source lines 852–1951 from the supplied guide. Content below is preserved for progressive disclosure._

## Table of contents

- [Worker Pools](#worker-pools)
- [ConcurrencySettings](#concurrencysettings)
- [CPU Pools: maxParallel](#cpu-pools-maxparallel)
- [Pool Sizing](#pool-sizing)
- [Oversubscription](#oversubscription)
- [Pool Queueing](#pool-queueing)
- [Backpressure](#backpressure)
- [Task Granularity](#task-granularity)
- [WorkerPool execute()](#workerpool-execute)
- [Stateful Workers](#stateful-workers)
- [Stateful Pool Warning](#stateful-pool-warning)
- [Worker Orchestration](#worker-orchestration)
- [Serialization](#serialization)
- [Native Data Movement](#native-data-movement)
- [Web Data Movement](#web-data-movement)
- [SquadronMarshaler](#squadronmarshaler)
- [MarshalingContext](#marshalingcontext)
- [Typed Data](#typed-data)
- [TransferableTypedData](#transferabletypeddata)
- [Large Payloads](#large-payloads)
- [Prefer Compute Near Data](#prefer-compute-near-data)
- [Immutable Inputs](#immutable-inputs)
- [Streams](#streams)
- [Cancellation](#cancellation)
- [Cooperative Cancellation](#cooperative-cancellation)
- [Pool Task Cancellation](#pool-task-cancellation)
- [Timeouts](#timeouts)
- [Latest-Wins Workflows](#latest-wins-workflows)
- [Race Conditions](#race-conditions)
- [Errors](#errors)
- [Custom Worker Exceptions](#custom-worker-exceptions)
- [Worker Crash Recovery](#worker-crash-recovery)
- [Logging](#logging)
- [Observability](#observability)
- [Performance Counters](#performance-counters)

---

# Worker Pools

Use a pool when independent tasks need actual concurrency.

Current generated pools manage multiple Workers and provide:

- task scheduling;
- load balancing;
- dynamic worker creation/removal;
- concurrency controls;
- statistics.

Example:

```dart
final pool = ImageProcessorWorkerPool(
  concurrencySettings: const ConcurrencySettings(
    minWorkers: 1,
    maxWorkers: 3,
    maxParallel: 1,
  ),
);

try {
  await pool.start();

  final results = await Future.wait([
    pool.process(imageA),
    pool.process(imageB),
    pool.process(imageC),
  ]);

  use(results);
} finally {
  pool.stop();
}
```

Use one worker instead when tasks are naturally sequential or state-affine.

---

# ConcurrencySettings

Current API:

```dart
const ConcurrencySettings({
  int minWorkers = 0,
  int maxWorkers = 0,
  int maxParallel = 1,
})
```

`maxWorkers == 0` means unbounded maximum worker count according to the current API docs. Do **not** leave this unintentionally unbounded for bursty production CPU workloads.

Interpret:

```text
minWorkers  = minimum workers kept alive
maxWorkers  = maximum pool worker count
maxParallel = tasks allowed to be posted to one worker
```

`maxParallel` is not the same as native parallel CPU execution inside one isolate.

Current API documentation explicitly notes that synchronous CPU work in one worker runs to completion before another task can execute.

---

# CPU Pools: maxParallel

For CPU-bound workloads, current Squadron documentation recommends `maxParallel: 1` in almost all cases so the scheduler distributes CPU-heavy jobs across actual workers instead of stacking tasks onto one busy worker.

Prefer:

```dart
const ConcurrencySettings(
  minWorkers: 1,
  maxWorkers: 3,
  maxParallel: 1,
)
```

for CPU work.

Do not choose:

```dart
maxParallel: 20
```

to create "20 threads."

It does not.

---

# Pool Sizing

Do not use this universal rule:

```text
workers = processor count
```

Instead consider:

- workload CPU intensity;
- task duration;
- task frequency;
- memory per worker;
- payload size;
- Flutter UI/raster CPU demand;
- low-end device core count;
- thermal constraints;
- browser environment;
- app background/foreground use;
- whether native libraries themselves use internal threads.

Start conservatively.

For mobile CPU-heavy work, common experiments might compare:

```text
1 worker
2 workers
3 workers
```

rather than immediately occupying every logical processor.

Measure:

- app frame times;
- total task throughput;
- per-task latency;
- memory;
- battery;
- device temperature/throttling.

The correct number is empirical.

---

# Oversubscription

Too many workers can make the system worse through:

- context switching;
- CPU contention;
- cache misses;
- memory duplication;
- scheduler overhead;
- thermal throttling;
- battery drain;
- reduced UI/raster headroom.

A pool that finishes CPU jobs 10% sooner but causes visible scrolling jank may be a regression.

Optimize user experience, not just throughput.

---

# Pool Queueing

When available workers reach capacity, additional tasks wait for scheduling.

Current `Task` APIs expose:

- `isPending`;
- `isRunning`;
- `isFinished`;
- `waitTime`;
- `runningTime`.

Use these metrics to distinguish:

```text
slow computation
```

from:

```text
long queue wait
```

A task with:

```text
waitTime = 900 ms
runningTime = 30 ms
```

does not have a compute problem.

It has a queue/scheduling/load problem.

---

# Backpressure

Do not allow application producers to generate infinite worker backlog.

Squadron provides cancellation/task management, but application-level workload policy is still your responsibility.

For high-rate producers, choose one or more:

- debounce;
- throttle;
- batch;
- request coalescing;
- latest-wins;
- bounded upstream queue;
- cancel obsolete pending tasks;
- reject work when system is overloaded.

Example local search:

```text
keystroke
↓
debounce 150 ms
↓
cancel old pending search
↓
submit latest query
```

Do not dispatch a search worker request for every character typed at 60 Hz.

---

# Task Granularity

Aim for worker calls whose computation dominates dispatch overhead.

Bad:

```dart
for (final item in items) {
  await worker.normalizeOne(item);
}
```

for 100,000 trivial records.

Better:

```dart
final normalized = await worker.normalizeBatch(items);
```

Batch until:

- worker call overhead is amortized;
- payload size remains reasonable;
- cancellation latency remains acceptable.

Huge monolithic batches are also problematic because:

- cancellation checkpoints become sparse;
- memory peaks increase;
- latency to first result increases.

Use meaningful chunks.

---

# WorkerPool execute()

Current pools expose `execute()` for reserving one Worker through a multi-step operation.

Squadron documents that the worker remains reserved for the callback; with `maxParallel: 1`, other pool tasks are not dispatched onto that worker until the callback completes.

Use when multiple calls must remain worker-affine:

```dart
final result = await pool.execute((worker) async {
  await worker.begin();
  await worker.processPartA();
  await worker.processPartB();
  return worker.commit();
});
```

Do not use `execute()` merely to wrap one ordinary method call.

---

# Stateful Workers

Default to stateless services:

```text
input
↓
compute
↓
output
```

Use state only when it materially improves architecture/performance, such as:

- expensive index loaded once;
- precomputed lookup structure;
- initialized codec;
- parser table;
- immutable model state.

Risks include:

- stale state;
- cross-request contamination;
- async interleaving;
- memory retention;
- pool affinity problems;
- harder tests.

Current Squadron docs recommend stateless workers by default and explain `execute()` + `maxParallel: 1` for exclusive stateful workflows.

---

# Stateful Pool Warning

Never assume two pool calls hit the same worker:

```dart
await pool.loadIndex(index);
final result = await pool.search(query);
```

The second call may go elsewhere.

If state must be retained by one worker, use:

- one dedicated `Worker`; or
- a deliberate `pool.execute()` worker-affinity block.

Do not create accidental stateful pool APIs.

---

# Worker Orchestration

Squadron supports worker-to-worker orchestration through shared services and `@sharedService`.

Use only when a clear architecture needs:

- shared worker cache;
- centralized specialized worker;
- worker pipeline.

Do not build an unnecessary distributed graph of workers.

Every hop adds:

```text
serialization
+
queueing
+
failure surface
+
debugging complexity
```

Prefer fewer boundaries.

---

# Serialization

Treat every public worker method as a process/thread boundary API.

Current Squadron supports common values including:

- `null`;
- `bool`;
- `int`;
- `double`;
- `String`;
- `List`;
- `Map`;
- `Set`;
- typed data such as `Uint8List`;
- suitable nested combinations.

Custom objects require marshaling when they cannot naturally cross the boundary, especially for web.

Do not pass giant arbitrary domain graphs.

---

# Native Data Movement

On native:

```text
SendPort.send()
```

is the underlying mechanism.

Current Squadron docs state that most objects are copied/deep-cloned across isolates, while some values such as strings and `TransferableTypedData` can be transferred efficiently.

Dart's official `TransferableTypedData` documentation states that creation is proportional to input byte count, but sending the resulting transferable between isolates is constant-time and transfers ownership of the transferable data.

Do not forget the creation/materialization cost when benchmarking.

---

# Web Data Movement

On web, Squadron uses browser `postMessage`/structured-clone behavior.

Current Squadron docs emphasize:

- type identity can be erased;
- JavaScript numbers do not preserve Dart `int`/`double` distinction in transit;
- custom classes need marshaling.

Do not assume a custom Dart class can cross Web Workers unchanged.

---

# SquadronMarshaler

Use a `SquadronMarshaler<T, S>` for custom DTOs.

Example:

```dart
final class ImageJob {
  const ImageJob({
    required this.width,
    required this.height,
    required this.bytes,
  });

  final int width;
  final int height;
  final Uint8List bytes;
}

final class ImageJobMarshaler
    implements SquadronMarshaler<ImageJob, List<Object?>> {
  const ImageJobMarshaler();

  @override
  List<Object?> marshal(
    ImageJob data, [
    MarshalingContext? context,
  ]) {
    return [
      data.width,
      data.height,
      data.bytes,
    ];
  }

  @override
  ImageJob unmarshal(
    List<Object?> data, [
    MarshalingContext? context,
  ]) {
    return ImageJob(
      width: (data[0] as num).toInt(),
      height: (data[1] as num).toInt(),
      bytes: data[2] as Uint8List,
    );
  }
}
```

Current marshaling API defines the contract:

```text
unmarshal(marshal(value))
```

must produce an equivalent value.

Keep serialized representations:

- explicit;
- stable;
- compact;
- primitive/typed-data based.

---

# MarshalingContext

Current Squadron marshalers can use `MarshalingContext` to:

- preserve repeated object identity;
- support cyclic object graphs.

Do not use cyclic domain graphs as the default worker-message design just because the marshaler can support them.

Prefer simple DTOs.

Complex graph reconstruction increases:

- code complexity;
- transfer size;
- CPU overhead;
- web portability risk.

---

# Typed Data

Prefer typed binary data for binary workloads:

```dart
Uint8List
Float32List
Int32List
```

instead of:

```dart
List<int>
```

when the data is intrinsically binary/numeric.

Benefits can include:

- compact representation;
- fewer object allocations;
- better compatibility with codecs/native code.

Still measure transfer cost.

A 100 MB `Uint8List` is not "cheap" just because it is typed data.

---

# TransferableTypedData

Use `TransferableTypedData` only in VM-specific designs where native transfer semantics are explicitly valuable.

Important Dart semantics:

- constructing it from data costs O(n);
- sending it between isolates is optimized/constant-time;
- transferred data ownership moves;
- materialization is effectively single-use for the underlying transfer.

Do not put native `TransferableTypedData` into a cross-platform public service API intended for web unless the implementation explicitly abstracts the platform difference.

Do not describe Squadron web transfers as zero-copy unless you have verified the current implementation and browser transfer-list semantics for the exact path.

---

# Large Payloads

Before moving large payloads, calculate:

```text
input MB
+
output MB
+
number of worker calls
+
copy/marshal cost
```

Potentially expensive examples:

- 50 MB JSON strings;
- decoded 80 MB model graphs;
- uncompressed images;
- audio buffers;
- matrices.

Bad architecture:

```text
main
→ 50 MB dataset
→ worker
→ tiny answer

repeat 100 times
```

Better where justified:

```text
initialize worker once with dataset
↓
send small query messages
↓
receive small results
```

Only use worker state this way if its lifecycle/affinity semantics are deliberate.

---

# Prefer Compute Near Data

A good worker API minimizes repeated transport.

For a search index:

```text
main → index dataset once → dedicated worker
main → small query
worker → small result IDs
```

can outperform:

```text
main → full dataset + query
```

for every search.

But a stateful worker consumes memory continuously.

Measure the tradeoff.

---

# Immutable Inputs

Treat requests as immutable snapshots.

Bad:

```dart
final data = <int>[...];
final future = worker.process(data);
data.add(999);
```

Even when platform transport copies data, relying on timing is confusing.

Prefer:

```dart
final request = List<int>.unmodifiable(data);
final result = await worker.process(request);
```

Build a clear handoff boundary.

---

# Streams

Squadron currently supports `Stream<T>` service methods. Worker-side stream errors are propagated to the client stream.

Example:

```dart
@SquadronMethod()
Stream<double> analyze(Uint8List bytes) async* {
  for (var i = 0; i < 100; i++) {
    final progress = expensiveStep(bytes, i);
    yield progress;
  }
}
```

Client:

```dart
final subscription = worker.analyze(bytes).listen(
  (progress) {
    updateProgress(progress);
  },
  onError: (Object error, StackTrace stackTrace) {
    reportFailure(error, stackTrace);
  },
);
```

Use worker streams for meaningful progressive results.

Do not emit per-byte/per-iteration progress events so frequently that message overhead dominates.

Throttle/coalesce progress.

---

# Cancellation

Cancellation has two distinct meanings:

```text
stop caller from caring about result
```

versus:

```text
stop CPU work inside worker
```

Do not confuse them.

Current Squadron supports cooperative cancellation using tokens from `package:cancelation_token`.

The package uses the spelling:

```dart
CancelationToken
CancelableToken
CanceledException
TimeoutToken
CompositeToken
```

according to the current dependency API.

---

# Cooperative Cancellation

For long-running CPU loops, accept a token and check it periodically:

```dart
import 'package:cancelation_token/cancelation_token.dart';
import 'package:squadron/squadron.dart';

@SquadronMethod()
Future<int> processLargeDataset(
  List<int> values, [
  CancelationToken? token,
]) async {
  var total = 0;

  for (var i = 0; i < values.length; i++) {
    if ((i & 1023) == 0) {
      token?.throwIfCanceled();
    }

    total += expensiveTransform(values[i]);
  }

  return total;
}
```

Caller:

```dart
final token = CancelableToken();

final future = worker.processLargeDataset(
  values,
  token,
);

// Later:
token.cancel();

try {
  await future;
} on CanceledException {
  // Expected cancellation.
}
```

Check often enough to make cancellation responsive, but not so often that checking becomes measurable overhead.

---

# Pool Task Cancellation

Pool APIs also support task cancellation.

Current Squadron documentation distinguishes:

### Pending task

Canceling removes it from the queue before it reaches a worker.

### Running value task

Canceling the pool task/caller result does **not necessarily stop worker CPU work**. Without a cooperative token, the worker may continue until completion and its result is discarded/detached.

### Running stream task

Stream cancellation has special stream-control behavior.

Current docs explicitly describe this "detach vs stop" distinction.

For expensive CPU jobs:

> Use cooperative cancellation if you need the worker itself to stop.

---

# Timeouts

Use `TimeoutToken` for cooperative worker timeouts:

```dart
final token = TimeoutToken(
  const Duration(seconds: 5),
);

try {
  await worker.processLargeDataset(
    values,
    token,
  );
} on CanceledException {
  // Treat as timeout/cancellation according to application policy.
}
```

Current cancellation-token docs note that timeout countdown starts according to the token implementation lifecycle; verify the dependency's current behavior when precise timeout semantics matter.

Do not assume:

```dart
future.timeout(...)
```

stops worker computation.

It may only stop waiting on the caller side.

---

# Latest-Wins Workflows

Workers do not solve stale-result races.

Example:

```text
query "f"
→ task A

query "flutter"
→ task B

B returns
↓
UI shows correct result

A returns later
↓
UI accidentally reverts to stale result
```

Use request revisions even when using cancellation:

```dart
final class SearchCoordinator {
  SearchCoordinator(this._service);

  final SearchProcessingService _service;

  int _revision = 0;
  CancelableToken? _token;

  Future<List<int>?> search(String query) async {
    final revision = ++_revision;

    _token?.cancel();
    final token = CancelableToken();
    _token = token;

    try {
      final result = await _service.search(
        query,
        token,
      );

      if (revision != _revision) {
        return null;
      }

      return result;
    } on CanceledException {
      return null;
    }
  }

  void dispose() {
    _token?.cancel();
  }
}
```

Cancellation reduces wasted work.

Revision checks guarantee stale results cannot win.

Use both for interactive workloads.

---

# Race Conditions

Isolates remove normal shared-memory races between isolates, but application-level races remain:

- old request finishes after new request;
- logout occurs during work;
- feature closes before result arrives;
- two worker jobs update same database;
- multiple pool jobs compute conflicting versions.

Concurrency correctness is an application concern.

---

# Errors

Worker exceptions cross a serialization boundary.

Current Squadron behavior wraps ordinary worker exceptions in `WorkerException`, carrying error details and stack information where possible.

Do not expose low-level worker errors directly to UI.

Map:

```text
WorkerException
↓
ImageProcessingFailure / SearchFailure
↓
Cubit/Repository result
↓
user-facing state
```

---

# Custom Worker Exceptions

For meaningful cross-worker exceptions, current Squadron supports custom `WorkerException` subclasses with serialization/deserialization registration through `ExceptionManager`.

Only create a custom wire-level exception when callers need structured information.

Do not create one custom exception type per internal implementation detail.

Example domain mapping:

```dart
try {
  return await worker.parse(input);
} on WorkerException catch (error, stackTrace) {
  throw DocumentProcessingFailure(
    message: 'Document processing failed',
    cause: error,
    stackTrace: stackTrace,
  );
}
```

---

# Worker Crash Recovery

Do not assume every worker crash is automatically retried safely.

Squadron pools manage worker lifecycle and scaling, but application-level retry semantics must account for whether a task is safe to replay.

For failures such as:

- worker initialization crash;
- channel termination;
- fatal processing error;

first determine:

```text
Can this operation be retried safely?
```

Retry only idempotent/retry-safe operations.

Do not automatically replay:

- financial mutations;
- filesystem destructive actions;
- operations with external side effects.

If recovery requires recreating the owned Worker/Pool, perform that at the service/lifecycle boundary, not throughout UI code.

Unless current package documentation explicitly guarantees replacement/retry semantics for the exact failure, do not present automatic recovery as guaranteed.

---

# Logging

Current Squadron exposes `channelLogger` on workers and pools and logs internal events such as:

- worker lifecycle;
- channel open/close;
- request/response activity;
- cancellation;
- internal state;
- errors.

Example:

```dart
import 'package:logger/logger.dart';

final logger = Logger(
  level: Level.debug,
);

final worker = TextProcessorWorker()
  ..channelLogger = logger;

try {
  await worker.start();
  await worker.countWords('...');
} finally {
  worker.stop();
}
```

Do not leave trace-level worker protocol logs enabled in production without evaluating:

- log volume;
- privacy;
- payload exposure;
- performance.

---

# Observability

Current Squadron exposes worker statistics including values such as:

- current workload;
- total workload;
- uptime;
- idle time;
- initialization time;
- errors;
- active connections;
- maximum workload.

Use these to diagnose:

```text
queue pressure
worker imbalance
cold initialization
worker saturation
error rate
```

Record application-level metrics too:

```text
task type
payload size
queue wait
compute duration
end-to-end latency
cancel count
stale-result count
```

Do not log full sensitive payloads.

---

# Performance Counters

Squadron also exposes `PerfCounter` infrastructure with:

- total calls;
- total errors;
- total elapsed time;
- maximum elapsed time.

Use instrumentation to answer:

```text
Is the worker actually busy?
Is queueing dominant?
Are errors concentrated on one worker?
Is initialization expensive?
```

Do not optimize blindly.

---
