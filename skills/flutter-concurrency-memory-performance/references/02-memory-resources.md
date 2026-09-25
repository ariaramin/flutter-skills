# Memory, Ownership, Native Resources & I/O Lifecycles

Source-preserving excerpt from the uploaded production skill. Use this file when the core `SKILL.md` routes to this topic.

## Table of contents
- [Memory Fundamentals](#memory-fundamentals)
- [Dart Heap vs External/Native/GPU Memory](#dart-heap-vs-externalnativegpu-memory)
- [Memory Leak Diagnostic Workflow](#memory-leak-diagnostic-workflow)
- [Ownership and Disposable Resources](#ownership-and-disposable-resources)
  - [Disposable Resource Checklist](#disposable-resource-checklist)
- [Timers](#timers)
- [Streams](#streams)
- [Listeners, Observers, and Closures](#listeners-observers-and-closures)
- [Global, Singleton, and DI Lifetimes](#global-singleton-and-di-lifetimes)
- [Cache Requirements](#cache-requirements)
- [Images and Memory](#images-and-memory)
- [FFI and Native Resources](#ffi-and-native-resources)
  - [Blocking FFI](#blocking-ffi)
  - [Leaf FFI](#leaf-ffi)
  - [NativeCallable](#nativecallable)
- [Finalizers](#finalizers)
  - [Finalizer](#finalizer)
  - [NativeFinalizer](#nativefinalizer)
- [HTTP Resource Management](#http-resource-management)
- [Files, Sockets, and Databases](#files-sockets-and-databases)
- [Platform Channels](#platform-channels)

---

# Memory Fundamentals

Ordinary Dart objects live in managed memory and are reclaimed when unreachable.

A likely Dart heap leak is therefore:

> an object remains reachable from a root longer than the application's intended lifetime.

Common retaining roots include:

- static/global collections
- app-lifetime services
- event buses
- long-lived listeners
- controller/listener relationships
- closures
- timers
- pending queues
- StreamSubscriptions
- caches
- native callback objects

Dart VM Native currently uses a generational garbage collector, but treat detailed collector design as a VM implementation property—not a cross-platform language guarantee. Flutter Web is not using the native Dart VM garbage collector model.

---

# Dart Heap vs External/Native/GPU Memory

Low Dart heap usage does not prove low process memory.

Investigate separately:

- Dart heap
- external allocations attributed to Dart objects
- native plugin memory
- FFI allocations
- codecs
- decoded images
- raster cache
- textures
- GPU resources
- mapped files
- operating-system working set/RSS

Flutter DevTools Memory exposes multiple memory categories and retaining-path/snapshot tools, allowing you to distinguish Dart-object retention from broader process/resource growth.

---

# Memory Leak Diagnostic Workflow

1. Reproduce on a representative profile/release scenario.
2. Establish startup/steady-state baseline.
3. Repeat the lifecycle suspected of leaking:
   - push/pop screen
   - open/close feature
   - connect/disconnect
   - load/unload data
4. Allow normal GC opportunity.
5. Observe whether memory stabilizes.
6. Take heap snapshots.
7. Compare Diff Snapshots.
8. Inspect suspicious surviving classes.
9. Follow retaining/inbound references.
10. Identify the owning root.
11. Check native/external/RSS separately.
12. Fix ownership, subscription, cache, closure, or native cleanup.
13. Repeat the exact scenario.
14. Compare retained counts and process-memory trend.

Do not label a rising chart as a leak without proving unintended retention.

Possible non-leak explanations include:

- intentional cache warmup
- temporary allocation spike
- delayed GC
- heap capacity growth
- fragmentation/RSS behavior
- image/raster/native memory
- legitimate long-lived application state

---

# Ownership and Disposable Resources

Use the ownership rule:

> The component that creates or acquires a resource for its own bounded lifetime normally owns its cleanup, unless ownership was explicitly transferred.

Flutter APIs reinforce this distinction. `ChangeNotifier` and `FocusNode` disposal documentation describes disposal as an owner responsibility; Flutter widgets that host a caller-provided resource do not automatically imply ownership transfer.

## Disposable Resource Checklist

Audit ownership of:

- `AnimationController`
- `TextEditingController`
- `ScrollController`
- `PageController`
- `TabController`
- `FocusNode`
- `TransformationController`
- `ValueNotifier`
- `ChangeNotifier`
- `StreamController`
- `StreamSubscription`
- `Timer`
- listener registrations
- observers
- route observers
- platform callbacks
- sockets
- WebSockets
- random-access files
- HTTP clients
- database handles/connections
- transactions
- isolate ports
- isolates
- FFI allocations/handles
- `NativeCallable`
- native resources

Map lifecycle operation to cleanup:

| Acquisition | Cleanup |
|---|---|
| controller/notifier owned locally | `dispose()` |
| StreamSubscription | `cancel()` |
| StreamController | `close()` |
| Timer | `cancel()` |
| listener | `removeListener()` |
| binding observer | `removeObserver()` |
| file/socket/client | appropriate `close()` / `destroy()` / abort |
| isolate port | `close()` |
| persistent worker | graceful shutdown / kill fallback |
| native allocation | corresponding native free/release |
| NativeCallable | `close()` |

`WidgetsBindingObserver` documentation explicitly instructs callers to unregister with `removeObserver` to avoid leaks.

---

# Timers

`Timer.periodic` continues producing callbacks until canceled. Exact callback timing is not guaranteed, and missed periods need not produce a callback for every nominal interval.

Danger patterns:

- periodic timer owned by a screen but never canceled
- high-frequency polling while data is unchanged
- callbacks capturing short-lived State objects
- polling while app is hidden
- timers used instead of event-driven APIs
- timer callback doing heavy synchronous work

Prefer:

- event-driven notification
- push updates
- lifecycle-aware suspension
- coarser cadence when freshness permits
- debouncing/coalescing
- cancellation at owner disposal

On JavaScript targets, Dart's timer API also documents browser timer granularity constraints.

---

# Streams

Audit every Stream pipeline for:

- source ownership
- subscription ownership
- cancellation
- controller closure
- event frequency
- buffering behavior
- work per event
- pause/resume semantics
- stale subscriber lifetime

Never assume an infinite/high-rate Stream has automatic backpressure.

If events arrive faster than they can be processed:

- reduce producer frequency
- pause a source that genuinely supports it
- batch/coalesce
- drop obsolete events
- use latest-state semantics
- move measured CPU processing to an appropriate worker on native
- cap queued transformations

---

# Listeners, Observers, and Closures

Match registrations with cleanup unless the registration is intentionally app-lifetime.

Long-lived callbacks can retain captured values.

A closure capturing:

- `State`
- `BuildContext`
- a view model
- a large model graph
- a service
- cached payloads

is not inherently a leak.

It becomes suspicious when the closure is held by a longer-lived object after the captured graph should have died.

Do not adopt the folklore rule "never capture BuildContext." Instead:

- avoid storing a short-lived context in global/app-lifetime callbacks
- use context only while mounted
- detach callbacks when their scope ends
- inspect retaining paths when proving a leak

---

# Global, Singleton, and DI Lifetimes

Global/app-lifetime state is legitimate when the underlying data is truly app-lifetime.

It is dangerous when a singleton retains:

- screen-specific models
- screen subscriptions
- route contexts
- unbounded maps
- per-session credentials after logout
- stale callbacks
- worker jobs
- native handles

Use explicit lifetimes:

- application
- authenticated session
- feature
- route/screen
- transient operation

Align service lifetime with resource lifetime.

A session-only service containing sockets, subscriptions, workers, and caches should normally die with the session rather than silently becoming a process-lifetime singleton.

---

# Cache Requirements

No potentially growing cache is production-ready without a bound or explicit proof of naturally bounded key space.

Define:

- ownership
- maximum entries
- maximum bytes when size varies materially
- TTL when freshness matters
- eviction policy
- invalidation
- memory-pressure behavior
- lifecycle reset conditions

Possible policies:

- LRU
- LFU when justified
- TTL
- byte cap
- per-user/session clear
- fixed-window cache

Do not solve a cache miss by arbitrarily increasing the cache until memory profiling demonstrates the device envelope can sustain it.

Decoded image memory is particularly important because decoded dimensions can be much larger than compressed network/file bytes.

---

# Images and Memory

Optimize image memory when profiling indicates image pressure:

- request/decode dimensions near display need
- avoid decoding massive source images for tiny thumbnails
- use `cacheWidth`/`cacheHeight` or equivalent decode sizing where appropriate
- lazy-load in scrolling content
- bound application-level image/data caches
- avoid retaining obsolete image providers/listeners
- inspect raster/image/cache memory independently from Dart heap

A 4K-style image decoded into 32-bit pixels can consume tens of megabytes even if its compressed source file is small; reason about decoded dimensions, not download bytes.

Do not convert this performance skill into an image architecture rewrite unless image memory/raster work is actually the bottleneck.

---

# FFI and Native Resources

Native memory is not ordinary Dart heap memory.

For FFI:

- determine who allocates
- determine exact matching free/release API
- document handle ownership transfer
- prevent double-free
- close callbacks
- keep native buffer lifetimes valid across asynchronous callbacks
- do not retain pointers past native lifetime
- profile synchronous native calls called from latency-sensitive Dart paths

## Blocking FFI

A synchronous native call invoked by root-isolate Dart code can block that Dart execution path until the native function returns.

Do not assume "native" means asynchronous.

## Leaf FFI

FFI leaf calls are intended only for small, short-running, nonblocking native functions. Current Dart API documentation warns that a long-running/blocking leaf call cannot cooperate normally with the runtime and can delay isolate-group synchronization such as GC.

Never mark an expensive or blocking native call `isLeaf: true` merely to reduce invocation overhead.

## NativeCallable

`NativeCallable.listener` can be invoked from another native thread and posts work back to its originating isolate. It must be closed when no longer needed; the API documents that it otherwise keeps the isolate alive.

---

# Finalizers

## `Finalizer`

A Dart `Finalizer` callback **may** be called after an attached object becomes inaccessible. There is no guarantee that it will run at a useful deterministic time.

## `NativeFinalizer`

`NativeFinalizer` provides stronger runtime lifecycle guarantees for native cleanup during normal isolate-group shutdown, but it still does not guarantee cleanup after abrupt process failure and its own documentation recommends explicit manual close for timely release.

Therefore:

> finalizers are leak-safety mechanisms, not the normal lifecycle protocol for scarce resources.

Use deterministic `close`/`dispose`/`free` first.

`NativeFinalizer.attach(externalSize: ...)` can communicate native-memory size to GC scheduling heuristics. This is accounting assistance, not a substitute for freeing memory.

---

# HTTP Resource Management

Networking-library behavior differs, so inspect the actual client/package.

For `dart:io` specifically:

- `HttpClient` supports persistent connection reuse
- idle connections can remain open
- close an owned client when its lifetime ends
- consume or drain response bodies; the API warns that leaving a response body unread can leak resources
- `HttpClientRequest.abort` provides an explicit request-abort mechanism for that API

Do not generalize `dart:io` cancellation or pooling APIs to every networking package.

Application-level network efficiency should consider:

- in-flight request deduplication
- pagination
- batching
- response caching
- retry limits
- jitter/backoff
- timeouts
- cancellation when supported
- stale-result rejection
- lifecycle/background restrictions

---

# Files, Sockets, and Databases

Prefer asynchronous file APIs on latency-sensitive isolates.

Explicitly close owned:

- random-access files
- sockets
- WebSockets
- database connections/handles
- transaction resources
- result streams/subscriptions

Avoid synchronous disk operations reachable from frame/input-critical callbacks.

For database libraries, inspect package-specific semantics before deciding whether the library:

- owns a worker isolate
- pools connections internally
- serializes writes
- exposes cancellable operations
- keeps native handles alive

Do not build an extra pool if the underlying library already provides the appropriate pooling/concurrency model.

---

# Platform Channels

Platform messages introduce:

- Dart encoding/decoding
- message transport
- native decoding
- task/thread scheduling
- result serialization
- return transport

Flutter supports invoking plugins from registered background isolates and native handlers can use platform-side task queues where supported.

Avoid:

- tiny high-frequency method-channel calls every animation tick
- large object graphs repeatedly crossing the boundary
- redundant channel round trips

Prefer batching/coalescing or keeping high-rate logic on one side of the boundary if profiling shows channel traffic as material.

Do not assume moving the Dart caller to an isolate automatically makes the host-side native work nonblocking; inspect native handler threading.

---
