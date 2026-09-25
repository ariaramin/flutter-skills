# Contents

- [Flutter Performance & Jank Optimization Skill](#flutter-performance-jank-optimization-skill)
  - [Purpose](#purpose)
    - [Version baseline](#version-baseline)
  - [When to Use This Skill](#when-to-use-this-skill)
  - [Core Principles](#core-principles)
    - [1. Measure before optimizing](#1-measure-before-optimizing)
    - [2. Profile outside debug mode](#2-profile-outside-debug-mode)
    - [3. Classify before fixing](#3-classify-before-fixing)
    - [4. Optimize the largest measured cost first](#4-optimize-the-largest-measured-cost-first)
    - [5. Rebuilds are not inherently bad](#5-rebuilds-are-not-inherently-bad)
    - [6. Keep synchronous CPU work off interaction-critical paths](#6-keep-synchronous-cpu-work-off-interaction-critical-paths)
    - [7. Use lazy UI construction for large collections](#7-use-lazy-ui-construction-for-large-collections)
    - [8. Decode images near the size actually needed](#8-decode-images-near-the-size-actually-needed)
    - [9. Avoid unnecessary rendering complexity](#9-avoid-unnecessary-rendering-complexity)
    - [10. Bound caches and retained state deliberately](#10-bound-caches-and-retained-state-deliberately)
    - [11. Test representative hardware](#11-test-representative-hardware)
    - [12. Re-measure every meaningful optimization](#12-re-measure-every-meaningful-optimization)
    - [13. Preserve correctness](#13-preserve-correctness)
    - [14. Preserve accessibility](#14-preserve-accessibility)
    - [15. Prefer the least invasive effective change](#15-prefer-the-least-invasive-effective-change)
- [Flutter Rendering Mental Model](#flutter-rendering-mental-model)
    - [Main/UI isolate](#mainui-isolate)
    - [Raster thread](#raster-thread)
    - [Pipelining matters](#pipelining-matters)
- [Frame Budget](#frame-budget)
    - [Usable budget is nuanced](#usable-budget-is-nuanced)
    - [UI frame over budget](#ui-frame-over-budget)
    - [Raster frame over budget](#raster-frame-over-budget)
    - [Input latency](#input-latency)
- [Build Modes](#build-modes)
  - [Debug](#debug)
  - [Profile](#profile)
  - [Release](#release)
  - [Web](#web)
    - [Rule](#rule)
- [Representative Devices](#representative-devices)
- [Performance Diagnostic Decision Tree](#performance-diagnostic-decision-tree)
- [DevTools Workflow](#devtools-workflow)
  - [Performance view](#performance-view)
    - [Recommended workflow](#recommended-workflow)
  - [Enhanced tracing](#enhanced-tracing)
  - [CPU profiler](#cpu-profiler)
  - [Memory view](#memory-view)
  - [Network view](#network-view)
  - [Performance Overlay](#performance-overlay)
  - [Removed/stale tooling](#removedstale-tooling)
- [Frame Timing Instrumentation](#frame-timing-instrumentation)
- [UI-Isolate Performance](#ui-isolate-performance)
    - [Rule](#rule)
    - [Event handlers](#event-handlers)

---

# Flutter Performance & Jank Optimization Skill

## Purpose

Use this skill to profile, diagnose, implement, review, and validate performance work in production Flutter applications.

Optimize from evidence, not intuition.

Follow this loop for every performance problem:

```text
Observed symptom
      ↓
Representative measurement
      ↓
Bottleneck classification
      ↓
Smallest effective optimization
      ↓
Re-measure
      ↓
Keep, revise, or revert
```

This skill covers:

- frame jank;
- dropped and missed frames;
- UI stalls;
- input latency;
- scrolling;
- animations;
- widget build cost;
- layout;
- painting and compositing;
- raster/GPU work;
- image decoding and memory;
- CPU-heavy Dart work;
- isolates;
- allocations and garbage collection;
- startup;
- platform channels;
- platform views;
- networking where it affects responsiveness;
- Android;
- iOS;
- Flutter web;
- desktop;
- battery and thermal behavior;
- performance testing and regression prevention.

### Version baseline

This skill is grounded in current Flutter documentation in the Flutter 3.44 stable family, with current Flutter documentation generally reflecting Flutter 3.44.7 as of August 2026.

Before making a version-sensitive optimization, inspect the repository's actual Flutter/Dart SDK version and current platform configuration.

Current version-sensitive facts include:

- Impeller is the only supported renderer on iOS.
- Impeller is enabled by default on Android API 29+ when supported; lower API levels or devices without suitable Vulkan support use the legacy OpenGL renderer.
- Flutter web currently uses Skia-based renderers, not Impeller.
- Flutter web currently offers `canvaskit` and `skwasm`; stale advice about an HTML renderer is not current.
- `ListView.cacheExtent` and the old viewport `cacheExtent` configuration are deprecated in current Flutter in favor of `scrollCacheExtent`.
- DevTools' old Raster Stats feature has been removed because it did not work with Impeller and could produce misleading conclusions.

Treat engine/backend details as version-sensitive. Re-check official Flutter documentation before applying advice based on renderer internals.

---

## When to Use This Skill

Use this skill when working on:

- visible jank;
- dropped or missed frames;
- slow or inconsistent animations;
- laggy scrolling;
- input latency;
- taps that feel delayed;
- text-field typing stalls;
- search-as-you-type stalls;
- expensive screen transitions;
- large lists and grids;
- image-heavy feeds;
- high raster/GPU time;
- excessive paint/compositing;
- high CPU usage;
- high memory use;
- frequent memory-pressure events;
- suspicious GC-related stalls;
- memory leaks;
- startup latency;
- slow first frame;
- slow first meaningful content;
- plugin initialization;
- platform-channel bottlenecks;
- `WebView`, maps, camera, ads, or other platform-view performance;
- Flutter web startup or frame performance;
- desktop resizing or high-DPI rendering issues;
- performance code review;
- isolate decisions;
- performance test creation;
- regression benchmarking;
- validating a proposed "optimization."

Do not start by applying optimization patterns. Start by reproducing and measuring the actual workload.

---

## Core Principles

### 1. Measure before optimizing

**Do not optimize Flutter performance based on intuition alone.**

Measure the affected workload in profile or release-like conditions first.

Do not accept:

```text
"This widget looks expensive."
"setState rebuilds too much."
"const will make it faster."
"We should move this to an isolate."
"We need more RepaintBoundary widgets."
"Shaders are probably compiling."
```

as sufficient evidence.

Require:

```text
symptom
+
trace/profile
+
identified contributor
```

before a meaningful refactor.

### 2. Profile outside debug mode

Do not use debug-mode frame timing as production evidence.

Use:

- profile mode for interactive DevTools analysis;
- release builds for final user-facing validation where instrumentation is unnecessary;
- Chrome DevTools with a profile build for Flutter web.

Flutter's official performance tooling explicitly recommends profile mode because debug-mode frame performance does not represent release behavior.

### 3. Classify before fixing

Classify the problem as one or more of:

- build-bound;
- layout-bound;
- paint/display-list-bound;
- raster/GPU-bound;
- image decode/upload-bound;
- main-isolate CPU-bound;
- memory/allocation/GC-bound;
- platform-channel-bound;
- platform-view-bound;
- network/I/O-bound;
- startup-bound;
- browser/web-main-thread-bound.

Do not mix unrelated remedies.

### 4. Optimize the largest measured cost first

If raster work is taking 25 ms and Dart build work takes 3 ms, do not start by adding `const` widgets.

If synchronous JSON parsing blocks the UI isolate for 80 ms, do not redesign shadows.

### 5. Rebuilds are not inherently bad

Flutter is designed around cheap declarative rebuilds.

A widget rebuilding frequently is not itself a bug.

Investigate whether that rebuild causes meaningful:

- CPU work;
- subtree traversal;
- layout;
- painting;
- allocation;
- state comparison.

### 6. Keep synchronous CPU work off interaction-critical paths

Any long synchronous Dart computation on the main isolate competes with:

- input handling;
- frame scheduling;
- builds;
- layouts;
- paint recording.

Offload only when measured work is large enough to justify isolate overhead.

### 7. Use lazy UI construction for large collections

Use builders/slivers for large or unbounded content.

Do not turn a five-row static form into a lazy sliver architecture without reason.

### 8. Decode images near the size actually needed

Do not routinely decode multi-megapixel images for tiny thumbnails.

Use appropriate decode dimensions on platforms where Flutter's image decoder supports them.

### 9. Avoid unnecessary rendering complexity

Treat these as suspects when raster-bound:

- large blurs;
- shadows;
- filters;
- clips;
- opacity layers;
- offscreen layers;
- complex paths;
- oversized images;
- platform views.

Do not remove them without profiling.

### 10. Bound caches and retained state deliberately

Caching trades CPU/I/O for memory.

More cache is not automatically faster.

Less cache is not automatically more efficient.

### 11. Test representative hardware

Test:

- low/mid-tier production devices where they represent users;
- actual Android/iOS hardware;
- relevant refresh rates;
- current supported OS versions;
- realistic network/storage;
- web browsers the application actually supports.

Do not treat a flagship development phone as the performance floor.

### 12. Re-measure every meaningful optimization

Every optimization must answer:

1. What measured problem does this solve?
2. Why should this change reduce that cost?
3. What tradeoff does it introduce?
4. Which measurement verifies success?

### 13. Preserve correctness

Never improve a benchmark by breaking:

- state semantics;
- data freshness;
- scrolling behavior;
- hit testing;
- navigation;
- user-visible content.

### 14. Preserve accessibility

Do not remove:

- semantics;
- accessible scrolling;
- readable text;
- focus behavior;
- reduced-motion support;
- interaction affordances;

for minor benchmark improvements.

### 15. Prefer the least invasive effective change

Do not make an architectural rewrite because an implementation "looks slow."

Change the smallest component that addresses the measured bottleneck.

---

# Flutter Rendering Mental Model

Use this simplified model:

```text
User input / timers / async completion
                ↓
          Main Dart isolate
                ↓
        Application logic
                ↓
              Build
                ↓
              Layout
                ↓
        Paint / display lists
                ↓
        Layer tree / scene
                ↓
           Raster thread
                ↓
      GPU / compositor / display
```

Additional work can enter the pipeline from:

```text
Network / file / database I/O
            ↓
        async result
            ↓
       Dart processing
```

```text
Images
  ↓
fetch/load
  ↓
decode
  ↓
cache
  ↓
upload / raster use
```

```text
Platform channel
      ↓
native platform code
      ↓
response / callback
```

```text
Platform view
      ↓
native view composition
      ↓
synchronization with Flutter
```

```text
Dart allocations
      ↓
heap growth
      ↓
garbage collection
```

### Main/UI isolate

The main Dart isolate handles application Dart work including:

- event handlers;
- state transitions;
- widget builds;
- synchronous parsing;
- sorting;
- filtering;
- serialization;
- layout-related framework work;
- paint/display-list recording.

Blocking it can delay both rendering and input processing.

### Raster thread

The raster thread consumes the scene/layer representation and performs rendering work that ultimately becomes GPU commands and pixels.

A raster-bound frame can remain slow even when Dart/UI work is inexpensive.

DevTools' Flutter Frames chart explicitly separates UI and raster work for this reason.

### Pipelining matters

Do not simply add:

```text
UI duration + raster duration
```

and compare that sum to a single frame budget.

UI and raster stages are pipelined.

Analyze each stage against the target frame interval, and use end-to-end frame timing/input measurements when latency matters.

---

# Frame Budget

A frame budget depends on display refresh rate.

Approximate frame intervals:

```text
60 Hz  → 1000 / 60  ≈ 16.67 ms
90 Hz  → 1000 / 90  ≈ 11.11 ms
120 Hz → 1000 / 120 ≈ 8.33 ms
144 Hz → 1000 / 144 ≈ 6.94 ms
```

Do not hardcode:

```text
16 ms = good
```

as a universal rule.

A screen that is smooth at 60 Hz can miss deadlines at 120 Hz.

### Usable budget is nuanced

Real scheduling involves:

- vsync;
- framework scheduling;
- OS compositor timing;
- display pipeline;
- thread contention;
- dynamic refresh rate;
- platform-specific behavior.

Use the actual device and observed frame timing as the authority.

### UI frame over budget

Investigate:

- synchronous Dart work;
- expensive widget building;
- repeated state computation;
- layout;
- intrinsic measurements;
- excessive paint recording;
- allocation/GC events.

### Raster frame over budget

Investigate:

- large images;
- complex painting;
- filters;
- blur;
- shadows;
- clipping;
- save layers;
- platform views;
- large/complex vector scenes;
- GPU/backend issues.

### Input latency

A UI can appear visually smooth but still feel slow.

Flutter's `FrameTiming` exposes both stage durations and `totalSpan`; official API guidance notes that total frame latency can be problematic even when individual build/raster stages do not independently miss a deadline.

Measure input latency when users report:

- delayed taps;
- typing lag;
- drag lag;
- interactions responding one or more frames late.

---

# Build Modes

## Debug

Use debug mode for:

- development;
- assertions;
- hot reload;
- inspector/debugging.

Do not use it for final performance conclusions.

Debug mode includes development instrumentation and execution characteristics that differ significantly from production.

## Profile

Use profile mode for:

- DevTools Performance view;
- CPU profiling;
- memory investigation;
- frame timelines;
- performance experiments.

On native targets, profile mode is intended to behave much closer to release while preserving profiling support.

## Release

Use release mode for:

- final startup validation;
- final app-size/download testing;
- user-facing benchmark confirmation;
- situations where profiling instrumentation itself could affect the metric.

## Web

Flutter web performance profiling uses a profile build and Chrome DevTools' Performance panel rather than Flutter DevTools' native Performance view.

### Rule

For every performance report, record:

```text
Flutter version
build mode
device/browser
OS version
refresh rate
renderer/backend
test scenario
data size
network/storage conditions
```

Without this context, before/after comparisons are weak.

---

# Representative Devices

Maintain a performance matrix based on the actual product.

Example:

| Tier | Example role |
|---|---|
| Low-end Android | Performance floor |
| Mid-tier Android | Common real-user case |
| Recent Android | High-refresh validation |
| Supported iPhone floor | iOS performance floor |
| Current iPhone | High-refresh / current renderer |
| Chrome desktop | Web baseline |
| Safari/WebKit | Web compatibility/performance |
| Desktop target | Resizing/high-DPI/native integrations |

Do not benchmark only:

- simulators;
- emulators;
- flagship phones;
- development laptops.

Simulators/emulators are useful for functionality but are not reliable production performance evidence.

---

# Performance Diagnostic Decision Tree

Use this before changing code.

```text
User reports slowness
│
├─ Is the issue reproducible in profile/release-like mode?
│  ├─ No → investigate debug/tooling artifact
│  └─ Yes
│
├─ Is it frame jank?
│  │
│  ├─ UI/main-isolate time high
│  │  │
│  │  ├─ Build events high?
│  │  │  ├─ broad state subscription
│  │  │  ├─ expensive build computation
│  │  │  └─ huge rebuilt subtree
│  │  │
│  │  ├─ Layout events high?
│  │  │  ├─ intrinsic sizing
│  │  │  ├─ shrink-wrapped scrolling
│  │  │  ├─ repeated layout animation
│  │  │  └─ complex constraint structure
│  │  │
│  │  ├─ Dart CPU hotspot?
│  │  │  ├─ JSON parsing
│  │  │  ├─ sorting/filtering
│  │  │  ├─ serialization
│  │  │  ├─ equality/state computation
│  │  │  └─ synchronous plugin-related work
│  │  │
│  │  └─ GC correlated?
│  │     ├─ large temporary allocations
│  │     └─ excessive retained data / memory pressure
│  │
│  └─ Raster time high
│     │
│     ├─ Images?
│     │  ├─ excessive decode size
│     │  ├─ many image uploads
│     │  └─ animated images
│     │
│     ├─ Effects?
│     │  ├─ blur
│     │  ├─ shadow
│     │  ├─ filters
│     │  ├─ opacity/offscreen layers
│     │  └─ clipping
│     │
│     ├─ Painting?
│     │  ├─ complex paths
│     │  ├─ vector illustration
│     │  └─ CustomPainter
│     │
│     ├─ Excess repaint?
│     │  ├─ missing useful repaint isolation
│     │  └─ huge animated region
│     │
│     └─ Platform view?
│        ├─ WebView
│        ├─ maps
│        ├─ camera
│        └─ native ads
│
├─ Is it an interaction freeze without raster jank?
│  ├─ CPU profiler
│  ├─ long synchronous event handler
│  ├─ parsing / transformation
│  └─ platform/native work
│
├─ Is it memory growth/stutter?
│  ├─ Memory view
│  ├─ allocation rate
│  ├─ GC correlation
│  ├─ image cache
│  ├─ retained listeners/timers/controllers
│  └─ application cache growth
│
├─ Is it slow startup?
│  ├─ time to first frame
│  ├─ synchronous main()
│  ├─ plugin initialization
│  ├─ eager DI graph
│  ├─ storage/database reads
│  ├─ first screen build/layout
│  └─ first-screen image/font work
│
└─ Is it web-specific?
   ├─ Chrome Performance
   ├─ code/assets download
   ├─ CanvasKit vs skwasm
   ├─ single-threaded vs multithreaded skwasm
   ├─ browser main-thread blocking
   ├─ JS interop
   ├─ image/network behavior
   └─ DOM/platform views
```

---

# DevTools Workflow

Flutter DevTools is the primary first-party diagnostic environment for native Flutter performance.

## Performance view

Use the Performance view to inspect:

- Flutter frames;
- UI duration;
- raster duration;
- timeline events;
- frame-specific analysis;
- custom timeline events;
- garbage collection correlation;
- rendering diagnostics.

The Flutter Frames chart shows paired UI and raster work.

### Recommended workflow

1. Run a representative profile build.
2. Navigate to the exact flow.
3. Allow unrelated startup noise to settle if startup is not under investigation.
4. Start recording.
5. Reproduce one deterministic interaction.
6. Stop recording.
7. Select slow frames.
8. Determine whether UI or raster is dominant.
9. Inspect the timeline around those frames.
10. Use CPU or Memory views only when evidence points there.

## Enhanced tracing

DevTools can track:

- widget builds;
- layouts;
- paints.

These options add instrumentation and can themselves affect timing.

Enable them diagnostically, not as permanent baseline measurement. Flutter documentation explicitly warns that enhanced tracing can negatively affect frame timing.

Use:

```text
baseline trace without extra instrumentation
        ↓
identify suspicious phase
        ↓
enable targeted tracing
        ↓
inspect contributor
        ↓
disable instrumentation
        ↓
measure final result
```

## CPU profiler

Use CPU profiling for:

- parsing;
- sorting;
- filtering;
- serialization;
- state transformations;
- expensive `build` helpers;
- custom algorithms;
- equality;
- synchronous callbacks.

Inspect:

- call tree;
- bottom-up view;
- method table;
- flame chart.

Do not use a raster trace to guess Dart CPU hotspots.

## Memory view

Use Memory view for:

- heap growth;
- allocation rate;
- GC events;
- retained objects;
- snapshots;
- instance tracing;
- native/external memory;
- image-related pressure.

Distinguish:

```text
high allocation rate
```

from:

```text
retained-object leak
```

Flutter DevTools explicitly notes that frequent GC events are not automatically a problem.

## Network view

Use Network view to inspect:

- duplicate requests;
- slow endpoints;
- oversized payloads;
- request waterfalls;
- repeated downloads.

Do not classify network latency as rendering jank unless UI processing or synchronization actually blocks frames.

## Performance Overlay

The built-in Performance Overlay provides a lightweight visual signal for UI and raster frame timing.

Enable it through:

```dart
MaterialApp(
  showPerformanceOverlay: true,
  home: const HomeScreen(),
)
```

The overlay exposes UI-thread and raster-thread frame-time graphs. A frame should ideally remain within the device's frame budget.

Use the overlay to answer:

```text
"Which side is obviously over budget while reproducing this interaction?"
```

Do not use it as a replacement for a timeline.

## Removed/stale tooling

Do not recommend DevTools Raster Stats. It was removed because it did not work with Impeller and could be misleading even with Skia.

---

# Frame Timing Instrumentation

Use `SchedulerBinding.addTimingsCallback` for application-level frame statistics when needed.

```dart
import 'dart:ui';

import 'package:flutter/scheduler.dart';

final class FrameTimingMonitor {
  FrameTimingMonitor({
    required this.targetRefreshRateHz,
    required this.onSlowFrame,
  });

  final double targetRefreshRateHz;
  final void Function(FrameTiming timing) onSlowFrame;

  bool _started = false;

  Duration get frameBudget => Duration(
        microseconds:
            (Duration.microsecondsPerSecond / targetRefreshRateHz).round(),
      );

  void start() {
    if (_started) {
      return;
    }
    _started = true;
    SchedulerBinding.instance.addTimingsCallback(_handleTimings);
  }

  void stop() {
    if (!_started) {
      return;
    }
    SchedulerBinding.instance.removeTimingsCallback(_handleTimings);
    _started = false;
  }

  void _handleTimings(List<FrameTiming> timings) {
    final budget = frameBudget;

    for (final timing in timings) {
      if (timing.buildDuration > budget ||
          timing.rasterDuration > budget ||
          timing.totalSpan > budget) {
        onSlowFrame(timing);
      }
    }
  }
}
```

Do not assume callbacks arrive individually in real time; Flutter may batch frame timings. Official `FrameTiming` guidance documents batching behavior and recommends the scheduler timing callback API for multiple listeners.

For long-running metrics, prefer distributions:

- median;
- p90;
- p95;
- p99;
- worst frame;
- percentage above target budget;

rather than only an average.

---

# UI-Isolate Performance

Keep the main isolate responsive.

Potentially expensive synchronous work includes:

- large JSON decoding;
- large collection sorting;
- filtering tens of thousands of records;
- regex over large text;
- data normalization;
- encryption/compression;
- image manipulation;
- large serialization;
- high-frequency state comparison;
- large string transformations.

### Rule

If a user interaction invokes synchronous work that is a meaningful fraction of the frame interval, profile it.

For 120 Hz, an apparently "small" 8 ms synchronous task can consume nearly an entire frame budget.

### Event handlers

Bad interaction architecture:

```text
tap
 ↓
parse huge payload synchronously
 ↓
sort 50k rows
 ↓
emit state
 ↓
render
```

Prefer:

```text
tap
 ↓
show immediate state if appropriate
 ↓
perform measured CPU work asynchronously/off-isolate
 ↓
discard stale result if needed
 ↓
publish result
```

Do not offload without measuring transfer/spawn overhead.

---
