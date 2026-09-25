# Profiling playbook

Read for optimization, performance reviews, first-use stutter, and regression diagnosis. This is a proposed experiment protocol. Do not present its hypotheses as measured application defects.

## Baseline record

Record the actual environment before comparing runs:

```text
Scenario and interaction sequence:
SDK / framework revision / Dart:
Native profile build or web build configuration:
Device / OS / browser / renderer:
Observed refresh rate and display settings:
Content size, decoded image dimensions, network/cache state:
Cold first use or repeated warm interaction:
Accessibility, text scale, locale, window size:
Trace artifact and collection method:
```

Separate first-use work from repeated interaction. Keep data, gesture sequence, device, renderer, and measurement configuration comparable. Do not compare debug simulator timings with physical-device profile timings and attribute the difference to a code change.

Use `flutter run --profile -d DEVICE_ID` on supported native devices. For web, use the actual browser/build and browser performance tools; record JS/Wasm, renderer selection, and relevant deployment settings. Native AOT/JIT assumptions do not transfer directly to web. Sources: [Flutter profiling](https://docs.flutter.dev/perf/ui-performance), [build modes](https://docs.flutter.dev/testing/build-modes), [web Wasm](https://docs.flutter.dev/platform-integration/web/wasm).

## Stage classification

The frame interval is approximately `1000 / actualHz` milliseconds. At 120 Hz, 13 ms raster work exceeds an approximately 8.33 ms interval even when UI work is only 3 ms. This identifies a stage worth investigating; it does not prove which effect caused the work.

| Evidence | Initial investigation | Avoid concluding |
|---|---|---|
| UI stage repeatedly exceeds interval | Dart callbacks, builds, layout, intrinsics, allocation/GC correlation | That any named widget is slow without tracing its work. |
| Raster stage repeatedly exceeds interval | Effects, image uploads, layer composition, paint complexity, platform views | That changing an easing curve reduces rendering cost. |
| Both stages appear within budget but motion feels delayed | Queueing, input handling, scheduling, gesture policy, actual presentation behavior | That average stage timings prove low input latency. |
| First interaction differs from later ones | Initialization, image decode/upload, caches, renderer-specific events | That the cause must be shader compilation. |
| Header visibly follows one frame late | Scroll-notification phase and layout ownership | That a repaint boundary can repair scheduling. |

UI and raster stages are pipelined. Do not add their durations to calculate displayed dropped frames. `FrameTiming` is useful for stage timings and spans; it does not directly measure touch-to-photon latency. Sources: [FrameTiming](https://api.flutter.dev/flutter/dart-ui/FrameTiming-class.html), [DevTools Performance](https://docs.flutter.dev/tools/devtools/performance), [ScrollNotification](https://api.flutter.dev/flutter/widgets/ScrollNotification-class.html).

## Controlled experiments

Change one mechanism at a time in a temporary diagnostic variant. Preserve the production design unless an approved fix follows from evidence.

| Hypothesis | Small isolating experiment | Follow-up if supported |
|---|---|---|
| Backdrop sampling dominates | Temporarily replace blur with a visually simple bounded surface | Reduce affected area, use child filtering where semantically equivalent, or tune the approved effect. |
| Destination image upload/decode stalls | Compare prepared appropriately sized imagery with cold full-resolution imagery | Reserve geometry, decode near display size, selectively prepare likely content. |
| Stable child repaints with moving parent | Inspect repaint behavior, then test a boundary at that separation | Keep the boundary only if timing/memory improves. |
| Broad rebuild scope consumes UI time | Track builds; move interpolation to a local transition with invariant child | Reuse existing ownership and selectors; avoid an architecture rewrite. |
| Intrinsic/layout work dominates | Trace layouts; compare bounded constraints or sliver geometry | Preserve required reflow and text-scale behavior. |
| GC accompanies spikes | Correlate allocation stacks, GC and frame times | Remove measured hot-path copying or retained references; avoid speculative pooling. |
| Route overlap multiplies active content | Inspect both route trees and outgoing switcher entries | Avoid duplicate heavy work while preserving route state and visual continuity. |

`RepaintBoundary` affects paint recording and layering, not build/layout ownership. Caching is an engine opportunity, not a promise. `BackdropFilter` scope follows clipping; overlapping filters must not share a grouping key that changes output. Sources: [RepaintBoundary](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html), [BackdropFilter](https://api.flutter.dev/flutter/widgets/BackdropFilter-class.html), [performance practices](https://docs.flutter.dev/perf/best-practices).

## Renderer and shader gate

Verify the actual backend before selecting diagnostics. Research on 2026-08-27 found official guidance identifying Impeller-only iOS, default Impeller on supported Android, desktop defaults from Flutter 3.47, and Skia on web. These are version/platform facts, not permanent assumptions. Recheck for an older SDK or a later release.

Do not prescribe legacy SkSL warm-up for Impeller. Impeller's engine shader strategy does not make complex effects, custom shader execution, image uploads, or geometry free. Only file a renderer-specific issue after obtaining a minimal reproduction with SDK/backend/device details and a trace. Sources: [Impeller](https://docs.flutter.dev/perf/impeller), [rendering performance](https://docs.flutter.dev/perf/rendering-performance).

## CPU and memory gate

Use CPU samples to identify synchronous work before moving it. `async` does not change execution threads. Native `compute` can offload suitable CPU work; web `compute` remains on the main thread. Renderer worker support is a different mechanism. Account for isolate startup and message transfer; never spawn an isolate per animation tick.

Inspect Dart heap, external images/textures, retained controllers, listener closures, and caches separately. Repeated mount/animate/unmount is useful for finding retention; a rising cache that later stabilizes is not automatically a leak. Sources: [Flutter isolates](https://docs.flutter.dev/perf/isolates), [Dart concurrency](https://dart.dev/language/concurrency), [DevTools Memory](https://docs.flutter.dev/tools/devtools/memory).

## Measurement and report

Use enough repeated representative interactions to observe variation; record sample counts rather than hiding them. Report UI/raster p50/p95/p99 and worst frames when sample size supports those summaries. Keep over-budget stage counts distinct from displayed-drop counts. Export raw traces, not only screenshots of averages.

Enhanced build/layout/paint tracing changes overhead. Use it to locate the cause; repeat the final comparison without intrusive diagnostics. Use platform GPU tools only when available and appropriate. Battery and thermal claims require their own sustained device measurements.

```text
Finding classification: confirmed defect / measured bottleneck / risk / refinement
Evidence and scope:
Mechanism changed:
Before and after, same scenario:
Behavior/accessibility checks:
What the measurements do not establish:
Remaining devices/platforms:
```

Do not write “optimized” when only static inspection or widget tests were performed. Write the precise result, such as “localized rebuild scope; behavior tests pass; device performance unmeasured.”
