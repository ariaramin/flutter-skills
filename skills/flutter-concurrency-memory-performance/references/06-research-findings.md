# Reference navigation

This file preserves the uploaded **Research Findings** and adds navigation only.

## Table of contents
- [Flutter Concurrency, Memory & Performance — Research Findings](#flutter-concurrency-memory-performance-research-findings)
  - [Research Baseline](#research-baseline)
- [Major Findings](#major-findings)
  - [1. async is not parallelism](#1-async-is-not-parallelism)
  - [2. Microtasks can starve ordinary events](#2-microtasks-can-starve-ordinary-events)
  - [3. Native isolates are parallel-capable but Web has no Dart isolates](#3-native-isolates-are-parallel-capable-but-web-has-no-dart-isolates)
  - [4. Isolate.run and native compute are appropriate one-shot primitives](#4-isolaterun-and-native-compute-are-appropriate-one-shot-primitives)
  - [5. Isolate messaging is not free](#5-isolate-messaging-is-not-free)
  - [6. Closure capture can cause hidden isolate cost](#6-closure-capture-can-cause-hidden-isolate-cost)
  - [7. Isolates have nonzero baseline memory cost](#7-isolates-have-nonzero-baseline-memory-cost)
  - [8. TransferableTypedData is for meaningful binary-transfer cost](#8-transferabletypeddata-is-for-meaningful-binary-transfer-cost)
  - [9. Persistent workers are primarily an amortization/backpressure architecture](#9-persistent-workers-are-primarily-an-amortizationbackpressure-architecture)
  - [10. Worker pools require throughput evidence](#10-worker-pools-require-throughput-evidence)
- [Cancellation Findings](#cancellation-findings)
  - [Futures do not have generic cancellation](#futures-do-not-have-generic-cancellation)
- [Backpressure Findings](#backpressure-findings)
- [Race-Condition Findings](#race-condition-findings)
- [mounted Finding](#mounted-finding)
- [Memory Findings](#memory-findings)
  - [Managed-memory leak model](#managed-memory-leak-model)
  - [Dart VM GC finding](#dart-vm-gc-finding)
  - [Isolate-group nuance](#isolate-group-nuance)
- [Memory Leak vs Growth](#memory-leak-vs-growth)
- [Disposal Findings](#disposal-findings)
- [Common Retention Patterns](#common-retention-patterns)
  - [Controllers](#controllers)
  - [Notifiers](#notifiers)
  - [Streams](#streams)
  - [Timers](#timers)
  - [Observers/listeners](#observerslisteners)
  - [Closures](#closures)
  - [Static collections/singletons](#static-collectionssingletons)
- [Finalizers Finding](#finalizers-finding)
- [FFI Findings](#ffi-findings)
  - [Native memory](#native-memory)
  - [Synchronous calls](#synchronous-calls)
  - [Leaf calls](#leaf-calls)
  - [NativeCallable](#nativecallable)
- [HTTP Findings](#http-findings)
- [JSON Findings](#json-findings)
- [UI / Rendering Findings](#ui-rendering-findings)
  - [Rebuilds](#rebuilds)
  - [const](#const)
  - [Lazy lists](#lazy-lists)
  - [shrinkWrap](#shrinkwrap)
  - [Expensive rendering operations](#expensive-rendering-operations)
- [High Refresh Rate Finding](#high-refresh-rate-finding)
- [Startup Findings](#startup-findings)
- [App Lifecycle Finding](#app-lifecycle-finding)
- [Platform Findings](#platform-findings)
  - [Android](#android)
  - [iOS](#ios)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
  - [Web](#web)
- [Platform Channel Finding](#platform-channel-finding)
- [Current Thread-Model Change](#current-thread-model-change)
- [Deprecated / Changed Advice](#deprecated-changed-advice)
  - [cacheExtent](#cacheextent)
  - [Fixed 16 ms frame rule](#fixed-16-ms-frame-rule)
  - [Separate UI/platform native threads](#separate-uiplatform-native-threads)
  - [compute as Web parallelism](#compute-as-web-parallelism)
  - [mounted solves async races](#mounted-solves-async-races)
  - [Timeout equals cancellation](#timeout-equals-cancellation)
  - [const everywhere](#const-everywhere)
  - [Every rebuild is expensive](#every-rebuild-is-expensive)
  - [More isolates means faster](#more-isolates-means-faster)
  - [Isolates for normal async HTTP](#isolates-for-normal-async-http)
  - [Force GC to fix leaks](#force-gc-to-fix-leaks)
  - [Background isolate means mobile background service](#background-isolate-means-mobile-background-service)
  - [plugin_ffi as default new C interop workflow](#pluginffi-as-default-new-c-interop-workflow)
- [Conflicting or Nuanced Guidance](#conflicting-or-nuanced-guidance)
  - ["Each isolate has its own memory" vs VM isolate-group heap](#each-isolate-has-its-own-memory-vs-vm-isolate-group-heap)
  - [Flutter docs' "UI thread" terminology vs merged native threads](#flutter-docs-ui-thread-terminology-vs-merged-native-threads)
  - [Flutter cookbook 16 ms parsing threshold vs high-refresh devices](#flutter-cookbook-16-ms-parsing-threshold-vs-high-refresh-devices)
  - [Official isolate guidance mentioning I/O](#official-isolate-guidance-mentioning-io)
- [Undocumented / Uncertain Areas](#undocumented-uncertain-areas)
- [Evidence Map](#evidence-map)
- [Recommended Architecture Conclusions](#recommended-architecture-conclusions)

---

# Flutter Concurrency, Memory & Performance — Research Findings

## Research Baseline

Research was validated against documentation reflecting:

- Flutter 3.44.7.
- Dart 3.12.2.
- Supported Flutter deployment families: Android, iOS, Windows, macOS, Linux, Web.

---

# Major Findings

## 1. `async` is not parallelism

A Dart isolate executes callbacks through an event loop. `Future`, `async`/`await`, timers, and Streams organize asynchronous completion but do not automatically move synchronous Dart CPU work elsewhere.

Therefore an `async` function can still cause jank if it:

- performs significant work before its first `await`
- resumes after an `await` and then performs significant synchronous work
- processes a large event/stream batch synchronously

**Recommendation:** diagnose CPU time, not syntax.

Confidence: High.  
Sources: Dart concurrency, `dart:async`.

---

## 2. Microtasks can starve ordinary events

Dart's `scheduleMicrotask` documentation explicitly demonstrates recursive microtasks preventing timer execution.

**Engineering rule:** never build unbounded recursive microtask loops as a "fast scheduler." If a work queue must remain responsive, process bounded batches and allow other events/frame opportunities.

Confidence: High.

---

## 3. Native isolates are parallel-capable but Web has no Dart isolates

Current Dart concurrency documentation limits isolates to Dart Native. Flutter explicitly documents that Web `compute` executes on the current browser event loop.

**Consequence:** native and Web performance architecture must branch.

Native:

- `Isolate.run`
- `compute`
- `Isolate.spawn`
- persistent workers/pools

may be candidates.

Web:

- those APIs do not provide native-style Dart parallelism
- explicit browser Web Workers are a separate architecture
- renderer multithreading is not Dart app concurrency

Confidence: High.

---

## 4. `Isolate.run` and native `compute` are appropriate one-shot primitives

Flutter currently documents mobile/desktop `compute(fun, message)` as equivalent to `Isolate.run(() => fun(message))`.

`Isolate.run` uses same-group `Isolate.exit` for returning the result, which can transfer the final object graph without normal live-isolate copying.

**Rule:** for a one-shot native CPU workload, benchmark `Isolate.run`/`compute` against local execution.

Confidence: High.

---

## 5. Isolate messaging is not free

`SendPort.send` can require linear work to traverse/copy a mutable transitive object graph.

A worker may therefore lose despite faster computation if:

- input is huge
- output is huge
- object graph is highly fragmented
- compute duration is short
- task is frequent enough that transfer dominates

**Rule:** benchmark total request-to-result latency, allocations, and transfer—not worker CPU alone.

Confidence: High.

---

## 6. Closure capture can cause hidden isolate cost

`Isolate.spawn` documentation explicitly warns that closures can capture more state than expected.

**Rule:** worker entrypoints/callbacks should avoid accidental capture of service trees, UI objects, or large model graphs.

Confidence: High.

---

## 7. Isolates have nonzero baseline memory cost

Current `Isolate.spawn` API documentation gives a base overhead on the order of 30 KB before application state/work buffers.

This is useful as an order-of-magnitude signal, not a formula for real app memory.

**Rule:** worker pool design must include per-worker application state, queues, transfer buffers, libraries, GC pressure, and thermal effects.

Confidence: High for API-stated base order; medium for any extrapolation to real workloads.

---

## 8. `TransferableTypedData` is for meaningful binary-transfer cost

Transferable typed data can make the send itself constant-time after creation/ownership conversion.

It is useful for:

- image buffers
- large binary payloads
- audio/video chunks
- large typed numerical data

It is not automatically faster for tiny messages, because constructing/preparing the transferable data still has cost.

Confidence: High.

---

## 9. Persistent workers are primarily an amortization/backpressure architecture

A long-lived worker is preferable when repeated operations benefit from:

- reused initialization
- worker-local state
- avoiding repeated spawn/teardown
- explicit bounded queueing
- request IDs
- controlled cancellation
- crash/restart policy

Do not create a persistent isolate solely because a feature exists.

Confidence: High.

---

## 10. Worker pools require throughput evidence

`Platform.numberOfProcessors` reports execution units. It does not say how many application workers should be created.

More workers can increase:

- queue contention
- process memory
- allocation/GC load
- CPU scheduler competition
- battery drain
- thermal throttling
- tail latency

**Rule:** start with minimal worker count and benchmark increasing concurrency.

Confidence: High for hardware API; architecture conclusion is strong synthesis.

---

# Cancellation Findings

## Futures do not have generic cancellation

A Future represents eventual completion. Cancellation belongs to:

- underlying request API
- subscription
- timer
- worker protocol
- application operation identity

A timeout does not generally terminate the source work.

**Rule:** never invent `Future.cancel()` semantics.

Use:

- HTTP request abort when package supports it
- `StreamSubscription.cancel`
- `Timer.cancel`
- worker cooperative cancel
- isolate kill only when whole-worker termination is semantically valid
- stale-result rejection otherwise

Confidence: High.

---

# Backpressure Findings

Unbounded work queues are a correctness/resource problem, not merely a performance inconvenience.

Observed architecture risk:

producer rate > service rate  
→ queue depth rises  
→ wait latency rises  
→ payloads remain reachable  
→ heap/native buffers rise  
→ results may become stale before execution  
→ CPU eventually processes work users no longer care about

Recommended strategies:

- bounded FIFO
- latest-wins
- debounce
- throttle
- coalescing
- deduplication
- bounded parallelism
- reject/drop policy

Every queue needs an overload contract.

Confidence: High synthesis from Dart stream/message/lifecycle semantics.

---

# Race-Condition Findings

Dart isolates prevent ordinary shared-mutable-Dart-object races but do not prevent logical races.

Examples:

- request B finishes before request A
- old route result arrives on new state
- two network writes overlap
- multiple token refreshes race
- worker response arrives after a user selected a different query
- screen is disposed while result is pending

Recommended controls:

- request IDs
- generation counters
- operation state machines
- async serialization for logical resources
- cancellation where supported
- stale-result rejection

Confidence: High.

---

# `mounted` Finding

`BuildContext.mounted` / State lifetime checks prevent use of disposed UI scopes after async gaps.

They do not solve:

- response ordering
- logical staleness
- duplicated requests
- wasted CPU
- queue growth

**Rule:** use mounted for UI validity; use operation identity/cancellation for concurrency validity.

Confidence: High.

---

# Memory Findings

## Managed-memory leak model

Ordinary Dart memory is garbage collected.

A true Dart-object leak is usually caused by an object remaining reachable longer than intended.

Common roots:

- static collections
- global services
- subscriptions
- timers
- listener registries
- closure captures
- caches
- pending worker maps
- event buses

**Rule:** find retaining paths rather than looking for a missing manual `free()` for ordinary objects.

Confidence: High.

---

## Dart VM GC finding

Current Dart VM Native runtime uses a generational collector.

This is a runtime implementation detail and must not be projected onto Flutter Web or treated as a stable language contract.

Practical takeaway only:

- high allocation rates can create GC pressure
- long-lived references cause retention
- forcing GC is not a production optimization strategy

Confidence: High for current VM behavior.

---

## Isolate-group nuance

The language-level isolate abstraction gives each isolate independent mutable Dart state.

Current Dart VM implementation can place same-group isolates within shared internal managed-heap/GC infrastructure. This does **not** permit application code to share normal mutable Dart objects directly.

This reconciles documentation phrases that might otherwise sound contradictory:

- "isolates have isolated state" — language/programming model
- "isolate group shares managed heap" — VM implementation

Confidence: High, implementation-specific.

---

# Memory Leak vs Growth

A rising process-memory graph may be:

- true retained Dart objects
- intentional cache warmup
- temporary allocation spike
- delayed GC
- heap growth/capacity
- fragmentation
- native allocation
- decoded image memory
- raster/GPU memory

**Rule:** classify memory domain before applying a fix.

Confidence: High.

---

# Disposal Findings

Flutter APIs consistently reinforce ownership-based disposal.

Examples:

- owner disposes ChangeNotifier
- FocusNode owner disposes its node
- hosting a provided node does not imply ownership
- binding observers should unregister

**Rule:** "every disposable object must always be disposed by this widget" is wrong. Determine ownership first.

Confidence: High.

---

# Common Retention Patterns

## Controllers

Potential leak if a screen creates a controller and a longer-lived reference/listener keeps it or its State alive.

Resources include:

- AnimationController
- TextEditingController
- ScrollController
- PageController
- TabController
- FocusNode
- TransformationController

Rule: create/dispose at owner scope.

## Notifiers

ValueNotifier/ChangeNotifier listeners can retain consumers.

Rule: remove listeners or dispose owned notifier.

## Streams

Uncancelled subscriptions can retain callbacks and state.

Rule: cancel subscriptions; close owned controllers.

## Timers

A periodic Timer retains its callback while active.

Rule: cancel when its owner's work ends.

## Observers/listeners

Global registries are especially dangerous because their lifetime often exceeds screens.

Rule: pair registration with deregistration.

## Closures

A long-lived closure can retain its captured graph.

Rule: inspect lifetime relationship; do not ban closure capture universally.

## Static collections/singletons

A Map that only grows can create deterministic retention.

Rule: define a cache bound or prove finite key space.

---

# Finalizers Finding

`Finalizer` is nondeterministic. `NativeFinalizer` is stronger but still not a substitute for prompt explicit cleanup.

Dart's own `NativeFinalizer` documentation says to prefer manual close for timely native-resource release.

**Rule:** finalizer = fallback safety mechanism.

Confidence: High.

---

# FFI Findings

## Native memory

Native allocations must have explicit ownership and corresponding release semantics.

## Synchronous calls

A synchronous FFI call can hold up the Dart caller until native code returns.

## Leaf calls

Leaf calls are only for short, nonblocking native work. Long/blocking leaf calls can prevent expected runtime coordination and delay isolate-group operations including GC.

**Rule:** never mark expensive native work leaf simply for lower call overhead.

Confidence: High.

## NativeCallable

A `NativeCallable` can keep an isolate alive until closed.

This creates both native-resource and isolate-lifetime leak risk.

Confidence: High.

---

# HTTP Findings

For `dart:io`:

- persistent connections are reused
- an owned HttpClient should close at end of its lifetime
- response body must be consumed/drained
- request abort exists

**Rule:** don't repeatedly instantiate network clients if the library expects client reuse, but do not blindly generalize `HttpClient` lifecycle to every networking package.

Confidence: High for `dart:io`.

---

# JSON Findings

`jsonDecode` is synchronous.

Flutter's cookbook demonstrates 5,000-record parsing as an example that can freeze slower devices and moves the parsing/model work to `compute`.

Important nuance:

- the payload-size threshold is application/device dependent
- transfer cost matters
- higher-refresh displays provide smaller budgets
- Web `compute` does not offload

**Rule:** profile parse + model conversion + transfer together.

Confidence: High.

---

# UI / Rendering Findings

## Rebuilds

Flutter's declarative system expects rebuilds. "Every rebuild is expensive" is unsupported folklore.

Optimize when builds are both:

- frequent/large
- measurably material

Confidence: High.

## `const`

Const values are canonicalized in Dart when equivalent constant expressions are used.

This can support identity reuse, but `const` does not fix layout/raster/CPU bottlenecks automatically.

Confidence: High.

## Lazy lists

Builder/sliver patterns avoid eagerly creating large child trees.

Confidence: High.

## `shrinkWrap`

Flutter explicitly describes shrink-wrapping scrolling content as significantly more expensive.

Confidence: High.

## Expensive rendering operations

Flutter's performance guidance identifies:

- `saveLayer`
- some opacity/compositing paths
- clipping with layers
- intrinsic layout
- expensive paint/raster effects

as costs that should be investigated in context.

Rule: diagnose raster/layout evidence before replacing effects.

Confidence: High.

---

# High Refresh Rate Finding

The fixed "16 ms budget" is incomplete.

Android documents:

- 60 Hz ≈ 16 ms
- 90 Hz ≈ 11 ms
- 120 Hz ≈ 8 ms

Apple's current ProMotion documentation also describes adaptive rates and 120 Hz operation; system state can change available refresh dynamically.

Flutter exposes `Display.refreshRate`.

**Rule:** derive target latency from actual display/frame timings.

Confidence: High.

---

# Startup Findings

Deferring nonessential initialization can improve first meaningful frame, but:

- post-frame callback is not a worker
- synchronous post-frame CPU can jank subsequent frames
- aggressively lazy initialization can worsen first-use latency

**Rule:** measure both first frame and first interaction.

Confidence: High synthesis from scheduler/frame execution model.

---

# App Lifecycle Finding

Current Flutter includes `hidden`, which provides cross-platform hidden-state semantics.

`paused` occurs only on iOS/Android, and frame callbacks cease in paused state.

**Rule:** use hidden/paused transitions to reduce unnecessary work, but do not depend on graceful shutdown for critical persistence.

Confidence: High.

---

# Platform Findings

## Android

Key constraints:

- memory envelope varies by device
- background execution is OS-controlled
- mobile resource/power limits matter
- high-refresh devices reduce frame time
- background isolate ≠ background execution permission

Architecture recommendation:

- bounded work
- Android-managed scheduling for persistent background jobs
- event-driven updates
- test low-memory and high-refresh devices

Confidence: High.

## iOS

Key constraints:

- system normally suspends foreground app work after backgrounding unless approved background mechanism applies
- memory pressure can terminate processes
- adaptive refresh changes timing/power conditions

Architecture recommendation:

- use system background APIs for eligible work
- no arbitrary Dart daemon assumption
- lifecycle-aware cleanup/pause

Confidence: High.

## macOS

Long-lived desktop process; App Nap/power behavior matters.

Architecture recommendation:

- bound caches
- stop unneeded hidden-window work
- test memory over long sessions
- clean native resources

Confidence: Medium-high; OS behavior varies with application role.

## Windows

Long-lived Win32 process.

Architecture recommendation:

- audit working set and native resources over long runs
- avoid invisible timer/poll loops
- profile plugin/FFI integrations

Confidence: High for architectural principle.

## Linux

Official Flutter-level desktop integration and lifecycle are clear, but less app-level energy/background policy is documented than on mobile.

Architecture recommendation:

- do not invent Android/iOS suspension semantics
- treat process as long-lived
- clean GTK/native/FFI resources
- bound caches/workers

Confidence: High for Flutter runtime behavior; platform energy guidance intentionally conservative.

## Web

No Dart isolates.

Architecture recommendation:

- main-thread-conscious Dart design
- browser worker only where benchmarked
- browser lifecycle aware
- transferable browser buffers for explicit worker designs

Confidence: High.

---

# Platform Channel Finding

Platform handlers can execute on native main/platform context or supported background task queues depending on implementation.

Registered Dart background isolates can access plugins under documented restrictions.

**Rule:** profile both sides of the channel. Moving the Dart caller does not prove the native implementation is asynchronous.

Confidence: High.

---

# Current Thread-Model Change

One of the most important stale-guidance findings is Flutter's native thread merge.

Current state:

- Android/iOS merged since 3.29
- macOS/Windows merged since 3.35
- Linux stable merge since 3.41

Older diagrams/posts that assume a separate Flutter platform thread and Dart UI OS thread on every native target are outdated for current stable Flutter.

Confidence: High.

---

# Deprecated / Changed Advice

## `cacheExtent`

**Outdated:** tune `ScrollView.cacheExtent`.

**Current:** deprecated after v3.41.0-0.0.pre; use `scrollCacheExtent`.

Confidence: High.

## Fixed 16 ms frame rule

**Outdated as universal claim:** every frame has 16 ms.

**Current:** budget depends on current display refresh; 90/120 Hz are materially tighter.

## Separate UI/platform native threads

**Outdated for current native targets.**

## `compute` as Web parallelism

**Incorrect:** Web executes callback on current event loop.

## `mounted` solves async races

**Incorrect:** lifecycle validity only.

## Timeout equals cancellation

**Incorrect unless source API explicitly aborts.**

## `const` everywhere

**Unsupported as primary optimization.**

## Every rebuild is expensive

**Unsupported.**

## More isolates means faster

**Unsupported.**

## Isolates for normal async HTTP

**Usually unnecessary unless CPU/blocking work is involved.**

## Force GC to fix leaks

**Incorrect.** Retaining roots remain.

## Background isolate means mobile background service

**Incorrect.**

## `plugin_ffi` as default new C interop workflow

**Changed:** `package_ffi` is current recommendation since Flutter 3.38, with plugin-specific exceptions.

---

# Conflicting or Nuanced Guidance

## "Each isolate has its own memory" vs VM isolate-group heap

Resolution:

- Dart programming semantics isolate mutable state.
- current VM can use shared internal heap/GC infrastructure for isolate groups.
- application code still does not gain ordinary shared mutable Dart memory.

Do not turn VM implementation details into shared-memory programming advice.

## Flutter docs' "UI thread" terminology vs merged native threads

Resolution:

- tooling/pipeline labels still meaningfully identify framework-side frame cost
- native OS thread topology has changed
- talk about "UI/framework work" unless an OS-thread distinction is specifically necessary

## Flutter cookbook 16 ms parsing threshold vs high-refresh devices

Resolution:

- cookbook illustrates frame blocking
- actual deadline varies by current refresh and pipeline work
- use profiling/FrameTiming rather than literal 16 ms threshold

## Official isolate guidance mentioning I/O

Resolution:

- an isolate can host many kinds of work
- ordinary asynchronous I/O does not need an isolate solely to wait
- isolate becomes relevant when an API blocks synchronously, native/plugin constraints apply, or CPU processing dominates

---

# Undocumented / Uncertain Areas

1. There is no universal official "spawn an isolate when computation exceeds exactly N ms" threshold applicable across all platforms/devices.

2. There is no universal ideal worker-pool size. Hardware-core count is not sufficient.

3. Real isolate startup latency and process-memory increase are workload/device/runtime-dependent. API-level base overhead should not be turned into benchmark predictions.

4. Plugin/database/networking resource semantics are package-specific and must be checked before prescribing pooling/cancellation.

5. Linux desktop energy/background scheduling has less Flutter-specific official guidance than mobile. Avoid speculative rules.

6. Browser/Wasm concurrency continues to evolve. Re-check Flutter Web renderer and Dart concurrency docs when SDK versions change.

---

# Evidence Map

| Topic | Finding | Recommendation | API/Tool | Platform | Performance impact | Memory impact | Concurrency implication | Caveat | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Async | Future != parallel CPU | classify work | Future | all | prevents false offload | neutral | same event loop possible | I/O implementation differs | High |
| Microtasks | can starve events | bound microtask chains | scheduleMicrotask | all | input/frame latency | queue retention possible | unfair scheduling | use intentionally for small tasks | High |
| Isolates | Native only | branch Web | Isolate | native/Web | CPU parallelism | worker memory | separate contexts | Web differs | High |
| `compute` | Web same event loop | no Web offload claim | compute | all | native offload only | native worker cost | no Web parallelism | current Flutter | High |
| SendPort | mutable graph copy | minimize transfer | SendPort | native | transfer latency | allocations | message passing | immutable cases differ | High |
| TTD | constant-time send after creation | large binary only | TransferableTypedData | native | lower copy cost | transfer buffers | ownership transfer | creation cost remains | High |
| Workers | persistent amortizes setup | use for repeated CPU | Isolate.spawn | native | throughput | persistent worker state | queue protocol | benchmark | High |
| Pool | oversubscription possible | benchmark worker count | Platform.numberOfProcessors | native | throughput/latency | multiplicative memory | parallelism | thermal/device dependent | High |
| Future cancellation | no generic cancel | underlying abort or invalidate | Future | all | stops wasted work only if supported | pending work retention | logical cancellation | API-specific | High |
| Lifecycle | hidden is current state | pause discretionary work | AppLifecycleState | all | CPU/battery | can release caches | lifecycle races | not shutdown guarantee | High |
| Memory | leaks via reachability | retaining-path analysis | DevTools Memory | native | GC/latency | direct | lifetime correctness | native memory separate | High |
| Finalizer | nondeterministic | explicit cleanup first | Finalizer | Dart | minimal | native fallback | lifecycle | no timing guarantee | High |
| NativeFinalizer | stronger fallback | still close manually | NativeFinalizer | native | minimal | native cleanup | lifecycle | abrupt exit caveat | High |
| FFI leaf | short/nonblocking only | never use for long calls | isLeaf | native | lower call overhead | indirect GC impact | can delay group sync | native-specific | High |
| NativeCallable | keeps isolate alive | close | NativeCallable | native | callbacks | handle retention | isolate lifecycle | callback thread model differs | High |
| HTTP | persistent connections | reuse according to client lifetime | HttpClient | dart:io | handshake reduction | sockets retained | async I/O | package-specific | High |
| JSON | sync decode | profile parse/model | jsonDecode | all | potential UI CPU | allocations | isolate native candidate | Web differs | High |
| Frames | refresh-dependent | actual FrameTiming | Display.refreshRate | all | smoothness | neutral | deadline | adaptive refresh | High |
| Build | rebuilds normal | optimize measured heavy rebuilds | DevTools | all | framework CPU | allocations | root isolate | don't over-optimize | High |
| const | canonicalization | use naturally | const | Dart/Flutter | possible reuse | fewer duplicate constants | none | not universal perf fix | High |
| shrinkWrap | expensive scrolling layout | avoid when unnecessary | ScrollView | all | layout cost | possible child retention | none | valid small content | High |
| cacheExtent | deprecated | scrollCacheExtent | ScrollView | all | prefetch/layout | cache memory | none | current SDK | High |
| saveLayer | offscreen/layer cost | profile raster | Performance | all | raster | GPU/layer memory | renderer | effects may require it | High |
| Background isolate | not OS background permission | use platform scheduling | Flutter isolate/platform APIs | mobile | stability | worker resources | in-process only | OS-specific | High |

---

# Recommended Architecture Conclusions

1. Default to the simplest asynchronous architecture that meets responsiveness requirements.

2. Treat native isolates as CPU parallelism tools—not general "background task" primitives.

3. Use one-shot isolates for one-shot measured CPU tasks.

4. Use persistent workers for repeated CPU work only when spawn/initialization amortization or queue control matters.

5. Make worker protocols explicit and bounded.

6. Use application operation IDs even when isolates avoid shared-memory races.

7. Make Web architecture independently correct without native isolates.

8. Manage memory through lifetime/ownership and bounded retention, not manual-GC tricks.

9. Explicitly manage native/FFI resources even in garbage-collected Dart.

10. Determine UI, layout, raster, CPU, memory, startup, network, and energy bottlenecks independently.

11. Validate on constrained and high-refresh devices—not only development flagships.

12. Preserve behavior and prefer targeted fixes to performance-driven rewrites.

13. Never claim a performance improvement without before/after measurement when profiling tools are available.