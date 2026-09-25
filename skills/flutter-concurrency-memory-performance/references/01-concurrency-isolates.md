# Concurrency, Isolates, Backpressure & Async Safety

Source-preserving excerpt from the uploaded production skill. Use this file when the core `SKILL.md` routes to this topic.

## Table of contents
- [Execution Model](#execution-model)
  - [Root/UI isolate](#rootui-isolate)
  - [Event loop](#event-loop)
- [Futures, Streams, and Async Work](#futures-streams-and-async-work)
- [Frame Scheduling and Smoothness](#frame-scheduling-and-smoothness)
  - [Frame budgets](#frame-budgets)
- [Repository Inspection Workflow](#repository-inspection-workflow)
- [Performance Diagnostic Workflow](#performance-diagnostic-workflow)
- [CPU-Bound vs I/O-Bound Classification](#cpu-bound-vs-io-bound-classification)
  - [Usually CPU-bound](#usually-cpu-bound)
  - [Usually I/O-bound](#usually-io-bound)
- [Isolate Decision Tree](#isolate-decision-tree)
  - [Keep work on the current isolate when](#keep-work-on-the-current-isolate-when)
  - [Use ordinary async I/O when](#use-ordinary-async-io-when)
  - [Evaluate Isolate.run when](#evaluate-isolaterun-when)
  - [Evaluate Flutter compute when](#evaluate-flutter-compute-when)
  - [Evaluate Isolate.spawn / persistent worker when](#evaluate-isolatespawn-persistent-worker-when)
  - [Evaluate a worker pool only when](#evaluate-a-worker-pool-only-when)
- [Isolate Transfer Costs](#isolate-transfer-costs)
  - [Large binary data](#large-binary-data)
- [Worker Isolate Pattern](#worker-isolate-pattern)
  - [Initialization](#initialization)
  - [Message schema](#message-schema)
  - [Queueing](#queueing)
  - [Cancellation](#cancellation)
  - [Errors](#errors)
  - [Restart](#restart)
  - [Graceful shutdown](#graceful-shutdown)
- [Backpressure](#backpressure)
- [Async Safety and Race Prevention](#async-safety-and-race-prevention)
  - [Stale result rejection](#stale-result-rejection)
  - [Widget lifecycle](#widget-lifecycle)
  - [Async mutex / serialization](#async-mutex-serialization)
- [Large JSON Parsing](#large-json-parsing)
- [Flutter Web](#flutter-web)
  - [Web Workers](#web-workers)
  - [Wasm and rendering](#wasm-and-rendering)
  - [Browser lifecycle](#browser-lifecycle)
- [Flutter Background Isolates and Plugins](#flutter-background-isolates-and-plugins)

---

# Execution Model

## Root/UI isolate

Dart Native executes Dart code inside isolates. Each isolate has its own Dart execution context and event loop and communicates through message passing rather than shared mutable Dart objects. Isolates can execute concurrently and can run in parallel on multiple CPU cores.

Flutter framework and application Dart code normally execute on the root isolate. UI/framework work, input handling, asynchronous callbacks, build work, layout-driving Dart code, and other callbacks that run there compete for that isolate's execution time.

### Current native thread topology

Do not repeat the older claim that every native Flutter application has a permanently separate Dart UI OS thread and platform OS thread.

Current Flutter has merged the UI/platform threads by default:

- iOS and Android: since Flutter 3.29.
- macOS and Windows: since Flutter 3.35.
- Linux: stable since Flutter 3.41.

Flutter tooling still describes UI/framework versus raster work as useful pipeline categories. Do not confuse that profiling vocabulary with a guarantee of separate operating-system threads.

The engine's raster work remains a distinct rendering concern, and GPU/display work adds another stage to the frame pipeline.

---

## Event loop

An isolate processes asynchronous events sequentially. Work running in one callback does not get preempted by another ordinary Dart event.

### Event queue

Typical sources include:

- timers
- I/O completions
- stream events
- platform events
- queued Futures
- input/lifecycle activity

### Microtask queue

Microtasks run before ordinary asynchronous events. Recursive or excessive microtask scheduling can starve timers, input, browser DOM events, and other work. Dart's own `scheduleMicrotask` API explicitly warns that continuously scheduling microtasks can starve the event queue.

### Event-loop starvation signals

Suspect starvation when:

- input becomes delayed while CPU remains busy
- timers fire significantly late
- frames stop progressing during Dart CPU work
- callbacks perform long synchronous loops
- recursive microtasks continuously reschedule themselves
- one stream listener performs expensive synchronous processing
- a callback processes an entire queue without yielding
- an `async` method does substantial work before its first `await`
- work after an `await` still performs a large synchronous computation

**Rule:** changing a synchronous method to `async` does not make its synchronous portions parallel.

---

# Futures, Streams, and Async Work

A `Future` represents a result available later. It does not itself mean another isolate executes the work. Dart asynchronous I/O may be implemented using runtime/OS facilities while Dart callbacks resume on the isolate event loop.

A `Future.timeout` does not generally stop the original computation. The source operation can continue and complete later. Never describe timeout as cancellation unless the underlying API explicitly aborts the operation.

For Streams:

- cancel owned `StreamSubscription`s when their scope ends
- understand whether producer pause/resume is honored
- never assume `pause()` gives true end-to-end backpressure
- beware paused broadcast subscriptions buffering independently
- avoid expensive synchronous listeners on high-rate streams
- close owned `StreamController`s
- implement producer-side capacity control where event volume can exceed consumer throughput

---

# Frame Scheduling and Smoothness

A frame can involve:

1. input/event handling
2. animation/ticker callbacks
3. framework build
4. layout
5. paint/display-list generation
6. compositing
7. rasterization
8. GPU/display presentation

A problem may therefore be predominantly:

- root-isolate/framework CPU
- layout
- paint
- raster/GPU
- image decoding/upload
- synchronization/platform integration

Do not prescribe an isolate for raster jank.

## Frame budgets

Use the actual display refresh rate and measured `FrameTiming`, not a hard-coded 16 ms assumption.

Approximate frame intervals:

| Refresh | Interval |
|---|---:|
| 60 Hz | 16.67 ms |
| 90 Hz | 11.11 ms |
| 120 Hz | 8.33 ms |

Android explicitly documents these shrinking deadlines, and Apple devices can vary refresh rate dynamically. Flutter exposes `Display.refreshRate`.

**Decision rule:** if a workload occasionally takes 9 ms, it might fit inside a 60 Hz scenario yet be sufficient to miss a 120 Hz deadline.

Do not assume the whole theoretical interval is freely available to application Dart code; other pipeline stages consume time too.

---

# Repository Inspection Workflow

Before editing performance-sensitive code, inspect:

- current Flutter/Dart SDK constraints
- target platforms
- architecture and dependency boundaries
- state-management subscriptions
- startup initialization
- synchronous work reachable from UI callbacks
- JSON/model conversion
- sorting/filtering/search
- compression/decompression
- cryptography
- image manipulation
- timers
- Streams and subscriptions
- controllers/notifiers
- listeners/observers
- existing isolates and workers
- platform channels
- FFI
- file/socket/network ownership
- database lifetimes
- caches
- global/static collections
- singleton/service-locator lifetime
- long lists/grids/slivers
- custom painters/effects
- existing performance traces and tests

Do not replace an existing abstraction merely because another abstraction is fashionable.

---

# Performance Diagnostic Workflow

For each issue:

1. Write a reproducible scenario.
2. Define a metric: frame duration, p90/p99 latency, CPU time, first-frame time, queue depth, RSS, heap after GC/lifecycle, request count, bytes allocated, etc.
3. Reproduce in a profile/release-appropriate environment.
4. Choose the profiler matching the suspected bottleneck.
5. Capture a baseline.
6. Identify the hottest relevant cause, not merely the most visible code.
7. Apply one targeted intervention.
8. Re-run the identical scenario.
9. Compare distributions and resource behavior.
10. Revert changes without measurable benefit.

Use custom `dart:developer` timeline events for application-specific phases when default traces cannot answer where time is going. `Timeline.startSync`, `finishSync`, and `timeSync` create timeline events; a synchronous timeline slice must finish before returning to the event queue.

---

# CPU-Bound vs I/O-Bound Classification

## Usually CPU-bound

Examples:

- large JSON decode/model conversion
- compression/decompression
- cryptography
- image transforms
- large document parsing
- numerical processing
- local full-text indexing
- large sorting/filtering pipelines
- serialization of large object graphs
- audio/video buffer processing

Evaluate moving these away from the root isolate when measured latency warrants it.

## Usually I/O-bound

Examples:

- HTTP requests
- sockets
- WebSockets
- asynchronous file operations
- platform asynchronous APIs
- asynchronous database calls

Prefer asynchronous APIs first.

CPU-heavy parsing, encryption, decompression, or transformation performed *after* I/O completion is a separate CPU-bound phase and may justify concurrency.

---

# Isolate Decision Tree

## Keep work on the current isolate when

- measured synchronous execution is small relative to latency/frame goals
- the operation is infrequent
- moving inputs/outputs costs as much as the computation
- work is tightly coupled to Flutter UI APIs
- native APIs require execution in the current context
- the extra architecture would not produce measurable improvement

Flutter's `compute` documentation describes offloading work longer than a few milliseconds as a possible use case and points to scheduler mechanisms for very small tasks, but treat that as guidance rather than a universal threshold. The true decision depends on current frame budget, device, message size, frequency, and workload.

## Use ordinary async I/O when

- the expensive part is waiting for HTTP/file/socket/database/platform I/O
- the library already exposes an asynchronous nonblocking API
- there is no significant synchronous processing step

## Evaluate `Isolate.run` when

- targeting Dart Native
- the job is one-off
- CPU-heavy enough to affect responsiveness
- input/output transfer is modest enough
- no long-lived worker state is required

`Isolate.run` creates a short-lived isolate and uses `Isolate.exit` semantics for its result in the same isolate group, which can avoid the ordinary final-message copy.

## Evaluate Flutter `compute` when

- a Flutter-facing convenience API is desirable
- the callback/task is naturally one-shot
- native target behavior is acceptable

On mobile and desktop, current Flutter documents `compute(fun, message)` as equivalent to `Isolate.run(() => fun(message))`.

**Web exception:** `compute` executes on the current browser event loop. It does not create Dart parallelism on Web.

## Evaluate `Isolate.spawn` / persistent worker when

- operations repeat
- worker initialization is substantial
- spawn overhead should be amortized
- persistent CPU-side indexes/codecs/state are useful
- multiple request/response messages are required
- explicit queueing/backpressure is required
- graceful shutdown is required

Current `Isolate.spawn` documentation gives base isolate memory overhead on the order of tens of kilobytes, before application state and workloads are included. Treat this as an order-of-magnitude API note, not an end-to-end memory estimate.

## Evaluate a worker pool only when

- one worker is demonstrably throughput-limited
- jobs can execute independently
- queue depth is measurable
- enough CPU capacity exists
- increased memory/thermal cost is acceptable
- benchmarks show additional workers improve the target metric

`Platform.numberOfProcessors` reports execution units, but is an upper hardware signal—not an appropriate automatic pool-size formula.

Start with minimal concurrency and benchmark 1, 2, … workers rather than choosing `numberOfProcessors` blindly.

---

# Isolate Transfer Costs

`SendPort.send` may traverse and copy the transitive mutable object graph. The API explicitly documents potentially linear-time copy cost. Supported immutable objects can be shared in applicable VM cases.

Therefore measure:

- serialized/input bytes
- number of reachable objects
- allocation impact
- output size
- send latency
- worker CPU duration

Avoid accidentally capturing large closures. `Isolate.spawn` documentation warns that closures can capture more state than expected, increasing message size or causing unsendable-object failures.

## Large binary data

For native isolate communication, consider `TransferableTypedData` when large typed/binary payloads otherwise require expensive copies.

Important cost model:

- creating transferable data still processes the bytes
- sending an already-created `TransferableTypedData` is constant-time
- ownership is transferred; the sender cannot subsequently materialize it

Use it where copy pressure is actually meaningful, not for small buffers.

---

# Worker Isolate Pattern

A production persistent worker should have:

## Initialization

- explicit worker entrypoint
- initialization failure propagation
- startup handshake
- worker/debug name
- `onError` listener installed at spawn
- `onExit` listener installed at spawn
- root-side reference to worker `Isolate`
- clearly owned ports

Installing error/exit monitoring at spawn avoids the race possible when listeners are added only after the worker has begun.

## Message schema

Use structured messages containing at least:

- request ID
- operation type
- payload
- optional generation/version
- optional deadline/cancellation token ID

Responses contain:

- request ID
- success/result or structured failure
- operation context
- error type/message
- stack trace where available

Never depend on response order alone.

## Queueing

Maintain:

- maximum pending jobs
- maximum in-flight jobs
- queue latency metrics
- rejection/drop/coalescing behavior

Do not allow producer rate to grow memory without bound.

## Cancellation

Choose explicitly:

- cooperative cancellation between chunks
- drop-before-start
- latest-request-wins invalidation
- stale-result rejection
- dedicated worker kill when killing the whole worker is semantically safe

Do not claim that killing a shared worker cleanly cancels one request; it terminates all work in that isolate.

## Errors

Propagate failures. Do not swallow worker exceptions.

Include:

- operation/request ID
- error
- stack trace
- worker identity
- retryability/idempotency metadata when relevant

## Restart

Restart only when semantics permit.

For a crashed worker:

- fail or requeue known pending requests intentionally
- replay only idempotent/retriable operations
- bound restart attempts
- apply backoff if repeated failure is possible
- preserve evidence of the crash

## Graceful shutdown

Preferred protocol:

1. stop accepting new requests
2. send shutdown command
3. drain or reject queued work according to contract
4. finish/abort active operation if supported
5. send shutdown acknowledgement
6. close worker ports
7. let worker exit
8. clean root-side maps/listeners

A `ReceivePort`/`RawReceivePort` can keep an isolate alive until closed. `Isolate.kill()` is a shutdown request; the default priority terminates before the next event, while immediate priority can terminate earlier. `Isolate.exit()` terminates synchronously and does not execute pending `finally` blocks.

Use forced kill as a last-resort lifecycle mechanism when graceful shutdown cannot complete safely.

---

# Backpressure

Every high-volume producer needs an overload policy.

Use one or more of:

- bounded FIFO queue
- latest-request-wins
- deduplication
- debounce
- throttle
- event coalescing
- drop oldest
- drop newest
- priority queue
- bounded parallelism
- producer pause when the source supports true flow control

Definitions:

- **Debounce:** wait for a quiet interval before executing.
- **Throttle:** execute no more often than a maximum frequency.
- **Coalescing:** combine multiple events into one unit of work.
- **Deduplication:** avoid equivalent work that is already complete or in flight.
- **Latest wins:** invalidate results belonging to older generations.

Example: a search field that creates a parsing job on every keystroke should generally debounce or invalidate stale generations instead of accumulating an unbounded worker queue.

---

# Async Safety and Race Prevention

## Stale result rejection

Give logically replaceable operations a generation or request ID.

Typical algorithm:

1. increment generation before launching work
2. capture generation locally
3. await result
4. compare captured generation with current generation
5. discard result if obsolete
6. perform UI update only if its UI scope is still valid

Use this for:

- search
- rapidly changing filters
- route-dependent loads
- pagination resets
- token refresh flows
- worker requests
- configuration changes

## Widget lifecycle

After an asynchronous gap, verify `BuildContext.mounted` before using that context. `State.dispose` is terminal and calling `setState` afterward is invalid.

Prefer stopping owned ongoing work in `dispose` rather than allowing it to continue and merely checking `mounted` afterward.

`mounted` does **not** solve:

- out-of-order responses
- duplicate writes
- multiple simultaneous refreshes
- wrong-generation state
- wasted CPU/network work
- worker queue accumulation

## Async mutex / serialization

Traditional shared-memory OS locks are usually unnecessary for ordinary Dart objects because isolates do not expose shared mutable Dart memory.

Application-level asynchronous serialization can still be necessary for logical resources such as:

- token refresh
- file mutation
- ordered database writes
- unique cache refresh
- one-at-a-time migrations
- state-machine transitions

This is coordination of asynchronous operations, not proof that multiple Dart threads share the same mutable object.

---

# Large JSON Parsing

`jsonDecode` is synchronous. Flutter's background parsing cookbook demonstrates moving a sufficiently large parse/model-construction workload to `compute`, because synchronous decoding/model construction can make slower devices unresponsive.

Do not automatically isolate every JSON response.

Measure:

- payload bytes
- `jsonDecode` CPU time
- model construction CPU time
- allocations
- frame delay/input latency
- input-transfer cost
- returned model graph-transfer cost
- parse frequency

Decision:

- tiny/infrequent payload: parse locally
- occasional large payload on native: benchmark `Isolate.run`/`compute`
- repeated large parsing: benchmark a long-lived worker
- Web: `compute` does not offload; consider reducing payload/work, chunking where algorithmically valid, server-side transformation, or explicit browser worker architecture

---

# Flutter Web

Flutter Web must have its own concurrency branch.

Current Dart documentation states Dart isolates are supported on Dart Native, not Web. Flutter's isolate docs state `compute` runs on the browser's current event loop on Web.

Do not recommend `Isolate.spawn`, `Isolate.run`, or native-style isolate pools as a Web solution.

## Web Workers

Browser Web Workers are a separate browser concurrency mechanism, not Dart isolate semantics. They use worker entrypoints and browser messaging. Browser structured cloning can copy data; transferable objects such as `ArrayBuffer` can transfer ownership instead. Use explicit worker architecture only when its complexity is justified. 

## Wasm and rendering

Flutter's Wasm/skwasm renderer can use worker/threaded rendering in appropriate browser/security configurations. This does **not** create parallel Dart application isolates.

Do not conflate:

- multithreaded renderer
- Web Worker
- Dart isolate

## Browser lifecycle

Hidden/background tabs may have animation and timer activity throttled by the browser. Flutter exposes `AppLifecycleState.hidden` for a Web tab/window that is not visible. Do not build correctness around exact timer firing while hidden.

Optimize Web by:

- minimizing long main-thread Dart/JS computation
- reducing payload/model work
- batching DOM/interop/platform calls
- using lazy rendering
- reducing redundant builds
- bounding memory/cache usage
- using browser performance/memory tooling
- explicit Web Workers only for measured CPU bottlenecks

---

# Flutter Background Isolates and Plugins

Background isolates can use platform channels after registration with the root isolate token through `BackgroundIsolateBinaryMessenger.ensureInitialized`. They cannot perform Flutter UI work or use `dart:ui`; Flutter's isolate documentation also notes limitations on unsolicited host-platform messages.

Do not equate **background isolate** with **mobile operating-system background execution**.

An isolate is in-process concurrency. Android and iOS separately govern whether the process may continue doing work when the application is not foregrounded.

---
