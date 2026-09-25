# Contents

- [Flutter Web](#flutter-web)
  - [Renderer modes](#renderer-modes)
    - [Default build](#default-build)
    - [WebAssembly build](#webassembly-build)
  - [Multithreaded skwasm](#multithreaded-skwasm)
  - [Web profiling](#web-profiling)
  - [Browser main thread](#browser-main-thread)
  - [Web images](#web-images)
  - [Web startup](#web-startup)
  - [Deferred loading](#deferred-loading)
  - [Web platform views](#web-platform-views)
- [Desktop](#desktop)
- [Battery / Thermal Efficiency](#battery-thermal-efficiency)
- [Timers and Polling](#timers-and-polling)
- [App Lifecycle](#app-lifecycle)
- [Streams](#streams)
- [Input Performance](#input-performance)
  - [Search](#search)
- [Logging](#logging)
- [Analytics](#analytics)
- [Rebuild Diagnostics](#rebuild-diagnostics)
- [Paint Diagnostics](#paint-diagnostics)
- [Timeline Instrumentation](#timeline-instrumentation)
- [Performance Testing](#performance-testing)
  - [Microbenchmark](#microbenchmark)
  - [Macrobenchmark](#macrobenchmark)
  - [Integration testing](#integration-testing)
  - [Golden tests](#golden-tests)
- [Performance Regression Strategy](#performance-regression-strategy)
- [CI Performance](#ci-performance)
- [Jank Debugging Workflow](#jank-debugging-workflow)
  - [Scrolling jank](#scrolling-jank)
  - [Animation jank](#animation-jank)
  - [First-screen jank](#first-screen-jank)
  - [Interaction freeze](#interaction-freeze)
  - [Memory-related stutter](#memory-related-stutter)

---

# Flutter Web

Treat Flutter web as its own performance platform.

Do not blindly transfer mobile conclusions.

Current Flutter web has:

- CanvasKit;
- skwasm;
- default and WebAssembly build modes.

The old HTML renderer is not part of the current official renderer set.

## Renderer modes

### Default build

```bash
flutter build web
```

uses CanvasKit.

### WebAssembly build

```bash
flutter build web --wasm
```

allows `skwasm`, with runtime fallback to CanvasKit where required by browser support.

Current official guidance states that skwasm can provide better startup and frame performance, particularly when it can use multithreaded rendering.

Do not switch to Wasm without checking:

- package compatibility;
- target browsers;
- server headers;
- application behavior;
- before/after startup and frame metrics.

## Multithreaded skwasm

skwasm can render using a separate worker thread when browser/server security requirements allow `SharedArrayBuffer`.

If those requirements are not met, skwasm can operate single-threaded.

Benchmark both real deployment configuration and local development.

## Web profiling

Use:

1. a profile web build;
2. Chrome DevTools Performance panel;
3. optional Flutter tracing flags only when necessary.

Current Flutter documentation exposes diagnostic tracing for:

- widget builds;
- user widget builds;
- layouts;
- paints.

Those events can increase trace overhead.

## Browser main thread

Investigate:

- large Dart CPU work;
- JavaScript interoperability;
- browser layout/DOM work;
- platform views;
- event handlers;
- image decoding;
- garbage collection;
- networking callbacks.

Do not assume `compute` creates a worker. On Flutter web it runs on the main thread.

For true CPU parallelism, use an explicit Web Worker architecture.

## Web images

Remember:

- browser CORS applies;
- Flutter's `Image.network.cacheWidth/cacheHeight` decode hints are ignored on web.

Optimize:

- source image dimensions;
- responsive image delivery/backend transformations;
- compression;
- browser caching;
- CDN behavior.

## Web startup

Measure:

```text
HTML/bootstrap
↓
Flutter loader
↓
renderer/code download
↓
engine initialization
↓
app run
↓
first Flutter content
```

Potential targets:

- application code size;
- renderer download;
- asset size;
- HTTP compression;
- cache headers;
- CDN latency;
- unnecessary first-load assets;
- initialization code.

Current Flutter no longer generates a service worker by default. Do not base a caching design on older Flutter PWA behavior without inspecting the project. Custom web initialization still exposes hooks for deliberate service-worker setups.

## Deferred loading

Use deferred-loading/code-splitting strategies only after bundle/startup analysis demonstrates value.

Tradeoffs include:

- extra request boundaries;
- delayed feature availability;
- deployment complexity.

## Web platform views

DOM/HTML-backed integrations can interact with browser layout and compositing.

Profile:

- scrolling;
- transforms;
- overlays;
- resizing.

Do not infer performance from a pure CanvasKit/skwasm screen.

---

# Desktop

Desktop performance differs because:

- windows can resize continuously;
- high-DPI screens can dramatically increase raster surface area;
- users can run very large windows;
- native integrations vary;
- CPU/GPU hardware is heterogeneous.

Test:

- live resize;
- maximized/high-resolution windows;
- multi-monitor DPI transitions where relevant;
- large tables/grids;
- native platform integrations.

A view that renders smoothly at mobile resolution might be much more raster-intensive at 4K.

Do not assume desktop hardware makes optimization irrelevant.

---

# Battery / Thermal Efficiency

Performance includes sustained efficiency.

Watch for:

- continuous animations;
- high-frequency timers;
- polling;
- unnecessary background work;
- persistent worker isolates;
- excessive CPU;
- repeated location/sensor processing;
- high GPU workloads.

A feature that maintains 120 FPS while continuously consuming unnecessary CPU/GPU can still be poorly engineered.

Thermal throttling can later become a performance problem.

Optimize sustained workloads by reducing unnecessary work, not by artificially lowering quality without evidence.

---

# Timers and Polling

Avoid aggressive polling such as:

```text
every 100 ms → request state
```

when event-driven updates are available.

Prefer:

- streams/events;
- server push;
- lifecycle-aware refresh;
- sensible intervals;
- exponential retry/backoff where applicable.

Cancel timers when the feature no longer needs them.

---

# App Lifecycle

Reduce or pause nonessential work when the application is:

- backgrounded;
- hidden;
- detached;
- no longer displaying the relevant feature.

Candidates include:

- animation;
- polling;
- sensor processing;
- expensive periodic transformations.

Do not stop correctness-critical background work solely for a benchmark.

Use OS-supported background execution mechanisms for tasks that must continue.

---

# Streams

High-frequency streams can create:

```text
event
↓
state change
↓
build
↓
layout/paint
```

hundreds of times per second.

When semantics allow, consider:

- deduplication;
- throttling;
- debouncing;
- batching;
- sampling.

Do not alter event semantics just to lower frame counts.

Measure the source frequency and resulting UI cost.

---

# Input Performance

Typing and gestures are sensitive to even modest synchronous work.

Do not perform:

- huge list filtering;
- database scans;
- large validation;
- blocking plugin calls;

synchronously for every keystroke.

## Search

Use:

```text
input
↓
short debounce where product permits
↓
cancel/ignore stale work
↓
search/compute
↓
publish latest result only
```

Example:

```dart
import 'dart:async';

final class SearchDebouncer {
  SearchDebouncer({
    required this.delay,
  });

  final Duration delay;

  Timer? _timer;
  int _generation = 0;

  void schedule(
    String query,
    Future<void> Function(String query, int generation) action,
  ) {
    _timer?.cancel();
    final generation = ++_generation;

    _timer = Timer(delay, () {
      unawaited(action(query, generation));
    });
  }

  bool isLatest(int generation) => generation == _generation;

  void dispose() {
    _timer?.cancel();
  }
}
```

Debouncing is appropriate only when delayed feedback matches product behavior.

For local search over a small list, immediate synchronous filtering may be better.

---

# Logging

Logging can distort development/profile measurements and create real production CPU/I/O overhead.

Avoid:

- dumping huge JSON payloads;
- stringifying enormous objects on every frame;
- per-frame logs;
- per-scroll-event verbose logs;
- expensive string construction even when a log level is disabled by the application.

Use structured, sampled, appropriately leveled telemetry.

Re-profile with logging configuration representative of production.

---

# Analytics

Keep heavy analytics work out of interaction-critical callbacks.

Prefer:

```text
interaction
↓
small event enqueue
↓
deferred/batched transport
```

when the analytics SDK supports it.

Profile third-party SDKs that perform synchronous event processing.

---

# Rebuild Diagnostics

Use targeted tooling to answer:

- Which widgets rebuilt?
- How often?
- During which slow frame?
- Was the rebuild expensive?

Do not leave rebuild tracing enabled during final baseline comparisons because instrumentation changes timing.

Use rebuild diagnostics to locate the contributor, then disable them and re-measure.

---

# Paint Diagnostics

Use paint/repaint diagnostics when evidence suggests:

- large areas repaint unnecessarily;
- an animation invalidates a static subtree;
- CustomPainter repaints too often.

A colorful repaint indicator is diagnostic—not a mandate to add boundaries everywhere.

---

# Timeline Instrumentation

When DevTools does not expose enough application-specific context, add sparse custom timeline events.

Example:

```dart
import 'dart:developer';

T traceSync<T>(
  String name,
  T Function() operation,
) {
  return Timeline.timeSync(
    name,
    operation,
  );
}
```

Use this around high-value stages such as:

```text
decode_catalog
apply_search_filter
hydrate_session
build_large_chart_model
```

Do not instrument every helper function.

Too much tracing adds noise and overhead.

---

# Performance Testing

Automate critical performance flows where practical.

## Microbenchmark

Use a microbenchmark to measure a focused operation such as:

- parser;
- formatter;
- sorting algorithm;
- geometry builder;
- state transformation.

A microbenchmark does **not** prove that the user-visible screen is smooth.

## Macrobenchmark

Use a real-user-flow benchmark for:

```text
launch
scroll
open details
animate
return
```

Macrobenchmarks are preferred for validating user-visible jank because they exercise:

- framework;
- rendering;
- platform;
- data;
- integration behavior.

## Integration testing

Current `integration_test` exposes `IntegrationTestWidgetsFlutterBinding.watchPerformance`, which records `FrameTiming` around an action and is intended for performance tests that previously used older `flutter_driver` timeline helpers.

Example:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  final binding =
      IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('feed scroll performance', (tester) async {
    await tester.pumpWidget(const TestFeedApp());

    await binding.watchPerformance(
      () async {
        await tester.fling(
          find.byType(Scrollable).first,
          const Offset(0, -1200),
          4000,
        );
        await tester.pumpAndSettle();
      },
      reportKey: 'feed_scroll',
    );
  });
}
```

Provide a real `TestFeedApp` from the application's integration-test harness rather than substituting fake zero-cost rows when the production workload is the subject.

## Golden tests

Golden tests verify visual output.

They do not prove runtime performance.

Do not use a golden test as a jank benchmark.

---

# Performance Regression Strategy

For critical user flows:

1. capture baseline metrics;
2. preserve the workload/data set;
3. record test hardware/environment;
4. measure distributions rather than one run;
5. store trend data where possible;
6. alert on meaningful regressions;
7. manually inspect suspicious changes.

Useful metrics:

- p50/p90/p99 build duration;
- p50/p90/p99 raster duration;
- percentage of frames above target budget;
- worst frame;
- startup-to-first-frame;
- startup-to-meaningful-content;
- peak memory;
- steady-state memory;
- CPU time for focused operations.

Do not write brittle assertions such as:

```text
operation must always take < 217 microseconds
```

on shared CI machines.

---

# CI Performance

Shared cloud runners can have:

- noisy neighbors;
- CPU frequency variation;
- virtualization overhead;
- inconsistent GPU;
- unstable thermal conditions.

Use ordinary CI for:

- functionality;
- compile-time guards;
- coarse performance smoke tests.

For hard frame-performance gates, prefer:

- controlled physical devices;
- stable device labs;
- repeat runs;
- normalized environment;
- historical trend comparison.

---

# Jank Debugging Workflow

## Scrolling jank

Check:

- UI vs raster time;
- lazy construction;
- row build cost;
- layout/intrinsics;
- `shrinkWrap`;
- item extent;
- image decode dimensions;
- image arrival;
- paint effects;
- CustomPainter;
- platform views;
- state emissions during scroll;
- keep-alive/cache strategy.

## Animation jank

Check:

- rebuilding static subtree;
- layout every frame;
- raster-heavy filters;
- large blur;
- clips;
- image sizes;
- CustomPainter;
- platform views;
- renderer/backend;
- offscreen animations.

## First-screen jank

Check:

- synchronous `main`;
- plugin initialization;
- DI graph;
- storage reads;
- large first build;
- first layout;
- image decode;
- complex vectors;
- initial network-response parsing.

## Interaction freeze

Check:

- CPU profiler;
- event handler;
- JSON decode;
- sorting/filtering;
- serialization;
- native/plugin callback;
- expensive equality;
- high-frequency stream processing.

## Memory-related stutter

Check:

- Memory view;
- allocation rate;
- image memory;
- GC correlation;
- large temporary lists/maps/strings;
- large caches;
- retained pages;
- leaks.

---
