---
name: flutter-concurrency-memory-performance
description: Diagnose, design, optimize, and validate Flutter/Dart concurrency, isolates, async workflows, memory ownership, leak prevention, resource lifecycle, rendering, startup, networking efficiency, background work, and cross-platform performance. Use this skill whenever Flutter work mentions jank, freezes, slow parsing, isolates/compute, race conditions, stale async results, worker queues, memory growth/leaks, controllers/listeners/timers/streams, FFI/native resources, large lists, rebuilds, image memory, startup time, CPU/battery use, platform channels, background execution, or performance refactoring—even when the user only asks to “make it faster” or “reduce memory.”
---

# Flutter Concurrency, Memory & Performance

Improve measurable behavior while preserving product semantics. Understand the execution model before introducing concurrency, ownership before diagnosing leaks, and the real bottleneck before optimizing code.

## Operating stance

Apply these rules throughout the task:

1. Measure before optimizing. Establish a reproducible scenario and baseline before claiming improvement.
2. Treat `async` as asynchronous coordination, not automatic CPU parallelism.
3. Keep latency-sensitive root-isolate work short; synchronous CPU inside an `async` function still blocks that isolate.
4. Use asynchronous APIs for ordinary I/O. Introduce isolates for measured CPU/blocking work, not merely because an operation takes time.
5. Include isolate startup, initialization, transfer, queueing, memory, and shutdown in the cost model.
6. Never create one isolate per tiny task or blindly size a pool from `Platform.numberOfProcessors`.
7. Bound producer/consumer systems: worker queues, retries, caches, pending requests, event streams, and background jobs need an overload policy unless naturally bounded.
8. Use cancellation when the underlying operation supports it; otherwise invalidate stale work/results. A `Future` has no generic cancellation contract.
9. Use `mounted` only for UI lifetime validity. Use request IDs, generations, cancellation, or serialization for logical concurrency correctness.
10. Diagnose memory by ownership and reachability. Ordinary Dart objects are garbage collected; leaks are usually unintended retained references.
11. Separate Dart heap from external/native/image/raster/GPU/RSS growth before choosing a fix.
12. Release scarce/native resources deterministically. Finalizers are fallback safety, not normal lifecycle management.
13. Optimize algorithms and duplicate work before syntax/allocation micro-tuning.
14. Profile production-representative builds and representative devices. Debug timing is not shipping evidence.
15. Use actual display/frame timing rather than a universal 16 ms rule; 90/120 Hz devices have tighter deadlines.
16. Keep Web behavior separate from Dart Native: Dart isolates are Native-only, and Flutter `compute` does not create Dart parallelism on Web.
17. Treat mobile OS background execution as a platform scheduling problem, not an isolate-lifetime feature.
18. Do not perform an unrelated architecture/state-management rewrite for a localized performance problem.

## Current baseline and stale-advice guard

The bundled research baseline is Flutter 3.44.7 and Dart 3.12.2. Re-check current APIs when the repository materially differs.

Keep these current findings in mind:

- Native UI/platform threads are merged by default on current Flutter native targets; avoid repeating older universal thread diagrams.
- `compute`/`Isolate.run` are native one-shot CPU tools; Web `compute` executes on the browser event loop.
- `ScrollView.cacheExtent` is deprecated on the researched current SDK; use `scrollCacheExtent` when applicable.
- Current Flutter lifecycle includes `hidden`; mobile `paused` has platform-specific behavior.
- `package_ffi` is the current recommended C interop workflow for many new cases; `plugin_ffi` is legacy except plugin-specific needs.
- A timeout is not cancellation unless the underlying API aborts the work.
- `const`, rebuild suppression, more isolates, forced GC, and root/emulator-style heuristics are not universal performance solutions.

Read `references/06-research-findings.md` before making version-sensitive claims or correcting old Flutter advice.

## Reference routing

Load only the material needed for the task:

| Task area | Reference |
|---|---|
| Dart event loop, Futures/Streams, frame timing, profiling workflow, isolate decision tree, transfer costs, persistent workers, backpressure, races, JSON, Flutter Web, background-isolate plugin rules | `references/01-concurrency-isolates.md` |
| Dart heap vs native memory, leak diagnosis, ownership/disposal, timers/streams/listeners, caches/images, FFI/native resources, finalizers, HTTP/files/database/platform-channel lifetime | `references/02-memory-resources.md` |
| Rebuilds, `const`, state-management performance, large lists, allocation, rendering, animations, startup, lifecycle, battery/energy | `references/03-ui-rendering-startup.md` |
| Android/iOS/macOS/Windows/Linux/Web background behavior, networking efficiency, dedupe, debounce/throttle/coalescing, resource pools | `references/04-platform-networking.md` |
| Concurrent-code tests, DevTools workflow, anti-patterns, migration workflow, architecture scenarios, version checks, validation, production definition of done | `references/05-testing-production.md` |
| Consolidated source-derived findings, confidence notes, conflicts, stale advice, and evidence map | `references/06-research-findings.md` |
| Primary Flutter/Dart/platform source catalog and version context | `references/07-research-sources.md` |

When source wording or platform caveats matter, prefer the reference files over memory.

# Workflow

## 1. Inspect the repository first

Before editing performance-sensitive code, inspect relevant portions of:

- Flutter/Dart constraints and target platforms
- `pubspec.yaml` / `pubspec.lock`
- state-management subscriptions and service lifetimes
- startup/bootstrap initialization
- synchronous work reachable from UI/input callbacks
- JSON/model conversion, sorting/filtering/search, crypto/compression/image work
- timers, streams, subscriptions, controllers/notifiers, observers/listeners
- existing isolates/workers and message protocols
- platform channels and FFI/native libraries
- sockets/files/network clients/database handles
- caches and static/global collections
- large lists/grids/slivers and expensive layouts/painting
- lifecycle/background behavior
- existing traces, benchmarks, and performance tests

Preserve working abstractions unless evidence shows they are the bottleneck.

## 2. Define the symptom and metric

Turn “slow” or “memory leak” into a measurable target.

Examples:

- frame build/raster duration
- input latency
- p50/p95/p99 operation latency
- CPU duration
- first meaningful frame / first interaction latency
- Dart heap after repeated lifecycle cycles
- external/native/RSS trend
- queue depth and queue wait time
- allocation rate
- network request count/bytes
- background CPU/battery behavior

Define the exact reproduction sequence and representative device/build mode.

## 3. Classify the bottleneck

Identify the dominant domain before prescribing a fix:

```text
framework/root-isolate CPU
layout
paint/raster/GPU
image decode/upload/cache
Dart heap retention
external/native/FFI memory
network/I/O
startup initialization
queue/backpressure
platform/background policy
```

Do not prescribe an isolate for raster jank or a widget rewrite for native memory growth.

## 4. Capture a baseline

Use the profiler matching the suspected problem:

- DevTools Performance: frames, framework/raster timeline
- CPU Profiler: parsing, loops, crypto, serialization, handlers
- Memory: heap trend, snapshots, retaining paths, external/RSS context
- Network: duplicates, payloads, latency, WebSockets
- browser tooling for Flutter Web
- platform tooling where native CPU/energy/working-set behavior matters

Add `dart:developer` timeline spans when application phases are otherwise invisible.

## 5. Make one targeted intervention

Prefer the smallest change that attacks the measured cause:

1. eliminate duplicate/unnecessary work
2. improve algorithm/data structure
3. shape event/request rate
4. bound queues/caches
5. fix lifecycle ownership/retention
6. reduce unnecessary copies/transfers
7. move measured CPU work off the root isolate on Native when beneficial
8. optimize build/layout/raster only where traces show cost
9. defer nonessential startup work without creating a worse first-use stall

## 6. Re-run the identical scenario

Compare before/after distributions and resource behavior. Revert complexity that produces no measurable benefit unless it fixes a correctness/resource-lifetime defect.

# Concurrency decision gate

## First classify CPU vs I/O

Usually CPU-bound candidates include:

- large JSON/model conversion
- compression/decompression
- cryptography
- image transforms
- document parsing
- numerical processing
- large sorting/filtering/indexing
- heavy serialization

Usually I/O-bound candidates include:

- HTTP/sockets/WebSockets
- async files
- async database calls
- async platform APIs

Use ordinary async I/O first. Treat CPU-heavy processing around the I/O as a separate phase.

## Choose the execution strategy

### Keep work local when

- synchronous work is small relative to the latency/frame target
- operation is infrequent
- transfer/spawn cost rivals compute cost
- code requires Flutter/UI APIs
- added concurrency would not measurably help

### Evaluate `Isolate.run` / `compute` when

- target is Dart Native
- work is one-shot
- CPU cost is measured and responsiveness-sensitive
- inputs/outputs are reasonably compact
- no persistent worker state is needed

Benchmark end-to-end time, not worker CPU alone.

### Evaluate a persistent worker when

- CPU work repeats
- setup/initialization can be amortized
- worker-local state is useful
- explicit queueing/backpressure is required
- request/response messages and shutdown need ownership

A persistent worker must define startup handshake, request IDs, structured errors, bounded queueing, cancellation/invalidation, crash/restart behavior, and graceful shutdown.

### Evaluate a pool only when

- one worker is measurably throughput-limited
- jobs are independent
- queue depth is observable
- memory/thermal cost is acceptable
- benchmarks show additional workers improve the target metric

Start with minimal concurrency and benchmark increasing counts. Hardware core count is not the answer by itself.

## Message-transfer gate

Before offloading, estimate:

- transitive input object graph
- output graph
- serialized/binary bytes
- allocations caused by transfer
- send latency vs compute duration

Use compact messages. Avoid closures that accidentally capture service/UI/model graphs.

For large binary native-isolate payloads, evaluate `TransferableTypedData`; its send can be cheap after preparation, but preparing/converting the data still costs work.

# Backpressure and async correctness

Every queue needs an overload contract. Choose one or more:

- bounded FIFO
- latest-wins
- debounce
- throttle
- coalescing
- deduplication
- drop oldest/newest
- priority queue
- bounded parallelism
- true producer pause where supported

For logically replaceable work use request IDs or generations:

```text
increment generation
→ launch work with captured generation
→ await result
→ compare with current generation
→ discard if stale
→ update UI only if UI scope is still valid
```

Use asynchronous serialization for logical resources such as token refresh, file mutation, ordered DB writes, migrations, or unique cache refresh when overlapping operations would violate semantics.

Do not depend on response order or timing luck.

# Memory and resource gate

## Diagnose the memory domain

A rising process graph can be:

- unintended retained Dart objects
- intended cache warmup
- transient allocations/delayed GC
- heap capacity/fragmentation
- external/native allocation
- decoded image/raster/GPU memory

Prove the domain before fixing it.

## Retention workflow

For suspected Dart leaks:

1. establish baseline
2. repeat the suspected lifecycle several times
3. allow normal GC opportunities
4. capture heap snapshots/diffs
5. inspect surviving suspicious classes
6. follow retaining/inbound references
7. identify the owner/root
8. fix ownership, listener/subscription, closure, queue, cache, or service lifetime
9. repeat the exact scenario
10. inspect native/external/RSS separately

Do not use forced GC as the application fix; retaining roots remain reachable.

## Ownership rule

The scope that creates/acquires a resource for its own bounded lifetime normally owns cleanup unless ownership was explicitly transferred.

Audit resources such as:

- controllers/notifiers/focus nodes
- `StreamSubscription` / `StreamController`
- `Timer`
- listeners/observers
- sockets/WebSockets/files/HTTP clients
- database handles/transactions
- isolate ports/workers
- FFI allocations/handles
- `NativeCallable`

Do not dispose caller-owned/borrowed resources merely because a widget hosts them.

## Cache gate

Any potentially growing cache needs either a proven finite key space or an explicit policy:

- maximum entries/bytes
- TTL/freshness
- eviction policy
- invalidation
- memory-pressure behavior
- account/session/lifecycle clearing

Reason about decoded image dimensions, not only compressed file size.

## FFI/native gate

For native resources define allocation, ownership transfer, exact release API, callback lifetime, and thread/blocking behavior.

Never mark long/blocking native work as an FFI leaf call merely for lower call overhead.

Close `NativeCallable` instances and other native callbacks when their owner ends. Prefer explicit close/free/release; use finalizers only as backup.

# UI/rendering gate

Do not treat declarative rebuilds as inherently bad. Optimize rebuilds only when they are frequent/large and measurably material.

Check in order:

- expensive computation inside `build`
- overly broad state notifications
- eager large child trees instead of lazy builders/slivers
- unnecessary `shrinkWrap`
- intrinsic layout overhead
- raster-heavy `saveLayer`, opacity, clipping, filters, shaders
- custom painter invalidation/path creation
- unnecessary repaint propagation

Use `const` naturally, but never present “add const everywhere” as the main optimization.

Do not blanket-wrap widgets in `RepaintBoundary`; it adds layer/memory costs and is useful only for measured repaint isolation.

# Startup, lifecycle, and energy gate

Partition initialization into:

- required before meaningful first frame
- deferrable/lazy work

Remember: a post-frame callback still executes Dart work on the root isolate. Moving heavy synchronous initialization to “after first frame” can simply jank the next frame.

Measure both startup and first-use latency.

Use lifecycle state to reduce discretionary work such as polling, animation, sensors, refreshes, worker throughput, and expensive stream processing when hidden/paused as appropriate.

Do not rely on graceful shutdown callbacks for critical persistence; abrupt process termination is possible.

Optimize energy by removing wakeups and unnecessary work: polling, tiny timers, retry storms, duplicate requests, background loops, oversized decoding, and continuous hidden animations.

# Platform gate

Read `references/04-platform-networking.md` before platform-specific background recommendations.

- Android: OS-managed background/foreground-service rules govern persistent work; an isolate is not a scheduling entitlement.
- iOS: ordinary apps are typically suspended after backgrounding unless an approved mechanism applies; do not model a Dart isolate as a daemon.
- macOS/Windows/Linux: assume long-lived processes; bound caches, terminate workers/resources, and monitor memory/background CPU over long sessions.
- Web: no Dart isolates; respect browser main-thread and hidden-tab behavior. Use explicit browser workers only when a measured CPU bottleneck justifies their separate architecture.

# Testing and validation

Read `references/05-testing-production.md` for full coverage.

Concurrent correctness tests should cover as relevant:

- startup/initialization failure
- worker crash/error propagation
- malformed messages
- out-of-order responses
- stale-result rejection
- cancellation/drop-before-start
- queue-full policy
- shutdown while idle/queued/active
- screen disposal before completion
- stream/timer cleanup
- restart policy

Prefer deterministic coordination with ports/completers/test clocks over `Future.delayed` timing guesses.

Before claiming completion, verify:

- baseline and post-change measurements exist when tooling is available
- production-like build mode and representative hardware were used
- root-isolate synchronous hotspots are addressed
- isolate transfer/spawn overhead was included
- Web was validated independently
- queues and caches are bounded
- stale results cannot overwrite newer state
- owned resources are cleaned up deterministically
- Dart heap and native/external/RSS were distinguished
- image/raster memory was considered when relevant
- startup and first-use latency were both assessed
- background CPU/network behavior is intentional
- algorithmic complexity was considered before micro-optimization
- no unrelated framework rewrite was introduced

# Required output for performance reviews

When the user asks for analysis/review rather than direct code changes, report:

```text
Repository / platform context
Observed symptom
Reproduction scenario
Baseline metric(s)
Bottleneck classification
Evidence / profiler finding
Root cause
Targeted change
Concurrency/lifetime implications
Cross-platform caveats
Before/after result
Remaining risks or unknowns
Validation/tests
```

If measurement tools are unavailable, distinguish source-supported reasoning from unmeasured hypotheses and do not claim a numeric improvement.

# Production definition of done

A performance change is ready only when the relevant conditions are demonstrated:

- responsiveness meets the product target on representative hardware
- target CPU hotspot is measurably improved without compensating regression
- memory stabilizes across expected repeated lifecycles and caches reach bounds
- owned resources have deterministic cleanup
- request ordering and stale-result behavior are explicit
- queue/concurrency limits exist
- worker shutdown/failure paths are tested
- startup and first-use tradeoffs are acceptable
- unnecessary polling/retry/background work is removed or bounded
- native-vs-Web and mobile-vs-desktop behavior are correct

Never state “performance improved” solely because the code looks cleaner or more optimized.
