# Testing, Profiling, Anti-Patterns & Production Validation

Source-preserving excerpt from the uploaded production skill. Use this file when the core `SKILL.md` routes to this topic.

## Table of contents
- [Error Handling in Concurrent Work](#error-handling-in-concurrent-work)
- [Testing Concurrent Code](#testing-concurrent-code)
- [DevTools Workflow](#devtools-workflow)
  - [UI/raster jank](#uiraster-jank)
  - [CPU](#cpu)
  - [Memory](#memory)
  - [Network](#network)
- [Performance Anti-Patterns](#performance-anti-patterns)
  - [CPU-heavy work on root isolate](#cpu-heavy-work-on-root-isolate)
  - [Isolate per tiny task](#isolate-per-tiny-task)
  - [Isolate for ordinary HTTP wait](#isolate-for-ordinary-http-wait)
  - [Sending huge object graphs](#sending-huge-object-graphs)
  - [Unbounded worker queue](#unbounded-worker-queue)
  - [Future timeout treated as cancellation](#future-timeout-treated-as-cancellation)
  - [mounted as race solution](#mounted-as-race-solution)
  - [Uncancelled timers/subscriptions/listeners](#uncancelled-timerssubscriptionslisteners)
  - [Unbounded cache/static Map](#unbounded-cachestatic-map)
  - [Expensive work in build](#expensive-work-in-build)
  - [Eager large collection](#eager-large-collection)
  - [Excessive shrinkWrap](#excessive-shrinkwrap)
  - [Blanket RepaintBoundary](#blanket-repaintboundary)
  - [Excessive effects / saveLayer](#excessive-effects-savelayer)
  - [Debug-mode benchmarking](#debug-mode-benchmarking)
  - [Mechanical const optimization](#mechanical-const-optimization)
  - [Forced GC as application fix](#forced-gc-as-application-fix)
- [Migration Workflow for an Existing Poorly Optimized Project](#migration-workflow-for-an-existing-poorly-optimized-project)
- [Architecture Scenarios](#architecture-scenarios)
  - [Small Flutter application](#small-flutter-application)
  - [Data-heavy application](#data-heavy-application)
  - [Image-processing application](#image-processing-application)
  - [Chat application](#chat-application)
  - [Social feed](#social-feed)
  - [Desktop application](#desktop-application)
  - [Flutter Web](#flutter-web)
  - [Offline-first application](#offline-first-application)
  - [Real-time application](#real-time-application)
- [Version and Freshness Rules](#version-and-freshness-rules)
- [Validation Checklist](#validation-checklist)
- [Production Definition of Done](#production-definition-of-done)
  - [Responsiveness](#responsiveness)
  - [CPU](#cpu)
  - [Memory](#memory)
  - [Resource lifecycle](#resource-lifecycle)
  - [Concurrency](#concurrency)
  - [Startup](#startup)
  - [Battery/network](#batterynetwork)
  - [Cross-platform](#cross-platform)

---

# Error Handling in Concurrent Work

Never silently discard asynchronous or worker failures.

Preserve:

- original error category
- stack trace where available
- request ID
- operation name
- relevant non-sensitive context
- worker identity
- retry attempt

`Isolate` error listeners and spawn-time `onError`/`onExit` mechanisms should be part of persistent-worker lifecycle.

Failures returned across a custom protocol should be typed/structured rather than arbitrary strings when repository conventions allow.

---

# Testing Concurrent Code

Test worker and asynchronous behavior independently of timing luck.

Cover:

- success
- worker initialization failure
- worker crash
- malformed message
- out-of-order responses
- duplicate request IDs
- stale-result rejection
- cancellation before start
- cancellation during work where cooperative cancellation exists
- queue-full behavior
- shutdown with no jobs
- shutdown while queued
- shutdown while active
- restart policy
- screen disposal before result
- stream cancellation
- timer cancellation

Prefer deterministic synchronization through ports/completers/test clocks rather than `Future.delayed` guesses.

For performance tests, separate correctness tests from production-like benchmarks.

---

# DevTools Workflow

## UI/raster jank

Use Flutter DevTools **Performance** view on supported native targets.

Inspect:

- frame chart
- UI/framework duration
- raster duration
- timeline
- frame analysis
- tracked builds/layouts/paints where needed

Flutter's current Performance view explicitly provides UI/raster frame analysis and timeline diagnostics.

## CPU

Use CPU profiler for:

- parsing
- sorting
- serialization
- crypto
- loops
- event handlers
- allocation-heavy functions

Inspect:

- call tree
- bottom-up view
- flame chart
- method table

Do not optimize a cold function merely because it is visually recognizable.

## Memory

Use Memory view for:

- live heap trend
- external/RSS context
- Diff Snapshots
- allocation profiling
- Trace Instances
- retaining paths

Use snapshots around repeated lifecycle sequences to distinguish transient allocation from retained-object leaks.

## Network

Use Network view to identify:

- duplicates
- payload sizes
- latency
- WebSocket traffic
- request patterns

For Web targets, use browser tooling where Flutter's native-target DevTools views are not the appropriate profiler.

---

# Performance Anti-Patterns

## CPU-heavy work on root isolate

**Symptom:** delayed frames/input.  
**Why:** long synchronous callback monopolizes the isolate.  
**Measure:** Performance timeline + CPU profiler.  
**Fix:** improve algorithm first; then benchmark isolate offload if CPU-bound.  
**Exception:** small workload whose transfer/spawn costs are worse.

## Isolate per tiny task

**Symptom:** throughput decreases, allocations/memory/latency increase.  
**Why:** spawn, initialization, communication, teardown overhead.  
**Measure:** benchmark complete end-to-end task latency and memory.  
**Fix:** same-isolate execution or persistent worker.  
**Exception:** rare isolated task whose duration strongly dominates overhead.

## Isolate for ordinary HTTP wait

**Symptom:** extra complexity with no latency improvement.  
**Why:** asynchronous I/O already need not block the Dart event loop.  
**Measure:** CPU profile around the actual request and response processing.  
**Fix:** async I/O; isolate only CPU-heavy response processing.  
**Exception:** blocking synchronous library/native call.

## Sending huge object graphs

**Symptom:** high latency/allocations around worker messages.  
**Why:** `SendPort.send` can copy the transitive mutable graph.  
**Measure:** timeline transfer spans, allocations, payload size.  
**Fix:** compact data representation, typed buffers, transferable data, persistent worker state.  
**Exception:** one-off transfer negligible relative to computation.

## Unbounded worker queue

**Symptom:** memory growth and increasing tail latency.  
**Why:** producer throughput exceeds workers.  
**Measure:** queue depth, wait time, heap.  
**Fix:** bound, throttle, coalesce, latest-wins, reject.  
**Exception:** naturally bounded workload with a proven maximum.

## Future timeout treated as cancellation

**Symptom:** supposedly canceled work still consumes CPU/network or mutates state later.  
**Why:** timeout changes what caller awaits; source may continue.  
**Fix:** invoke underlying abort if supported or reject stale result.

## `mounted` as race solution

**Symptom:** wrong data shown despite no setState-after-dispose crash.  
**Why:** mounted only answers lifecycle validity.  
**Fix:** generation IDs/cancellation/ordering rules.

## Uncancelled timers/subscriptions/listeners

**Symptom:** disposed screens remain retained; hidden CPU activity.  
**Measure:** memory retaining paths, logs/timeline, object counts.  
**Fix:** cleanup by owner.  
**Exception:** explicitly app-lifetime registration.

## Unbounded cache/static Map

**Symptom:** monotonic retained heap over unique-key workloads.  
**Measure:** Diff Snapshot + retaining root.  
**Fix:** maximum entries/bytes/TTL/eviction.

## Expensive work in `build`

**Symptom:** high framework/UI duration during rebuilds.  
**Measure:** Track widget builds + CPU profile.  
**Fix:** precompute/cache/move work to appropriate layer.  
**Exception:** operation is cheap and not a measured hotspot.

## Eager large collection

**Symptom:** large startup/layout/allocation cost.  
**Fix:** lazy lists/slivers.

## Excessive `shrinkWrap`

**Symptom:** scrolling/layout cost.  
**Why:** scroll extent can require recomputation.  
**Fix:** normal bounded viewport/sliver design where possible.

## Blanket `RepaintBoundary`

**Symptom:** higher layer/GPU memory with no improvement.  
**Fix:** add only around measured repaint isolation opportunities.

## Excessive effects / `saveLayer`

**Symptom:** raster jank.  
**Measure:** raster timeline.  
**Fix:** simplify effect or layer use where visually acceptable.

## Debug-mode benchmarking

**Symptom:** conclusions do not match shipping performance.  
**Fix:** profile/release evidence on representative devices.

## Mechanical `const` optimization

**Symptom:** large code churn with no meaningful metric movement.  
**Fix:** profile actual build/layout/CPU problem.

## Forced GC as application fix

**Symptom:** short-lived chart drop but retention returns.  
**Why:** retained roots remain retained.  
**Fix:** find ownership/retaining path.

---

# Migration Workflow for an Existing Poorly Optimized Project

1. Record Flutter/Dart versions and platforms.
2. Establish production-like baseline scenarios.
3. Capture frame, CPU, memory, startup, network, and background metrics relevant to actual complaints.
4. Fix definite resource/lifecycle leaks.
5. Remove obvious synchronous root-isolate CPU blocking.
6. Improve algorithms and duplicate-work behavior.
7. Introduce isolates only where benchmarked CPU work warrants them.
8. Convert repeated isolate tasks to bounded persistent workers if measured.
9. Bound queues and caches.
10. Reduce redundant subscriptions/network/database work.
11. Optimize high-cost UI/layout/raster hotspots.
12. Defer/lazy-load nonessential startup work.
13. Add lifecycle-based idle behavior.
14. Validate Android/iOS/desktop/Web differences.
15. Re-run identical measurements.
16. Keep only changes with measurable benefit or clear correctness/resource-lifetime benefit.

---

# Architecture Scenarios

## Small Flutter application

Prefer:

- ordinary async APIs
- no worker pool
- perhaps no isolates at all
- simple owner-based disposal
- bounded small caches
- lazy startup

Do not introduce worker infrastructure preemptively.

## Data-heavy application

If repeated parsing/transformation blocks interaction:

- profile first
- use persistent native worker if repeated CPU work justifies it
- keep worker queue bounded
- compact messages
- consider transferable binary data
- invalidate stale queries

Web requires separate strategy.

## Image-processing application

Use:

- bounded job queue
- one worker initially
- benchmark more workers
- transferable typed binary data where beneficial
- cancellation/stale-job policy
- decoded-image/cache bounds
- strict memory monitoring

## Chat application

Prioritize:

- stream subscription lifecycle
- bounded message processing
- lazy history rendering
- pagination
- network dedupe
- latest connection/session identity
- image/media cache limits
- lifecycle-aware sockets/background behavior

## Social feed

Prioritize:

- lazy slivers
- image decode sizing
- bounded prefetch/cache
- pagination
- cancellation of obsolete page requests
- request deduplication
- avoid expensive cell builds
- defer fast-scroll discretionary loading where appropriate

## Desktop application

Assume process may live for days.

Focus on:

- bounded caches
- screen/document lifecycle
- long-lived subscriptions
- worker termination
- native handle cleanup
- RSS over hours
- hidden-window CPU
- plugin/FFI resource lifetime

## Flutter Web

Prioritize:

- browser main-thread latency
- reduced CPU transformations
- lazy work
- browser lifecycle
- explicit Web Workers only if measured
- transferable browser buffers if architected
- browser memory/performance tools

Do not use `compute` expecting parallelism.

## Offline-first application

Prioritize:

- database lifecycle
- deduplicated synchronization
- serialized conflicting writes
- bounded sync queue
- retry/backoff
- connectivity-aware batching
- conflict/version handling
- background platform restrictions

## Real-time application

Prioritize:

- event coalescing
- bounded streams
- backpressure
- sampling
- CPU-per-message
- stale-state elimination
- bounded worker processing
- lifecycle-aware connection policy

---

# Version and Freshness Rules

Before applying old Flutter performance advice:

1. inspect current SDK constraint
2. verify APIs in current Flutter/Dart docs
3. inspect breaking changes
4. branch behavior by platform
5. mark implementation detail versus public guarantee

Known current freshness points:

- Flutter docs baseline: 3.44.7.
- Dart docs baseline: 3.12.2.
- native UI/platform threads are merged by default on all current native Flutter deployment platforms.
- Flutter Web still has no Dart isolate support.
- `compute` on Web runs on the current event loop.
- `ScrollView.cacheExtent` is deprecated; use `scrollCacheExtent` on current SDKs.
- current lifecycle includes `hidden`.
- current recommended Flutter C interop template is `package_ffi` since Flutter 3.38; `plugin_ffi` is the legacy workflow except cases needing plugin-specific integration.

---

# Validation Checklist

Before claiming a performance task complete, verify:

- baseline and post-change measurements exist when tools are available
- production-like build mode was used
- representative device/platform was used
- CPU-heavy synchronous work does not unexpectedly monopolize frame-sensitive callbacks
- isolate startup and transfer overhead were included
- no isolate was added merely because code is `async`
- Web behavior was separately validated
- persistent workers have shutdown
- worker queues are bounded
- worker errors are observable
- stale results are invalidated
- owned Streams are canceled
- owned timers are canceled
- owned controllers/notifiers are disposed
- listeners/observers are removed
- sockets/files/database/native handles are released
- no accidental app-lifetime closure retains UI state
- caches have explicit policy
- Dart heap and native/external/RSS were distinguished
- image/native memory was considered
- list rendering is lazy when content is large
- expensive build/layout/raster work was measured
- startup and first-use latency were both considered
- background CPU is reduced when work is unnecessary
- battery/network consequences were considered
- high-frequency events are shaped where necessary
- retry logic cannot storm indefinitely
- algorithmic complexity was considered before micro-optimization
- no forced-GC trick is being presented as a leak fix
- no unrelated framework/state-management rewrite was introduced

---

# Production Definition of Done

A performance change is production-ready only when relevant conditions are true:

## Responsiveness

- measured frame/input latency meets product targets on representative devices
- no newly introduced event-loop starvation
- high-refresh scenarios were considered where relevant

## CPU

- target hotspot is measurably improved or removed
- no compensating CPU regression occurs elsewhere
- background CPU is bounded

## Memory

- memory stabilizes across repeated expected lifecycle scenarios
- known caches reach expected bounds
- no unintended retaining path remains
- native/external resources are included in evaluation

## Resource lifecycle

- each owned disposable resource has deterministic cleanup
- worker/port shutdown is defined
- native handles have explicit release ownership

## Concurrency

- request ordering does not depend on timing luck
- obsolete responses cannot replace newer state
- queues/concurrency are bounded
- failure/shutdown paths are tested

## Startup

- first meaningful frame is measured
- nonessential work is deferred/lazy where beneficial
- deferred work does not create unacceptable first-use stalls

## Battery/network

- no unnecessary polling/retry loops
- hidden/background behavior is intentional
- requests are not needlessly duplicated

## Cross-platform

- native isolate assumptions are not applied to Web
- mobile background assumptions respect OS policy
- long-lived desktop resource behavior is tested
- platform/native integration is correctly owned

Never state "performance improved" solely because code looks more optimized.
