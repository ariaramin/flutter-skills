# Reference navigation

This file preserves the uploaded **Research Sources** and adds navigation only.

## Table of contents
- [Flutter Concurrency, Memory & Performance — Research Sources](#flutter-concurrency-memory-performance-research-sources)
  - [Version Context](#version-context)
- [Dart Concurrency](#dart-concurrency)
  - [Concurrency in Dart](#concurrency-in-dart)
  - [dart:async](#dartasync)
  - [scheduleMicrotask](#schedulemicrotask)
  - [Timer](#timer)
  - [Timer.periodic](#timerperiodic)
- [Isolates](#isolates)
  - [Flutter — Concurrency and isolates](#flutter-concurrency-and-isolates)
  - [Isolate class](#isolate-class)
  - [Isolate.spawn](#isolatespawn)
  - [Isolate.exit](#isolateexit)
  - [SendPort.send](#sendportsend)
  - [ReceivePort](#receiveport)
  - [RawReceivePort.keepIsolateAlive](#rawreceiveportkeepisolatealive)
  - [TransferableTypedData](#transferabletypeddata)
  - [Platform.numberOfProcessors](#platformnumberofprocessors)
- [Event Loop / Scheduling](#event-loop-scheduling)
  - [scheduleMicrotask](#schedulemicrotask)
  - [Flutter Scheduler / lifecycle APIs](#flutter-scheduler-lifecycle-apis)
- [Flutter Rendering](#flutter-rendering)
  - [Flutter architectural overview](#flutter-architectural-overview)
  - [Merged threads on macOS and Windows](#merged-threads-on-macos-and-windows)
  - [Merged threads on Linux](#merged-threads-on-linux)
  - [Flutter performance best practices](#flutter-performance-best-practices)
  - [Flutter Performance FAQ](#flutter-performance-faq)
  - [Display.refreshRate](#displayrefreshrate)
  - [Android slow rendering](#android-slow-rendering)
  - [Apple ProMotion guidance](#apple-promotion-guidance)
- [Lists / Layout](#lists-layout)
  - [ListView.builder](#listviewbuilder)
  - [ScrollView shrinkWrap](#scrollview-shrinkwrap)
  - [ScrollView.cacheExtent deprecation](#scrollviewcacheextent-deprecation)
- [DevTools](#devtools)
  - [Performance view](#performance-view)
  - [CPU profiler](#cpu-profiler)
  - [Memory view](#memory-view)
  - [Network view](#network-view)
  - [Flutter Web performance](#flutter-web-performance)
- [Timeline Instrumentation](#timeline-instrumentation)
  - [dart:developer Timeline](#dartdeveloper-timeline)
  - [Timeline.startSync](#timelinestartsync)
- [Memory](#memory)
  - [DevTools Memory concepts](#devtools-memory-concepts)
  - [Dart VM garbage collector documentation](#dart-vm-garbage-collector-documentation)
  - [Dart VM isolate groups](#dart-vm-isolate-groups)
- [Lifecycle / Disposal](#lifecycle-disposal)
  - [AppLifecycleState](#applifecyclestate)
  - [State.dispose](#statedispose)
  - [ChangeNotifier.dispose](#changenotifierdispose)
  - [FocusNode lifecycle](#focusnode-lifecycle)
  - [WidgetsBindingObserver](#widgetsbindingobserver)
- [HTTP / I/O](#http-io)
  - [HttpClient](#httpclient)
  - [HttpClient.close](#httpclientclose)
  - [HttpClientRequest.abort](#httpclientrequestabort)
- [JSON](#json)
  - [Parse JSON in the background](#parse-json-in-the-background)
  - [jsonDecode](#jsondecode)
- [Platform Channels](#platform-channels)
  - [Platform-specific code / channels](#platform-specific-code-channels)
- [FFI / Native Resources](#ffi-native-resources)
  - [dart:ffi](#dartffi)
  - [Native leaf calls](#native-leaf-calls)
  - [NativeCallable.listener](#nativecallablelistener)
  - [NativeCallable.close](#nativecallableclose)
  - [Flutter FFI package guidance](#flutter-ffi-package-guidance)
  - [Legacy FFI plugin workflow](#legacy-ffi-plugin-workflow)
- [Finalizers](#finalizers)
  - [Finalizer](#finalizer)
  - [NativeFinalizer](#nativefinalizer)
  - [NativeFinalizer.attach](#nativefinalizerattach)
- [Web](#web)
  - [Dart concurrency](#dart-concurrency)
  - [Flutter isolates](#flutter-isolates)
  - [Flutter Web renderer](#flutter-web-renderer)
  - [MDN Web Workers](#mdn-web-workers)
  - [MDN transferable objects](#mdn-transferable-objects)
- [Android](#android)
  - [Slow rendering](#slow-rendering)
  - [Manage app memory](#manage-app-memory)
  - [Background execution limits](#background-execution-limits)
- [Apple / iOS / macOS](#apple-ios-macos)
  - [ProMotion](#promotion)
  - [Understanding hitches](#understanding-hitches)
  - [iOS background execution](#ios-background-execution)
  - [macOS energy efficiency](#macos-energy-efficiency)
- [Windows](#windows)
  - [Flutter Windows architecture/integration](#flutter-windows-architectureintegration)
  - [Windows Performance Analyzer](#windows-performance-analyzer)
- [Linux](#linux)
  - [Flutter Linux integration](#flutter-linux-integration)
  - [Flutter Linux thread merge](#flutter-linux-thread-merge)
- [Background Processes](#background-processes)
  - [Flutter background processes](#flutter-background-processes)

---

# Flutter Concurrency, Memory & Performance — Research Sources

## Version Context

### Flutter documentation baseline

**Stay up to date — Flutter**  
URL: https://docs.flutter.dev/release  
Establishes: current Flutter documentation reflects Flutter 3.44.7.  
Context: Flutter 3.44.7, current as researched 2026-08-09.

### Dart documentation baseline

**Dart documentation**  
URL: https://dart.dev/docs  
Establishes: current Dart documentation reflects Dart 3.12.2.  
Context: Dart 3.12.2.

### Supported Flutter deployment targets

**Supported deployment platforms**  
URL: https://docs.flutter.dev/reference/supported-platforms  
Establishes: current Android, iOS, Windows, macOS, Linux, Chrome/Firefox/Safari/Edge support ranges and architecture support.  
Relevant: all Flutter deployment platforms.  
Context: Flutter 3.44.7.

---

# Dart Concurrency

## Concurrency in Dart

URL: https://dart.dev/language/concurrency  
Establishes:

- event-loop and isolate mental model
- concurrency versus parallelism
- Dart Native isolate support
- isolate memory/message semantics
- Web has no Dart isolates
- `Isolate.run` versus long-lived `Isolate.spawn`

Relevant API: `Future`, `Stream`, `Isolate`.  
Context: Dart 3.12.2.

## dart:async

URL: https://api.dart.dev/dart-async/  
Establishes:

- Futures and Streams as asynchronous primitives
- asynchronous I/O can use runtime/OS facilities
- async result availability is not synonymous with parallel Dart execution

Context: Dart 3.12.2.

## scheduleMicrotask

URL: https://api.dart.dev/dart-async/scheduleMicrotask.html  
Establishes:

- microtasks execute before ordinary asynchronous events
- recursive microtask scheduling can starve timers/DOM/events

Relevant API: `scheduleMicrotask`.  
Context: Dart 3.12.2.

## Timer

URL: https://api.dart.dev/dart-async/Timer-class.html  
Establishes:

- timer scheduling semantics
- browser timer granularity note

Context: Native and Web.

## Timer.periodic

URL: https://api.dart.dev/dart-async/Timer/Timer.periodic.html  
Establishes:

- periodic timers repeat until canceled
- exact intervals are not guaranteed

Context: Dart 3.12.2.

---

# Isolates

## Flutter — Concurrency and isolates

URL: https://docs.flutter.dev/perf/isolates  
Establishes:

- `compute` and `Isolate.run`
- one-shot and persistent workers
- native versus Web difference
- background isolate plugin registration
- `rootBundle`/`dart:ui` limitations
- unsolicited platform-message limitations

Context: Flutter 3.44.7.

## Isolate class

URL: https://api.dart.dev/dart-isolate/Isolate-class.html  
Establishes: isolate control/lifecycle model.  
Context: Dart Native, Dart 3.12.2.

## Isolate.spawn

URL: https://api.dart.dev/dart-isolate/Isolate/spawn.html  
Establishes:

- spawned execution context
- error/exit setup
- closure capture caveat
- current order-of-magnitude base memory overhead
- debug naming

Context: Dart Native 3.12.2.

## Isolate.exit

URL: https://api.dart.dev/dart-isolate/Isolate/exit.html  
Establishes:

- synchronous isolate termination
- pending `finally` blocks do not execute
- final same-isolate-group message may transfer without normal copying

Context: Dart Native 3.12.2.

## SendPort.send

URL: https://api.dart.dev/dart-isolate/SendPort/send.html  
Establishes:

- sendability rules
- transitive mutable graph copying can have linear cost
- immutable sharing where supported
- closure-capture implications

Context: Dart Native.

## ReceivePort

URL: https://api.dart.dev/dart-isolate/ReceivePort-class.html  
Establishes: one-listener receive-port semantics and lifecycle.

## RawReceivePort.keepIsolateAlive

URL: https://api.dart.dev/dart-isolate/RawReceivePort/keepIsolateAlive.html  
Establishes: receive ports keep an isolate alive by default until closed.  
Context: Dart 3.12.2.

## TransferableTypedData

URL: https://api.dart.dev/dart-isolate/TransferableTypedData-class.html  
Establishes: ownership-transfer mechanism for typed binary data; useful for avoiding repeated copies across isolate boundaries.

## Platform.numberOfProcessors

URL: https://api.dart.dev/dart-io/Platform/numberOfProcessors.html  
Establishes: available execution-unit count.  
Caveat: does not prescribe worker-pool size.

---

# Event Loop / Scheduling

## scheduleMicrotask

URL: https://api.dart.dev/dart-async/scheduleMicrotask.html  
Establishes event starvation risk.

## Flutter Scheduler / lifecycle APIs

API root: https://api.flutter.dev/flutter/scheduler/SchedulerBinding-class.html  
Relevant APIs:

- frame scheduling
- frame callbacks
- timings callbacks
- scheduled tasks

Engineering implication: post-frame work is still Dart work on the root isolate; it is not background execution.

---

# Flutter Rendering

## Flutter architectural overview

URL: https://docs.flutter.dev/resources/architectural-overview  
Establishes:

- framework/engine/embedder responsibilities
- platform integration
- current Android/iOS thread merge note

Context: Flutter 3.44.7.

## Merged threads on macOS and Windows

URL: https://docs.flutter.dev/release/breaking-changes/macos-windows-merged-threads  
Establishes:

- UI/platform threads merged by default on macOS/Windows in Flutter 3.35
- Android/iOS were already merged in 3.29

Context: Flutter 3.35+.

## Merged threads on Linux

URL: https://docs.flutter.dev/release/breaking-changes/linux-merged-threads  
Establishes:

- Linux default UI/platform-thread merge
- landed pre-3.41 and stable in Flutter 3.41

Context: current native Flutter topology.

## Flutter performance best practices

URL: https://docs.flutter.dev/perf/best-practices  
Establishes:

- build-cost guidance
- lazy lists
- intrinsic-layout costs
- `saveLayer`
- opacity/clipping
- repaint/raster considerations

Context: Flutter 3.44.7.

## Flutter Performance FAQ

URL: https://docs.flutter.dev/perf/faq  
Establishes:

- current tooling/rebuild guidance
- querying target FPS
- isolate recommendation for expensive Dart work

Context: Flutter 3.44.7.

## Display.refreshRate

URL: https://api.flutter.dev/flutter/dart-ui/Display/refreshRate.html  
Establishes: current display refresh rate is available through Flutter's `Display`.

## Android slow rendering

URL: https://developer.android.com/topic/performance/vitals/render  
Establishes:

- ~16 ms at 60 Hz
- ~11 ms at 90 Hz
- ~8 ms at 120 Hz
- missed deadline produces jank

Platform: Android.

## Apple ProMotion guidance

URL: https://developer.apple.com/documentation/quartzcore/optimizing-iphone-and-ipad-apps-to-support-promotion-displays  
Establishes:

- adaptive/variable refresh
- up to 120 Hz on supported devices
- thermal/power conditions can alter available refresh rates
- higher refresh rates can increase power consumption

Platform: iOS/iPadOS.

---

# Lists / Layout

## ListView.builder

URL: https://api.flutter.dev/flutter/widgets/ListView/ListView.builder.html  
Establishes: on-demand child creation for lazy list rendering.

## ScrollView shrinkWrap

Relevant API: https://api.flutter.dev/flutter/widgets/ScrollView/shrinkWrap.html  
Establishes: shrink-wrap sizing is significantly more expensive because extent may need recomputation during scrolling.

## ScrollView.cacheExtent deprecation

URL: https://api.flutter.dev/flutter/widgets/ScrollView/cacheExtent.html  
Establishes:

- `cacheExtent` deprecated after v3.41.0-0.0.pre
- use `scrollCacheExtent`

Context: Flutter 3.44.x.

---

# DevTools

## Performance view

URL: https://docs.flutter.dev/tools/devtools/performance  
Establishes:

- frame chart
- UI/raster timing
- timeline
- frame analysis
- build/layout/paint tracking
- profile-mode workflow

Context: current Flutter DevTools.

## CPU profiler

URL: https://docs.flutter.dev/tools/devtools/cpu-profiler  
Establishes:

- sampling profile
- call tree
- bottom-up
- method table
- flame chart
- startup profiling options

Context: current DevTools.

## Memory view

URL: https://docs.flutter.dev/tools/devtools/memory  
Establishes:

- live memory
- external/RSS context
- Diff Snapshots
- Trace Instances
- allocation analysis
- retaining/reference investigation

Context: current available Memory tooling; page itself carries its DevTools-specific update context.

## Network view

URL: https://docs.flutter.dev/tools/devtools/network  
Establishes:

- request inspection
- HTTP/HTTPS/WebSocket activity for supported providers

Context: Flutter native/Dart network profiling.

## Flutter Web performance

URL: https://docs.flutter.dev/perf/web-performance  
Establishes use of browser/Chrome tooling for Flutter Web performance work.

---

# Timeline Instrumentation

## dart:developer Timeline

URL: https://api.dart.dev/dart-developer/Timeline-class.html  
Establishes:

- synchronous custom trace events
- `startSync`
- `finishSync`
- `timeSync`

Context: Dart 3.12.2.

## Timeline.startSync

URL: https://api.dart.dev/dart-developer/Timeline/startSync.html  
Establishes: synchronous slice must be completed before return to event queue.

---

# Memory

## DevTools Memory concepts

URL: https://docs.flutter.dev/tools/devtools/memory  
Establishes:

- reachability
- retaining references
- heap snapshots
- memory leaks versus memory bloat
- Dart/native/external categories



## Dart VM garbage collector documentation

URL: https://github.com/dart-lang/sdk/blob/main/runtime/docs/gc.md  
Establishes current Dart VM Native generational collector implementation.  
Caveat: VM implementation detail, not a Dart language or Web guarantee.

## Dart VM isolate groups

URL: https://github.com/dart-lang/sdk/blob/main/runtime/docs  
Establishes current VM implementation where same-group isolates share internal managed-heap/GC infrastructure while Dart semantics still prevent ordinary shared mutable objects.  
Caveat: implementation detail, not shared-memory application programming.

---

# Lifecycle / Disposal

## AppLifecycleState

URL: https://api.flutter.dev/flutter/dart-ui/AppLifecycleState.html  
Establishes:

- `detached`
- `resumed`
- `inactive`
- `hidden`
- `paused`
- platform differences
- no frame callbacks while mobile app is paused

Context: current Flutter API.

## State.dispose

URL: https://api.flutter.dev/flutter/widgets/State/dispose.html  
Establishes:

- disposal is terminal
- State becomes unmounted
- subscription lifecycle recommendations



## ChangeNotifier.dispose

URL: https://api.flutter.dev/flutter/foundation/ChangeNotifier/dispose.html  
Establishes: disposal is an owner responsibility.

## FocusNode lifecycle

URL: https://api.flutter.dev/flutter/widgets/FocusNode-class.html  
Establishes: owner creates/disposes; hosting widget can attach/reparent without owning caller-provided node.

## WidgetsBindingObserver

URL: https://api.flutter.dev/flutter/widgets/WidgetsBindingObserver-class.html  
Establishes: observer should unregister to avoid leaks.

---

# HTTP / I/O

## HttpClient

URL: https://api.dart.dev/dart-io/HttpClient-class.html  
Establishes:

- persistent connections
- connection reuse
- response bodies must be consumed/drained
- client close lifecycle

Context: `dart:io`, not Web.

## HttpClient.close

URL: https://api.dart.dev/dart-io/HttpClient/close.html  
Establishes graceful versus force close.

## HttpClientRequest.abort

URL: https://api.dart.dev/dart-io/HttpClientRequest/abort.html  
Establishes API-specific request cancellation/abort support.

---

# JSON

## Parse JSON in the background

URL: https://docs.flutter.dev/cookbook/networking/background-parsing  
Establishes:

- large synchronous parse/model work can freeze slower devices
- `compute` is a native-target offload mechanism

Caveat: fixed 16 ms examples should be adapted to actual display/frame budgets.

## jsonDecode

URL: https://api.dart.dev/dart-convert/jsonDecode.html  
Establishes: synchronous JSON decode API.

---

# Platform Channels

## Platform-specific code / channels

URL: https://docs.flutter.dev/platform-integration/platform-channels  
Establishes:

- root/registered-background-isolate channel access
- platform handler threading
- Android Task Queue support

Context: Flutter 3.44.x.

---

# FFI / Native Resources

## dart:ffi

URL: https://api.dart.dev/dart-ffi/  
Establishes primary Dart FFI APIs.

## Native leaf calls

URL: https://api.dart.dev/dart-ffi/Native/isLeaf.html  
Establishes:

- leaf calls must be small, short-running, nonblocking
- blocking/long leaf calls can delay isolate-group synchronization/GC

Context: Dart Native 3.12.2.

## NativeCallable.listener

URL: https://api.dart.dev/dart-ffi/NativeCallable/NativeCallable.listener.html  
Establishes:

- callback can originate from arbitrary native thread
- work is sent to originating isolate
- callable must close
- it can keep isolate alive



## NativeCallable.close

URL: https://api.dart.dev/dart-ffi/NativeCallable/close.html  
Establishes explicit callback resource release.

## Flutter FFI package guidance

URL: https://docs.flutter.dev/platform-integration/bind-native-code  
Establishes:

- current `package_ffi` recommendation
- build-hook workflow
- recommended since Flutter 3.38



## Legacy FFI plugin workflow

URL: https://docs.flutter.dev/platform-integration/legacy-ffi-plugin  
Establishes `plugin_ffi` is legacy since 3.38, with exceptions where plugin API/platform setup is needed.

---

# Finalizers

## Finalizer

URL: https://api.dart.dev/dart-core/Finalizer-class.html  
Establishes:

- callback may run after object becomes inaccessible
- not deterministic
- not guaranteed as primary cleanup

Context: Dart 3.12.2.

## NativeFinalizer

URL: https://api.dart.dev/dart-ffi/NativeFinalizer-class.html  
Establishes:

- stronger native cleanup semantics
- still not reliable for abrupt process termination
- explicit manual close preferred for timely release

Context: Dart Native.

## NativeFinalizer.attach

URL: https://api.dart.dev/dart-ffi/NativeFinalizer/attach.html  
Establishes `externalSize` affects GC scheduling heuristics.

---

# Web

## Dart concurrency

URL: https://dart.dev/language/concurrency  
Establishes: Dart isolates are Native-only; browser workers are a separate mechanism.

## Flutter isolates

URL: https://docs.flutter.dev/perf/isolates  
Establishes: `compute` runs on current event loop on Web.

## Flutter Web renderer

URL: https://docs.flutter.dev/platform-integration/web/renderers  
Establishes CanvasKit/skwasm renderer behavior and multithreaded rendering conditions.  
Caveat: renderer threads are not Dart application isolates.

## MDN Web Workers

URL: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API  
Establishes browser worker execution model.

## MDN transferable objects

URL: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects  
Establishes transfer-of-ownership behavior for transferable browser objects.

---

# Android

## Slow rendering

URL: https://developer.android.com/topic/performance/vitals/render  
Establishes 60/90/120 Hz timing and jank concepts.

## Manage app memory

URL: https://developer.android.com/topic/performance/memory  
Establishes:

- device-dependent heap limits
- memory pressure
- releasing memory/resources

## Background execution limits

URL: https://developer.android.com/develop/background-work/background-tasks  
Establishes Android-controlled background execution and scheduling.

Engineering implication: isolate lifetime is not an Android background execution entitlement.

---

# Apple / iOS / macOS

## ProMotion

URL: https://developer.apple.com/documentation/quartzcore/optimizing-iphone-and-ipad-apps-to-support-promotion-displays  
Establishes adaptive refresh, frame timing, thermal/power variation, energy implications.

## Understanding hitches

URL: https://developer.apple.com/documentation/xcode/understanding-hitches-in-your-app  
Establishes 120 Hz ≈ 8.3 ms and pipeline deadline implications.

## iOS background execution

URL: https://developer.apple.com/documentation/backgroundtasks  
Establishes system-governed background scheduling.

## macOS energy efficiency

URL: https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/  
Establishes event-driven/background energy principles.

---

# Windows

## Flutter Windows architecture/integration

URL: https://docs.flutter.dev/platform-integration/windows  
Establishes Flutter's Windows native integration context.

## Windows Performance Analyzer

URL: https://learn.microsoft.com/windows-hardware/test/wpt/windows-performance-analyzer  
Establishes Windows trace analysis for CPU/system performance.

Engineering focus:

- long-running process behavior
- working set
- background CPU
- native handle/plugin lifetime

---

# Linux

## Flutter Linux integration

URL: https://docs.flutter.dev/platform-integration/linux  
Establishes Linux embedding/native integration context.

## Flutter Linux thread merge

URL: https://docs.flutter.dev/release/breaking-changes/linux-merged-threads  
Establishes current merged UI/platform-thread default.

Official Flutter/Linux documentation provides less app-level battery/background-policy guidance than Android/iOS. Avoid inventing mobile-style suspension semantics for Linux.

---

# Background Processes

## Flutter background processes

URL: https://docs.flutter.dev/packages-and-plugins/background-processes  
Establishes:

- Flutter background-process overview
- isolate involvement in some plugin designs
- persistent OS-managed scheduling needs a platform mechanism such as WorkManager-style integration

Context: Flutter 3.44.7; page updated 2026-07-29.