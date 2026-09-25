---
name: flutter-ui-performance-engineering
description: Diagnose, optimize, review, and validate Flutter UI smoothness across Android, iOS, Web, and desktop. Use when a task involves dropped or slow frames, bad frame pacing, input latency, scrolling or list lag, route or animation hitching, excessive rebuild/layout/paint/raster work, CustomPainter, blur/clipping/opacity/shadows, platform-view composition, oversized UI images, keyboard or resize jank, low-end device tuning, 90/120/144 Hz readiness, or a Flutter UI performance audit. Prefer this skill for end-to-end frame-pipeline and rendering work. Do not use for a memory leak with no UI symptom, image handling with no measured frame impact, isolate architecture with no UI bottleneck, or package-specific tuning when a dedicated skill covers it.
---

# Flutter UI Performance Engineering

Optimize the dominant measured work, not performance folklore. Preserve
correctness, accessibility, visual intent, bounded memory, battery life, and
maintainability.

## Establish the runtime

Before advising or editing, inspect:

```text
flutter --version
dart --version
pubspec.yaml and pubspec.lock
target platforms and minimum OS/browser versions
renderer/backend and platform views
target device tiers and refresh rates
existing performance tests, traces, and telemetry
```

The bundled guide was validated on 2026-08-11 against Flutter documentation in
the Flutter 3.44.7 line and Dart 3.12.x. Treat scroll APIs, text scaling,
Impeller, Web renderers/concurrency, platform views, DevTools, and image-cache
defaults as version-sensitive. Prefer the installed SDK and package source when
they differ.

## Use the evidence loop

Follow this order:

```text
reproduce → define metric → profile representative hardware
→ classify slow stage → identify dominant mechanism
→ make one bounded change → repeat identical trace
→ validate sustained load and release behavior
```

1. Translate the complaint into a repeatable scenario and target metric.
2. Run native targets in profile mode on physical hardware; use a profile Web
   build plus browser performance tooling for Web.
3. Record the device, OS/browser, build mode, renderer, refresh cadence, data
   size, cache/network state, and interaction path.
4. Capture a baseline with p90, p99, worst frames, and slow-frame count. Include
   memory or input-to-display latency only when relevant.
5. Select slow frames and separate UI/build/layout/CPU time from raster/GPU
   time. Inspect `FrameTiming.totalSpan` when both bars look healthy but input
   still feels late.
6. Use build/layout/paint tracing, repaint rainbow, layer disabling, CPU
   profiling, or memory tooling only to test a specific hypothesis; disable
   extra instrumentation for the final comparison.
7. Change the largest contributor first, then repeat the same trace.
8. Keep the change only when the target metric materially improves without a
   correctness, accessibility, memory, thermal, or maintenance regression.

Never use debug-mode timing, average FPS, one lucky run, an emulator alone, or
rebuild count alone as production evidence.

## Classify before changing code

| Evidence | Investigate first |
|---|---|
| UI time over budget | synchronous Dart, broad invalidation, expensive build, intrinsic/repeated layout, collection work, text layout, allocation/GC |
| Raster time over budget | oversized images, blur/filter/saveLayer, opacity, clipping, shadows, paths, overdraw, large repaint regions, platform views |
| Both over budget | the larger stage first, unless one mechanism clearly feeds both |
| Both within budget but input is late | `totalSpan`, event-loop stalls, native/plugin calls, event batching |
| Hitch as new rows appear | lazy construction, row layout, decode/upload, cache policy |
| Degrades during a long session | retained resources, image cache, allocation rate, GC, hidden animations |
| 60 Hz passes but 120 Hz fails | the actual ~8.33 ms cadence and target hardware |

Use `1000 / refreshRateHz` as the approximate cadence interval. Do not treat
16 ms as universal, and do not simply add pipelined UI and raster durations.

## Preserve these invariants

- Keep network, database, parsing, sorting, and other significant work out of
  `build()` and frame-critical callbacks.
- Remember that `async`/`await` does not move CPU work off the main isolate.
- Scope state invalidation to the state that changed, but do not contort code to
  eliminate cheap rebuilds.
- Use lazy builders for large collections; review large `shrinkWrap` scrollables,
  intrinsic layout, nested scrolling, eager children, and unbounded keep-alive.
- Use known item extents only when they are actually correct.
- Decode images near their rendered size where supported; keep precache and
  cache growth bounded.
- Add `RepaintBoundary` only after repaint evidence and verify raster/memory
  impact; never blanket-wrap the tree.
- Bound blur, clipping, shadows, alpha layers, complex paths, and animated paint
  area by their measured visual value.
- Prefer transform- or paint-driven motion over repeated layout when the visual
  result and semantics allow it.
- Stop or mute invisible continuous animations and respect reduced motion.
- Dispose controllers, listeners, subscriptions, overlays, and other owned UI
  resources at the correct lifecycle boundary.
- Move genuinely heavy CPU work to an isolate only when saved main-isolate time
  exceeds spawn, transfer, and coordination cost. Revalidate Web support.
- Do not recommend obsolete SkSL bundling or assume Impeller fixes arbitrary
  build, layout, paint, image, or composition work.
- Never disable semantics, text scaling, reduced-motion handling, hit testing,
  or correctness as a performance shortcut.

## Route to the production guide

Read only the sections needed from `references/production-guide.md`. Locate
them before loading long ranges:

```sh
rg -n '^#{1,3} (SEARCH HEADING)$' references/production-guide.md
```

| Task | Search headings |
|---|---|
| Establish frame model and budgets | `Flutter Frame Pipeline|Frame Budgets|Refresh Rate|Frame-Time Targets|Frame Pacing vs FPS|Production Frame Metrics|Jank Classification` |
| Profile and instrument | `Required Performance Decision Tree|Profiling Workflow — HIGH PRIORITY|Performance Instrumentation|FrameTiming` |
| Reduce build/state work | `Build Optimization|setState|State Management|Selectors / Granular Subscriptions|const|Widgets vs Helper Functions|Keys|MediaQuery Granularity` |
| Reduce layout and scrolling work | `Layout Optimization|Intrinsic Layout|shrinkWrap|Nested Scroll Anti-Pattern|Scrolling — HIGH PRIORITY|Lazy Lists|itemExtent|scrollCacheExtent|KeepAlive|Slivers|Pagination` |
| Reduce paint/raster work | `Paint Optimization|RepaintBoundary|saveLayer|Opacity|Clipping|Blur — HIGH PRIORITY|Shadows and Elevation|CustomPainter|Canvas Hot Paths|GPU Overdraw` |
| Tune animation and routes | `Animation Performance|AnimationController Lifecycle|TickerMode|Transform vs Layout Animation|AnimatedBuilder / ListenableBuilder|Infinite Animations|Route Transitions|Hero` |
| Diagnose images, text, or CPU | `Images — HIGH PRIORITY|Oversized Image Problem|Image Cache Tuning|Text Performance|CPU Work on the Main Isolate|Isolates|Garbage Collection and Allocation` |
| Diagnose lifecycle/input/native composition | `Memory and Long-Session Jank|Resource Lifecycle|Input and Gesture Performance|Keyboard Opening|Platform Channels|Platform Views — HIGH PRIORITY` |
| Handle a specific platform/runtime | `Impeller|Web Performance|Android Performance|iOS Performance|Desktop Performance|High Refresh Rate|Low-End Device Strategy|Adaptive Quality` |
| Audit, review, or verify a release | `Performance Rules — HIGH PRIORITY|Anti-Patterns|Optimization Priority Ladder|120 Hz Readiness Checklist|UI Performance Audit Checklist|Code Review Checklist|Production Readiness Checklist|Version-Sensitive Areas` |

For a broad audit, read the guide's principles, decision tree, profiling
workflow, optimization priority ladder, relevant platform section, audit
checklist, and version-sensitive areas. Read the entire guide only when the
request genuinely spans the whole UI pipeline.

## Fix the shared cause

Trace every caller and owner of the expensive path before editing. Prefer one
fix at the lifecycle, state, data, layout, or paint boundary shared by all
affected callers over guards in individual widgets. Reuse the project's state,
rendering, image, and lifecycle patterns. Do not switch state-management
packages, add a global performance abstraction, or introduce a dependency
without measured necessity.

Report each recommendation as:

```text
evidence → bottleneck stage → mechanism → smallest change
→ expected metric → verification scenario → tradeoff
```

If no trace or reproducible artifact exists, label the diagnosis as a
hypothesis and request or define the smallest measurement that can confirm it.

## Validate the result

Run the narrowest relevant formatting, analysis, and tests, then repeat the
representative performance scenario. Cover the affected paths:

- first and repeated interactions;
- sustained scrolling/animation and route cycles;
- keyboard, resize, rotation, background/resume, or platform views when used;
- realistic data and images;
- lowest supported hardware tier;
- target 90/120/144 Hz hardware where promised;
- reduced motion and text scaling;
- memory stability and idle frame scheduling for long-lived UI;
- release build behavior after profile-mode diagnosis.

State which devices, browsers, build modes, and traces were not validated. Do
not claim a performance improvement from static analysis or code shape alone.
