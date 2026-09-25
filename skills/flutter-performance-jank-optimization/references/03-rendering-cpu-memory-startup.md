# Contents

- [Animations](#animations)
  - [Choose implicit vs explicit animations for architecture first](#choose-implicit-vs-explicit-animations-for-architecture-first)
  - [Stable child with `AnimatedBuilder`](#stable-child-with-animatedbuilder)
  - [Layout animation vs paint transform](#layout-animation-vs-paint-transform)
  - [AnimationController lifecycle](#animationcontroller-lifecycle)
  - [Reduced motion](#reduced-motion)
- [CustomPainter](#custompainter)
  - [`shouldRepaint`](#shouldrepaint)
  - [`repaint` Listenable](#repaint-listenable)
  - [Cache geometry where justified](#cache-geometry-where-justified)
- [Impeller / Rendering Backend](#impeller-rendering-backend)
  - [Do not cargo-cult shader warmup](#do-not-cargo-cult-shader-warmup)
  - [Impeller does not eliminate raster jank](#impeller-does-not-eliminate-raster-jank)
- [Raster Performance](#raster-performance)
- [CPU-Bound Work](#cpu-bound-work)
- [Isolates](#isolates)
  - [Cost model](#cost-model)
  - [`Isolate.run`](#isolaterun)
  - [`compute`](#compute)
  - [Long-lived worker](#long-lived-worker)
  - [Plugins from background isolates](#plugins-from-background-isolates)
- [Async I/O](#async-io)
- [Platform Channels](#platform-channels)
- [Memory & GC](#memory-gc)
  - [GC is not automatically a problem](#gc-is-not-automatically-a-problem)
  - [Allocation churn](#allocation-churn)
  - [Ordinary small allocations](#ordinary-small-allocations)
- [Memory Leaks](#memory-leaks)
- [Strings](#strings)
- [Collections](#collections)
- [Equality](#equality)
- [Startup Performance](#startup-performance)
  - [Avoid unnecessary work before `runApp`](#avoid-unnecessary-work-before-runapp)
  - [`deferFirstFrame`](#deferfirstframe)
  - [First-frame instrumentation](#first-frame-instrumentation)
- [Dependency Initialization](#dependency-initialization)
- [Plugin Initialization](#plugin-initialization)
- [Fonts and Text Rendering](#fonts-and-text-rendering)
- [App Size vs Runtime Performance](#app-size-vs-runtime-performance)
- [Network Performance](#network-performance)
- [Loading States](#loading-states)
- [Platform Views](#platform-views)
  - [Android Platform Views](#android-platform-views)
    - [HCPP](#hcpp)
    - [Animation mitigation](#animation-mitigation)
  - [iOS Platform Views](#ios-platform-views)
  - [macOS Platform Views](#macos-platform-views)

---

# Animations

Animation optimization is about the work performed **per frame**.

## Choose implicit vs explicit animations for architecture first

Implicit animations are not inherently slow.

Explicit `AnimationController` usage is not inherently fast.

Choose based on:

- control;
- coordination;
- lifecycle;
- readability.

Then profile the resulting work.

## Stable child with `AnimatedBuilder`

If an animation changes only a transform but the child is static, pass the child through `AnimatedBuilder.child`.

```dart
class RotatingLogo extends StatelessWidget {
  const RotatingLogo({
    required this.animation,
    super.key,
  });

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      child: const FlutterLogo(size: 120),
      builder: (context, child) {
        return Transform.rotate(
          angle: animation.value,
          child: child,
        );
      },
    );
  }
}
```

This avoids rebuilding the stable child on every tick. Flutter's `AnimatedBuilder` documentation explicitly recommends this pattern.

## Layout animation vs paint transform

Changing layout properties every frame can force layout of affected subtrees.

When visual requirements permit, prefer paint-time transforms for movement/scaling rather than repeatedly changing layout geometry.

Example concept:

```text
animate position by re-layout
```

may cost more than:

```text
stable layout
+
Transform.translate
```

But validate:

- layout footprint;
- clipping;
- semantics;
- hit testing;
- accessibility;
- expected neighboring layout.

Do not substitute transforms if surrounding content must physically reflow.

## AnimationController lifecycle

Always dispose owned controllers.

```dart
class PulseState extends State<Pulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _controller,
      child: const Icon(Icons.circle),
    );
  }
}

class Pulse extends StatefulWidget {
  const Pulse({super.key});

  @override
  State<Pulse> createState() => PulseState();
}
```

Pause/remove continuous animation when it is no longer visible if doing so preserves intended behavior.

## Reduced motion

Respect accessibility preferences.

Performance work must not bypass system/application reduced-motion behavior merely to keep an animation architecture simple.

---

# CustomPainter

Use `CustomPainter` when custom drawing is the right UI abstraction.

Do not replace widgets with canvas code solely on the assumption that custom painting is faster.

## `shouldRepaint`

Return `true` only when the new painter contains information that changes the output.

Bad:

```dart
@override
bool shouldRepaint(covariant ChartPainter oldDelegate) => true;
```

when the chart data is unchanged.

Better:

```dart
final class ChartPainter extends CustomPainter {
  const ChartPainter({
    required this.points,
  });

  final List<Offset> points;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) {
      return;
    }

    final paint = Paint()
      ..color = const Color(0xFF1565C0)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final path = Path()..moveTo(points.first.dx, points.first.dy);

    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant ChartPainter oldDelegate) {
    return !listEquals(points, oldDelegate.points);
  }
}
```

For very large point sets, even `listEquals` can become expensive. Measure and use an appropriate immutable/versioned data model if needed.

## `repaint` Listenable

For animation-driven painting, a `Listenable` passed to the `CustomPainter` constructor can trigger repaint without requiring build/layout for every tick.

```dart
final class ProgressPainter extends CustomPainter {
  ProgressPainter({
    required Animation<double> progress,
  })  : _progress = progress,
        super(repaint: progress);

  final Animation<double> _progress;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00A86B)
      ..style = PaintingStyle.fill;

    canvas.drawRect(
      Rect.fromLTWH(
        0,
        0,
        size.width * _progress.value,
        size.height,
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant ProgressPainter oldDelegate) {
    return oldDelegate._progress != _progress;
  }
}
```

Flutter's `CustomPainter` API explicitly supports this repaint-listenable path to avoid build/layout work on each repaint.

## Cache geometry where justified

If computing a complex `Path`, text layout, or geometry dominates the frame and inputs remain stable, cache that representation.

Do not cache geometry that changes every frame or consumes more memory than it saves.

---

# Impeller / Rendering Backend

Impeller changes some old performance assumptions.

Current Flutter documentation states:

- Impeller precompiles its smaller shader set at engine-build time rather than compiling those shaders during application runtime.
- Impeller is the only supported rendering engine on iOS.
- Impeller is enabled by default on Android API 29+ when supported.
- Android can fall back to the legacy OpenGL renderer on lower API levels or unsupported devices.
- Flutter web currently uses Skia.
- macOS Impeller remains version-sensitive and currently opt-in in the official guidance.

## Do not cargo-cult shader warmup

Old Flutter performance advice often recommended capturing and prewarming SkSL shaders to mitigate first-run shader compilation jank.

Do **not** apply this as a universal current recommendation.

For normal current iOS/modern Android Impeller applications:

1. profile the actual frame;
2. verify renderer/backend;
3. identify raster contributor;
4. optimize the measured issue.

Flutter's current rendering-performance guidance specifically points first-run mobile animation jank toward using the default Impeller renderer rather than old universal shader-warmup procedures.

If the target is:

- a legacy Android renderer;
- web/Skia;
- an explicitly non-default backend;

then renderer-specific behavior may differ.

Re-check current documentation before applying backend-specific warmup techniques.

## Impeller does not eliminate raster jank

You can still be raster-bound because of:

- expensive blur;
- huge images;
- complex paths;
- excessive filters;
- platform views;
- high layer/compositing cost;
- GPU limitations.

---

# Raster Performance

Suspect raster-bound rendering when:

```text
UI frame duration is healthy
but
raster duration exceeds the frame interval
```

Investigate:

1. oversized images;
2. image scaling/upload;
3. complex paths;
4. filters;
5. blur;
6. shadows;
7. clips;
8. opacity/offscreen rendering;
9. CustomPainter;
10. platform views;
11. very large surfaces;
12. renderer/backend/device-specific issues.

Do **not** spend time reducing `build()` calls until the evidence shows UI work is relevant.

---

# CPU-Bound Work

Move CPU-heavy work away from the main isolate only when the cost justifies it.

Good candidates can include:

- large JSON parsing;
- large compression/decompression;
- cryptographic operations;
- image processing;
- huge sorting/transformation jobs;
- CPU-heavy file processing.

Bad candidates:

- formatting one date;
- sorting ten rows;
- mapping a short list;
- one small JSON response;
- trivial string formatting.

---

# Isolates

Dart isolates:

- have independent memory;
- communicate with messages;
- do not share mutable state.

Flutter's official isolate guidance recommends:

- `Isolate.run` for convenient one-off heavy work;
- long-lived isolates/workers when repeated work makes spawn overhead significant.

## Cost model

Treat offloading as:

```text
spawn / dispatch
+
message transfer
+
queueing
+
computation
+
result transfer
```

A worker is useful only when:

```text
main-isolate responsiveness gained
>
coordination/transfer overhead introduced
```

## `Isolate.run`

Example for a large JSON payload:

```dart
import 'dart:convert';
import 'dart:isolate';

final class Product {
  const Product({
    required this.id,
    required this.name,
  });

  factory Product.fromJson(Map<String, Object?> json) {
    return Product(
      id: json['id']! as int,
      name: json['name']! as String,
    );
  }

  final int id;
  final String name;
}

Future<List<Product>> parseProducts(String jsonSource) {
  return Isolate.run(() {
    final decoded = jsonDecode(jsonSource) as List<Object?>;

    return decoded
        .cast<Map<String, Object?>>()
        .map(Product.fromJson)
        .toList(growable: false);
  });
}
```

Benchmark the real payload.

Do not use this for a 2 KB JSON response by default.

## `compute`

Flutter's `compute` helper remains useful when an API needs to compile for native and web.

However, current official Flutter guidance states:

- mobile/desktop `compute` behaves equivalently to one-off isolate execution;
- on web, `compute` runs on the main thread because Dart web does not support isolates.

Therefore:

```text
compute on Flutter web
≠
background browser worker
```

For genuine off-main-thread web CPU processing, design around browser Web Workers and their transfer/serialization costs.

## Long-lived worker

Consider a reusable worker when:

- the same heavy computation repeats frequently;
- one-off isolate spawn overhead appears in measurement;
- requests can be queued safely.

Do not create a pool sized to every CPU core without benchmarking.

Too many workers can cause:

- CPU contention;
- memory growth;
- thermal load;
- queue complexity.

## Plugins from background isolates

Current Flutter supports platform-plugin calls from registered background isolates through `BackgroundIsolateBinaryMessenger`.

Limitations remain. Official Flutter guidance notes that background isolates can send platform requests and receive direct responses but cannot receive arbitrary unsolicited host-platform messages such as a long-lived push listener. They also cannot perform Flutter UI work.

Do not move plugin code to an isolate unless:

- the plugin supports the workflow;
- the operation is actually expensive;
- the move improves measured responsiveness.

---

# Async I/O

Do not confuse asynchronous waiting with CPU work.

This:

```dart
final response = await httpClient.get(...);
```

does not inherently need an isolate just because it takes 500 ms.

The application is mostly waiting on:

- network;
- disk;
- database;
- OS.

Use ordinary asynchronous APIs.

Offload only CPU processing that occurs around the result.

Example:

```text
network wait: 800 ms
JSON decode on UI isolate: 40 ms
```

The optimization target for jank is the 40 ms decode, not the 800 ms network wait.

---

# Platform Channels

Flutter platform-channel messages are asynchronous from Dart's perspective, but native-side handlers can still contend with important platform threads.

Current platform-channel documentation supports background task queues/native handlers and registered background isolates for appropriate plugin workloads.

When profiling shows channel/native integration cost:

- reduce unnecessarily chatty high-frequency calls;
- batch data when semantics allow;
- avoid huge repeated codec payloads;
- move heavy native processing off the platform main thread if the plugin architecture permits;
- inspect the native implementation;
- consider a background isolate only if Dart-side/platform marshaling is materially blocking.

Do not assume every `Future`-returning plugin call is automatically cheap.

---

# Memory & GC

Memory optimization starts with understanding **why memory exists**.

Classify memory as:

- live application state;
- image cache;
- application cache;
- Dart heap;
- native/plugin memory;
- raster resources;
- temporary allocation churn;
- leaked/accidentally retained objects.

## GC is not automatically a problem

Garbage collection is expected.

Flutter DevTools explicitly notes that frequent GC can occur harmlessly during idle/background allocation patterns.

Investigate GC when it correlates with:

- frame stalls;
- high allocation rates;
- heap growth;
- memory pressure;
- repeated large temporary objects.

## Allocation churn

Potential problems:

- repeatedly decoding the same payload;
- repeatedly cloning huge lists;
- large temporary maps;
- huge intermediate strings;
- repeated binary-buffer copies;
- transient image data.

Use allocation profiling before rewriting normal Dart code.

## Ordinary small allocations

Do not fear normal short-lived objects.

Do not introduce object pooling for ordinary:

- model objects;
- small collections;
- widget-related values;

without evidence.

Modern garbage collectors are designed to handle common short-lived allocations efficiently.

Object pooling increases:

- ownership complexity;
- stale-state bugs;
- lifecycle complexity.

---

# Memory Leaks

Distinguish:

```text
high allocation rate
≠
memory leak
```

and:

```text
large cache
≠
memory leak
```

A leak means objects that should become unreachable remain retained.

Common leak sources include:

- listeners not removed;
- stream subscriptions not canceled;
- timers that keep owners alive;
- controllers not disposed;
- native resources not released;
- global caches with no eviction;
- long-lived closures retaining large object graphs;
- application services retaining view-related objects indefinitely.

Use DevTools:

- heap snapshots;
- diff snapshots;
- instance tracing;
- retained-object investigation.

Verify memory after:

```text
enter feature
→ use feature
→ leave feature
→ trigger/observe GC
→ compare retained objects
```

Do not classify normal route caching as a leak without understanding expected lifecycle.

---

# Strings

Use straightforward interpolation for ordinary UI text.

For genuinely large repeated concatenation in a hot loop, prefer `StringBuffer`.

```dart
String buildLargeCsvLine(List<String> values) {
  final buffer = StringBuffer();

  for (var index = 0; index < values.length; index++) {
    if (index > 0) {
      buffer.write(',');
    }
    buffer.write(values[index]);
  }

  return buffer.toString();
}
```

Do not replace:

```dart
'$first $last'
```

with a `StringBuffer`.

Profile large string transformations.

---

# Collections

Potential hot-path costs include:

- cloning very large lists;
- spread operations over large data;
- repeated filtering;
- repeated sorting;
- repeated map construction;
- converting between list/set/map forms;
- immutable-state copies at very high frequency.

Do not abandon immutability merely to remove copies.

Instead:

1. measure;
2. reduce update frequency;
3. partition state;
4. avoid rebuilding unchanged derived collections;
5. use appropriate data structures.

---

# Equality

Deep equality can become a CPU hotspot when:

- state updates are frequent;
- collections are large;
- equality traverses thousands of elements;
- selectors perform expensive comparison.

Use CPU profiling.

Potential solutions include:

- state partitioning;
- stable immutable references for unchanged data;
- version identifiers;
- narrower selected values.

Do not remove equality correctness and allow stale UI merely for speed.

---

# Startup Performance

Define the startup metric before optimizing.

Potential stages:

```text
OS process launch
      ↓
Flutter engine startup
      ↓
Dart entrypoint
      ↓
plugin / service initialization
      ↓
runApp
      ↓
first build/layout
      ↓
first rasterized frame
      ↓
first meaningful content
      ↓
first interactive state
```

A lower time-to-first-frame is not useful if the first frame is a broken screen.

Measure:

- cold start;
- warm start if relevant;
- first frame;
- meaningful content;
- interaction readiness.

## Avoid unnecessary work before `runApp`

Problematic:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await initializeAnalytics();
  await initializeSearchDatabase();
  await initializeRareFeatureSdk();
  await initializeSecondaryCaches();

  runApp(const App());
}
```

when none of those are required for the first screen.

Prefer staged startup:

```dart
import 'dart:async';

import 'package:flutter/material.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final requiredConfig = await loadRequiredStartupConfig();

  runApp(
    App(
      config: requiredConfig,
    ),
  );

  unawaited(initializeNonCriticalServices());
}

Future<AppConfig> loadRequiredStartupConfig() async {
  return const AppConfig(apiBaseUrl: 'https://example.com');
}

Future<void> initializeNonCriticalServices() async {
  await Future.wait<void>(<Future<void>>[
    initializeAnalytics(),
    initializeRareFeatureSdk(),
  ]);
}

Future<void> initializeAnalytics() async {}

Future<void> initializeRareFeatureSdk() async {}

final class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
  });

  final String apiBaseUrl;
}

final class App extends StatelessWidget {
  const App({
    required this.config,
    super.key,
  });

  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Center(
          child: Text('API: ${config.apiBaseUrl}'),
        ),
      ),
    );
  }
}
```

This is an architectural pattern, not a rule to defer everything.

Anything required for:

- security;
- routing correctness;
- mandatory consent;
- critical configuration;
- first-screen correctness;

may legitimately need to finish first.

## `deferFirstFrame`

Flutter provides `WidgetsBinding.deferFirstFrame` / `allowFirstFrame` when the framework must intentionally delay presenting its first frame.

Use this for correctness-sensitive splash/startup coordination, not as a way to "improve" time-to-first-frame.

Delaying the first frame is literally delaying first presentation.

## First-frame instrumentation

`WidgetsBinding.instance.firstFrameRasterized` and first-frame waiting APIs can be used when application instrumentation needs to know when the first frame has actually rasterized.

---

# Dependency Initialization

Review dependency injection containers for:

- eager singleton construction;
- synchronous constructors doing I/O/CPU work;
- asynchronous registrations awaited before UI;
- huge dependency graphs.

Prefer lazy construction for services that are:

- feature-specific;
- rarely used;
- not required before first content.

Do not lazy-load something the first screen immediately needs if that merely moves the stall into the first interaction.

---

# Plugin Initialization

Do not initialize every plugin at startup by default.

For each plugin ask:

1. Is it required before first frame?
2. Is it required before first interaction?
3. Is initialization synchronous or asynchronous?
4. Does initialization execute native main-thread work?
5. Can it be triggered on first feature use?
6. What happens if deferred initialization fails?

Profile before and after.

---

# Fonts and Text Rendering

Ordinary text rendering is not generally a performance concern.

Investigate text when:

- huge paragraphs are laid out repeatedly;
- rich text contains very many spans;
- width changes every animation frame;
- text measurement appears as a layout hotspot;
- web font loading delays meaningful text.

Potential responses:

- avoid unnecessary repeated layout;
- stabilize constraints;
- reduce pathological span counts;
- bundle/serve required fonts appropriately;
- avoid loading unused font families/weights where startup/download size matters.

Do not sacrifice typography without measurement.

---

# App Size vs Runtime Performance

Do not assume:

```text
smaller APK/IPA
=
smoother frames
```

Binary size primarily affects:

- download;
- install;
- storage;
- sometimes startup/loading characteristics.

It is not a direct substitute for frame profiling.

On web, application and renderer download size can have a direct startup impact because code/assets must be fetched before execution.

Keep frame performance and binary/download-size optimization as separate workstreams unless evidence connects them.

---

# Network Performance

Separate:

```text
network latency
```

from:

```text
UI jank
```

A request taking two seconds does not necessarily block frames.

A 30 ms synchronous decode after the response can.

Optimize networking through:

- request deduplication;
- caching;
- connection reuse through appropriate clients;
- pagination;
- payload reduction;
- compression where appropriate;
- cancellation/ignoring stale work;
- avoiding serial waterfalls;
- backend improvements.

Use DevTools Network view for evidence.

Do not "fix scrolling jank" by changing HTTP caching unless network/image arrival is the measured cause.

---

# Loading States

Never block UI interaction merely because asynchronous I/O is pending unless product semantics require blocking.

Expose:

- loading;
- partial content;
- retry;
- stale-while-refresh;

as appropriate.

Avoid replacing asynchronous architecture with synchronous waits for implementation convenience.

---

# Platform Views

Platform views require special care because Flutter and native UI must be composed together.

Examples:

- Google Maps;
- native WebView;
- camera previews;
- native advertisements;
- vendor SDK views.

Profile them on actual target devices.

---

## Android Platform Views

Current Flutter Android platform views have multiple composition strategies, each with different tradeoffs.

Official documentation identifies:

- texture-layer/hybrid approaches;
- hybrid composition;
- newer experimental HCPP behavior.

Hybrid composition can require synchronization between Flutter rendering and the Android platform UI, which can affect frame throughput.

### HCPP

Flutter 3.44 introduces experimental Hybrid Composition++ (HCPP).

Current requirements include:

- Android API 34+;
- Vulkan/Impeller-capable device.

Flutter automatically falls back when requirements are not met.

Do not globally opt into experimental composition solely because it is newer.

Benchmark:

- target plugin;
- target devices;
- scrolling;
- transformations;
- overlays;
- animations.

### Animation mitigation

Flutter platform-view documentation suggests using a placeholder/screenshot texture during complex Flutter animations when rendering the live native view causes performance issues.

Use this only if:

- interaction with the native view can temporarily pause;
- visual correctness is preserved;
- profiling confirms benefit.

---

## iOS Platform Views

iOS platform views also have composition tradeoffs.

Official Flutter guidance notes that:

- platform views can affect performance;
- a placeholder texture can mitigate animation cost in complex cases;
- some Flutter effects have limitations around platform views, including `ShaderMask`, `ColorFiltered`, and constrained `BackdropFilter` support.

Do not assume a rendering workaround that helps Android behaves identically on iOS.

---

## macOS Platform Views

On macOS, Flutter may need synchronization between raster work and the platform thread when composing native views.

Slow/blocking platform-thread work can therefore degrade Flutter graphics.

Profile native view integrations separately from pure Flutter views.

---
