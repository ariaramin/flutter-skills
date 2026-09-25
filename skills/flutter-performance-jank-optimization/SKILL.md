---
name: flutter-performance-jank-optimization
description: Profile, diagnose, optimize, review, and validate production Flutter performance across Android, iOS, Web, macOS, Windows, and Linux. Use this skill whenever Flutter work mentions jank, dropped or missed frames, slow scrolling, animation stutter, input latency, expensive builds/layout/paint/raster work, image decode pressure, CPU-heavy Dart work, isolates, memory/GC, startup latency, platform channels/views, Web renderer performance, battery/thermal cost, performance refactoring, or “make this Flutter app faster”—even when the user proposes a specific optimization before measuring the real bottleneck.
compatibility: Requires repository inspection and representative performance measurements. Verify Flutter/Dart version, target platforms, renderer/backend, device refresh rate, and version-sensitive APIs before applying current-runtime-specific guidance.
---

# Flutter Performance & Jank Optimization

Optimize from evidence:

```text
symptom → representative measurement → classify bottleneck
→ smallest effective change → re-measure → keep/revise/revert
```

Preserve correctness, accessibility, visual quality, and maintainability.

## Reference routing

| Task | Reference |
|---|---|
| Measurement, frame model/budgets, build modes, devices, DevTools, frame timing, UI-isolate diagnosis | `references/01-fundamentals-profiling.md` |
| Build/state/layout/scroll/lists/slivers/pagination/images/vector/paint | `references/02-build-layout-scroll-images.md` |
| Animations, CustomPainter, Impeller/raster, isolates, channels, memory/GC, startup, plugins, platform views | `references/03-rendering-cpu-memory-startup.md` |
| Web, desktop, battery/thermal, lifecycle, streams/input, logging, tracing, tests, regression/CI | `references/04-web-desktop-efficiency-testing.md` |
| Anti-patterns, implementation/review/refactor workflows, production checklists, quick reference | `references/05-antipatterns-workflows-checklists.md` |

Read only the relevant reference for a focused task. For a broad audit, read them in order.

## Operating rules

- Measure before optimizing; do not accept intuition as proof.
- Profile frame behavior outside debug mode.
- Record SDK version, platform, device/browser, OS, refresh rate, renderer/backend, workload, and data size.
- Classify before fixing: build, layout, paint, raster/GPU, image, Dart CPU, memory/GC, platform channel/view, network/I/O, startup, or Web main thread.
- Optimize the largest measured contributor first.
- Rebuild frequency is not itself a performance bug.
- Keep synchronous work off interaction-critical paths when it consumes meaningful frame/input budget.
- Use lazy construction for large collections.
- Decode images near useful display size where supported.
- Bound caches and retained state intentionally.
- Test representative physical hardware, including the performance floor and relevant high-refresh devices.
- Re-measure every meaningful change.
- Revert optimization-only complexity if it does not materially improve the target metric.
- Never trade correctness, accessibility, hit testing, state semantics, or data freshness for a weak micro-optimization.
- Treat renderer/platform internals and APIs as version-sensitive.
- Separate runtime smoothness, startup, memory, binary size, network efficiency, and battery as distinct metrics.

## 1. Inspect the repository

Before editing, inspect:

```text
pubspec.yaml / pubspec.lock
Flutter/Dart constraints and actual SDK
target platforms and minimum versions
state management and DI/bootstrap
routing/page ownership
image/network stack
plugins/platform views
existing performance tests/profiles
```

Search for performance-sensitive constructs such as:

```text
ListView / GridView / CustomScrollView / Sliver
shrinkWrap / IntrinsicWidth / IntrinsicHeight
scrollCacheExtent / cacheExtent
RepaintBoundary / Opacity / filters / clips
CustomPainter / AnimationController / AnimatedBuilder
Image.network / cacheWidth / cacheHeight / precacheImage
Isolate.run / compute
Timer.periodic / Stream.listen
PlatformView / AndroidView / UiKitView / WebView
runApp / deferFirstFrame
```

Their presence is not proof of a problem.

## 2. Translate the complaint into a target

Examples:

```text
"scrolling lags" → frame stability during a defined fling
"typing is delayed" → input-to-visible-update latency
"startup is slow" → cold first-frame and/or meaningful-content time
"memory grows" → retained growth after repeatable enter/use/exit cycles
"battery drains" → sustained CPU/GPU/network wakeups
```

Define the metric before selecting the remedy.

## 3. Build a representative scenario

Keep constant where possible:

- device/browser and OS
- build mode
- renderer/backend
- refresh rate
- dataset
- navigation path
- network/cache state
- interaction

Avoid drawing production conclusions from debug mode, simulators/emulators alone, empty fake content, a single lucky run, or only flagship hardware.

## 4. Capture the baseline

For jank:
- UI duration
- raster duration
- slow-frame timeline
- `FrameTiming.totalSpan` when latency matters

For CPU:
- call tree/flame chart
- long synchronous interaction-path work

For memory:
- heap trend
- allocation rate
- GC correlation
- retained objects
- native/external/image memory when relevant

For startup:
- pre-`runApp` critical path
- first frame
- meaningful content
- interactive readiness when relevant

For network-related UX:
- waterfalls
- duplicate requests
- payload size
- response-processing cost

Open only the profiler needed by the evidence.

## 5. Classify the bottleneck

### UI/main isolate high

Inspect:
- parsing, sorting, filtering, serialization
- expensive build helpers
- broad state recomputation
- large collection copies/equality
- intrinsic layout
- large shrink-wrapped scrolling content
- layout-changing animations
- allocation spikes correlated with stalls

### Raster high

Inspect:
- oversized images
- image upload/decode
- blur/shadows/filters
- clips and offscreen layers
- complex paths/vectors
- `CustomPainter`
- large animated surfaces
- platform views
- renderer/device-specific behavior

### Both high

Fix the larger measured stage first unless one change clearly reduces both.

### Frames look smooth but input feels late

Inspect:
- main-isolate event-loop work
- `FrameTiming.totalSpan`
- synchronous handlers
- native/plugin calls
- high-frequency events/state changes

## 6. Use the correct frame budget

Approximate interval:

```text
1000 / refreshRateHz ms
```

Typical values:

```text
60 Hz 16.67 ms | 90 Hz 11.11 ms | 120 Hz 8.33 ms | 144 Hz 6.94 ms
```

Do not use 16 ms as a universal target. Do not simply add UI and raster duration; Flutter pipelines them.

## 7. Use DevTools deliberately

For native targets:

1. Run in profile mode.
2. Record only the relevant flow.
3. Select slow frames.
4. Classify UI vs raster.
5. Inspect timeline contributors.
6. Use CPU/Memory/Network views only when indicated.
7. Enable build/layout/paint tracing only for diagnosis.
8. Disable extra instrumentation for final baseline/comparison.

Use Performance Overlay as a quick indicator, not final evidence. Do not recommend removed Raster Stats tooling.

For Web, use a profile web build and browser performance tooling.

## 8. Fix main-isolate CPU only when it is the problem

Prefer:
- moving expensive derived computation out of `build`
- computing when source data changes
- narrowing state subscriptions only when broad updates are measurably expensive
- canceling/superseding obsolete work
- reducing large repeated copies/comparisons where semantics permit
- moving genuinely heavy CPU work off the main isolate

Do not put ordinary async I/O on an isolate merely because it takes time.

### Isolate gate

Use `Isolate.run` or a worker only when:

```text
responsiveness gained > spawn/dispatch + transfer + coordination cost
```

Good candidates: large parsing, compression, crypto, image processing, large transforms. Keep tiny work local.

On Web, do not assume `compute` provides background CPU parallelism; use an explicit Worker architecture when required.

## 9. Optimize rebuilds by cost, not count

Before adding selectors or state partitioning, ask:
- Is build time high?
- Is a large subtree involved?
- Does it trigger expensive layout/paint?
- Is heavy work done in build?
- Is the update frequency excessive?

Use local state, stable child subtrees, `AnimatedBuilder.child`, `BlocSelector`, `buildWhen`, Provider/Riverpod selection only where they remove meaningful work.

Use `const` as good Flutter code, not as a universal jank strategy.

## 10. Optimize layout

When layout dominates:
- understand constraints first
- remove unnecessary intrinsic measurement
- avoid large `shrinkWrap` scrollables when a single lazy scroll structure fits
- use known item extents only when geometry is truly stable
- use slivers for large coordinated scrolling
- prefer paint transforms over per-frame layout only when semantics remain correct

Do not break text scaling, wrapping, hit testing, or accessibility to force cheaper geometry.

## 11. Optimize scrolling systematically

For feeds/grids:

1. Profile a deterministic fast fling.
2. Check UI vs raster.
3. Verify lazy builders/slivers.
4. Inspect row build/layout.
5. Inspect `shrinkWrap`/intrinsics.
6. Inspect image source/decode dimensions.
7. Inspect effects/CustomPainter.
8. Inspect platform views.
9. Inspect state emissions during scroll.
10. Inspect keep-alive/offscreen cache.
11. Change one contributor.
12. Repeat the same fling.

Tune `scrollCacheExtent` only with evidence; more offscreen work trades latency for build/layout/memory. Verify deprecated/current APIs against the repository SDK.

Keep alive only content whose retained state/recreation tradeoff warrants it. Paginate large datasets when product semantics allow.

## 12. Optimize images as a pipeline

Model:

```text
source/transfer → decode → cache → upload/raster → retained memory
```

A common decoded-memory estimate is:

```text
width × height × 4 bytes
```

For thumbnails/feed cells:
- prefer right-sized server/CDN derivatives
- use DPR-aware decode dimensions on supported native paths
- avoid original-resolution images
- keep layout dimensions stable
- prefetch only likely near-future assets
- tune `ImageCache` only after measuring churn and memory

Treat Web image behavior separately; native decode hints do not map identically to browser decoding.

## 13. Optimize raster work when raster is high

Inspect images first, then effects, clipping/offscreen layers, paths/vectors, `CustomPainter`, platform views.

Use `RepaintBoundary` only where repaint isolation removes meaningful work. Do not wrap everything, and do not remove all boundaries blindly.

For `CustomPainter`:
- make `shouldRepaint` reflect paint-affecting data
- use `repaint: Listenable` where it can bypass build/layout
- cache stable expensive geometry only when measured

Treat opacity, `saveLayer`, clips, blur, filters, and shadows as contextual costs, not banned APIs.

## 14. Verify renderer-specific assumptions

Check the actual backend before applying renderer-specific advice.

Do not cargo-cult historical shader warmup into current Impeller paths. Even with Impeller, raster jank can come from images, effects, paths, platform views, or GPU limits.

## 15. Diagnose memory and GC correctly

Separate:
- live application state
- cache retention
- image/native memory
- allocation churn
- actual leaks

Frequent GC is not automatically a problem. Investigate when it correlates with stalls, large bursts, heap growth, or memory pressure.

For retained growth:

```text
baseline snapshot → repeat lifecycle → diff → inspect growing classes/references
→ classify cache vs leak → fix ownership/eviction/allocation → re-profile
```

Avoid object pooling ordinary Dart objects without profiling evidence.

## 16. Optimize startup by critical path

Define the milestone:

```text
process → engine → Dart → bootstrap → runApp → first frame
→ meaningful content → interactive
```

Inspect:
- synchronous `main`
- pre-`runApp` awaits
- eager DI graph
- DB/storage work
- plugin initialization
- first-screen parsing/images/vectors/fonts
- initial build/layout/raster

Block `runApp` only for correctness-critical dependencies. Defer optional analytics, warming, rare feature SDKs, and secondary services when safe.

Do not use `deferFirstFrame` to hide startup cost; it intentionally delays presentation.

## 17. Handle platform integration separately

For platform channels:
- reduce high-frequency chatter
- batch when semantics permit
- inspect native main-thread work
- move heavy native processing off critical threads where supported

For platform views:
- profile on physical target devices
- verify the active composition strategy
- treat Android HCPP and similar modes as version/device-specific
- test scrolling, animation, overlays, transforms, and lifecycle

Do not assume Android/iOS/macOS platform-view behavior is interchangeable.

## 18. Treat Flutter Web as its own platform

Verify:
- profile build
- browser
- CanvasKit vs Wasm/skwasm
- deployment headers
- browser main-thread work
- JS interop
- DOM/platform views
- code/renderer/assets download
- image/CDN/cache behavior

Do not apply stale HTML-renderer advice. Do not assume mobile isolate behavior applies to Web.

Benchmark `--wasm` only against the actual supported browser/deployment matrix.

## 19. Test desktop and sustained efficiency

For desktop, test large/high-DPI windows, live resize, large tables/grids, and native integrations.

For sustained workloads, inspect:
- continuous animations
- timers/polling
- worker isolates
- sensors/location
- repeated network wakeups
- hidden/offscreen work
- sustained GPU effects

Pause nonessential work when hidden/backgrounded if correctness permits. Treat thermal and battery cost as performance requirements.

## 20. Add performance regression coverage

Use microbenchmarks for isolated algorithms, not as proof of screen smoothness.

Use integration/macro flows for launch, scroll, navigation, animation, or other user-visible workloads.

Prefer distributions:
- p50
- p90/p95
- p99
- worst frame
- percentage above budget

Avoid brittle exact microsecond thresholds on noisy shared CI. Use controlled device labs for hard frame gates when possible.

## 21. Report every performance change

Use:

**Symptom** — what users observe  
**Baseline** — environment and before metrics  
**Classification** — UI/raster/CPU/memory/startup/Web/platform  
**Change** — exact targeted modification  
**Reason** — why it should reduce the measured cost  
**Trade-off** — quality, memory, complexity, battery, compatibility  
**Verification** — before/after result on the same scenario  
**Decision** — keep, revise, or revert

Never claim an optimization improved performance without measurement when measurement is available.

## Production gates

Verify:
- representative profile/release measurements exist
- performance-floor devices are acceptable
- relevant high-refresh devices are tested
- critical UI-isolate stalls are resolved
- critical scrolling/animations meet product targets
- raster-heavy screens are profiled
- image sizing/decoding is appropriate
- large collections are lazy/paginated where appropriate
- `shrinkWrap`/intrinsics are deliberate
- memory/cache behavior is understood
- isolate overhead is justified
- startup avoids unnecessary blocking
- platform views are profiled on real devices
- Web is profiled independently when supported
- desktop high-DPI/resize is tested when supported
- polling/animation/background work is lifecycle-aware
- accessibility/reduced-motion behavior is preserved
- critical flows have regression coverage where practical
- performance-specific complexity has documented evidence

## Final engineering rule

For every proposed optimization, answer:

```text
1. What measured problem does this solve?
2. Why should this reduce that measured cost?
3. What tradeoff does it introduce?
4. How will we verify it?
```

If those answers are unavailable, profile first.

Prioritize: correctness → responsiveness → frame stability → input latency → memory stability → startup → battery/thermal → maintainability → raw throughput → developer convenience.
