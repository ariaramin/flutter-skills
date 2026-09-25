# Contents

- [Common Anti-Patterns](#common-anti-patterns)
  - [1. Profiling in debug mode](#1-profiling-in-debug-mode)
  - [2. Optimizing without measurements](#2-optimizing-without-measurements)
  - [3. Treating `const` as the primary optimization](#3-treating-const-as-the-primary-optimization)
  - [4. Trying to prevent every rebuild](#4-trying-to-prevent-every-rebuild)
  - [5. Network request inside `build`](#5-network-request-inside-build)
  - [6. Parsing a large JSON response synchronously](#6-parsing-a-large-json-response-synchronously)
  - [7. Offloading tiny work to an isolate](#7-offloading-tiny-work-to-an-isolate)
  - [8. `shrinkWrap: true` everywhere](#8-shrinkwrap-true-everywhere)
  - [9. `Column` with thousands of children](#9-column-with-thousands-of-children)
  - [10. Precaching every image](#10-precaching-every-image)
  - [11. Full-resolution decode for thumbnails](#11-full-resolution-decode-for-thumbnails)
  - [12. `RepaintBoundary` everywhere](#12-repaintboundary-everywhere)
  - [13. Removing every `RepaintBoundary`](#13-removing-every-repaintboundary)
  - [14. Unnecessary intrinsic layout](#14-unnecessary-intrinsic-layout)
  - [15. Clipping everything](#15-clipping-everything)
  - [16. Large blur/shadow effects without profiling](#16-large-blurshadow-effects-without-profiling)
  - [17. `CustomPainter.shouldRepaint => true`](#17-custompaintershouldrepaint-true)
  - [18. Layout-heavy animation when a transform suffices](#18-layout-heavy-animation-when-a-transform-suffices)
  - [19. Rebuilding a large static animation subtree](#19-rebuilding-a-large-static-animation-subtree)
  - [20. Giant state object for tiny changes](#20-giant-state-object-for-tiny-changes)
  - [21. Deep equality over massive lists at high frequency](#21-deep-equality-over-massive-lists-at-high-frequency)
  - [22. Uncontrolled high-frequency streams](#22-uncontrolled-high-frequency-streams)
  - [23. Search computation on every keystroke](#23-search-computation-on-every-keystroke)
  - [24. Loading all paginated data at once](#24-loading-all-paginated-data-at-once)
  - [25. Keeping every page/tab alive](#25-keeping-every-pagetab-alive)
  - [26. Excessive worker pool](#26-excessive-worker-pool)
  - [27. Synchronous plugin work on a critical path](#27-synchronous-plugin-work-on-a-critical-path)
  - [28. Blocking `runApp` on unrelated initialization](#28-blocking-runapp-on-unrelated-initialization)
  - [29. Initializing every service eagerly](#29-initializing-every-service-eagerly)
  - [30. Continuous animation while offscreen](#30-continuous-animation-while-offscreen)
  - [31. Aggressive polling](#31-aggressive-polling)
  - [32. Excessive production logging](#32-excessive-production-logging)
  - [33. Assuming smaller app size means smoother frames](#33-assuming-smaller-app-size-means-smoother-frames)
  - [34. Assuming new hardware removes the need to optimize](#34-assuming-new-hardware-removes-the-need-to-optimize)
  - [35. Treating simulator performance as production evidence](#35-treating-simulator-performance-as-production-evidence)
  - [36. Applying outdated shader warmup advice automatically](#36-applying-outdated-shader-warmup-advice-automatically)
  - [37. Treating 16 ms as the only frame budget](#37-treating-16-ms-as-the-only-frame-budget)
  - [38. Optimizing UI work when raster is the bottleneck](#38-optimizing-ui-work-when-raster-is-the-bottleneck)
  - [39. Optimizing raster effects when synchronous Dart CPU is the bottleneck](#39-optimizing-raster-effects-when-synchronous-dart-cpu-is-the-bottleneck)
  - [40. Blindly tuning image cache globally](#40-blindly-tuning-image-cache-globally)
- [New Feature Performance Workflow](#new-feature-performance-workflow)
  - [1. Understand expected workload](#1-understand-expected-workload)
  - [2. Identify likely sensitive paths](#2-identify-likely-sensitive-paths)
  - [3. Implement the simplest correct design](#3-implement-the-simplest-correct-design)
  - [4. Test in profile mode](#4-test-in-profile-mode)
  - [5. Record baseline](#5-record-baseline)
  - [6. Inspect frame classification](#6-inspect-frame-classification)
  - [7. Inspect CPU/memory only where indicated](#7-inspect-cpumemory-only-where-indicated)
  - [8. Optimize one measured contributor](#8-optimize-one-measured-contributor)
  - [9. Re-profile](#9-re-profile)
  - [10. Test representative low/mid-tier hardware](#10-test-representative-lowmid-tier-hardware)
  - [11. Test relevant refresh rates](#11-test-relevant-refresh-rates)
  - [12. Add regression coverage](#12-add-regression-coverage)
  - [13. Document non-obvious decisions](#13-document-non-obvious-decisions)
- [Existing-Code Performance Review Workflow](#existing-code-performance-review-workflow)
- [Performance Refactoring Rules](#performance-refactoring-rules)
  - [Rule 1](#rule-1)
  - [Rule 2](#rule-2)
  - [Rule 3](#rule-3)
  - [Rule 4](#rule-4)
  - [Rule 5](#rule-5)
  - [Rule 6](#rule-6)
  - [Rule 7](#rule-7)
  - [Rule 8](#rule-8)
- [Code Review Checklist](#code-review-checklist)
- [Frame / Jank Checklist](#frame-jank-checklist)
- [Scrolling Checklist](#scrolling-checklist)
- [Image Checklist](#image-checklist)
- [Animation Checklist](#animation-checklist)
- [Memory Checklist](#memory-checklist)
- [Startup Checklist](#startup-checklist)
- [Web Checklist](#web-checklist)
- [Performance Profiling Checklist](#performance-profiling-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Quick Reference](#quick-reference)
- [Final Performance Engineering Rule](#final-performance-engineering-rule)

---

# Common Anti-Patterns

## 1. Profiling in debug mode

**Bad**

```bash
flutter run
```

followed by conclusions about production jank.

**Why it is slow**

Debug execution and instrumentation are not representative of production.

**Better**

```bash
flutter run --profile
```

Use release for final validation where appropriate.

**How to verify**

Reproduce the exact flow in profile/release-like mode on representative hardware and compare frame timings.

---

## 2. Optimizing without measurements

**Bad**

```text
"We should rewrite this page because there are many widgets."
```

**Why it is slow**

The proposed work might target something that is not the bottleneck.

**Better**

Record a representative trace and classify UI/raster/CPU/memory first.

**How to verify**

The optimization should reduce the measured contributor and improve the relevant frame/user metric.

---

## 3. Treating `const` as the primary optimization

**Bad**

```text
Performance plan:
1. add const everywhere
2. done
```

**Why it is slow**

`const` cannot fix raster effects, synchronous parsing, intrinsic layout, image decoding, platform views, or many other bottlenecks.

**Better**

Use `const` normally, then optimize the measured bottleneck.

**How to verify**

Compare frame trace before and after. Keep changes primarily for code quality if runtime benefit is negligible.

---

## 4. Trying to prevent every rebuild

**Bad**

```text
Any widget rebuilding is a bug.
```

**Why it is slow**

Avoidance machinery can add selectors, state complexity, and equality work while solving nothing.

**Better**

Find expensive rebuilds, not merely frequent rebuilds.

**How to verify**

Use build tracing/CPU data and confirm reduced UI-frame cost.

---

## 5. Network request inside `build`

**Bad**

```dart
@override
Widget build(BuildContext context) {
  final future = repository.loadProducts();

  return FutureBuilder<List<Product>>(
    future: future,
    builder: buildProducts,
  );
}
```

**Why it is slow**

Every rebuild can create another request/future and repeat work.

**Better**

Create/load the future at the appropriate lifecycle/state boundary.

```dart
late final Future<List<Product>> _products;

@override
void initState() {
  super.initState();
  _products = repository.loadProducts();
}

@override
Widget build(BuildContext context) {
  return FutureBuilder<List<Product>>(
    future: _products,
    builder: buildProducts,
  );
}
```

**How to verify**

Inspect Network view and ensure rebuilds no longer issue duplicate requests.

---

## 6. Parsing a large JSON response synchronously

**Bad**

```dart
final decoded = jsonDecode(hugePayload);
```

inside an interaction-critical main-isolate path when profiling shows a long parse.

**Why it is slow**

Synchronous decoding blocks input/frame work on the main isolate.

**Better**

```dart
final decoded = await Isolate.run(
  () => jsonDecode(hugePayload),
);
```

when the real payload is large enough to justify the transfer/worker cost.

**How to verify**

CPU trace should move the long synchronous main-isolate block away, and affected frame/input metrics should improve.

---

## 7. Offloading tiny work to an isolate

**Bad**

```dart
final total = await Isolate.run(
  () => values.take(5).fold<int>(0, (a, b) => a + b),
);
```

**Why it is slow**

Spawn/dispatch/message overhead can exceed the computation.

**Better**

```dart
final total = values.take(5).fold<int>(0, (a, b) => a + b);
```

**How to verify**

Benchmark both versions with representative input.

---

## 8. `shrinkWrap: true` everywhere

**Bad**

```dart
ListView.builder(
  shrinkWrap: true,
  itemCount: 5000,
  itemBuilder: buildRow,
)
```

inside another scrollable.

**Why it is slow**

Shrink wrapping can require repeated work to determine scroll extent.

**Better**

Use a single lazy scrolling hierarchy, often with slivers.

**How to verify**

Compare layout events and frame timing during scrolling.

---

## 9. `Column` with thousands of children

**Bad**

```dart
SingleChildScrollView(
  child: Column(
    children: items.map(ItemRow.new).toList(),
  ),
)
```

for thousands of records.

**Why it is slow**

It eagerly creates/layouts the entire collection.

**Better**

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ItemRow(items[index]);
  },
)
```

**How to verify**

Compare startup/build/layout duration and memory.

---

## 10. Precaching every image

**Bad**

```text
On startup:
precache every product image in the catalog.
```

**Why it is slow**

It shifts decode/network work into startup and increases memory/cache pressure.

**Better**

Precache only high-value near-future images.

**How to verify**

Compare startup, memory, network, and transition performance.

---

## 11. Full-resolution decode for thumbnails

**Bad**

```dart
Image.network(
  hugeImageUrl,
  width: 80,
  height: 80,
)
```

for a multi-megapixel source on native platforms.

**Why it is slow**

Display size does not inherently reduce decoded source memory.

**Better**

Use DPR-aware `cacheWidth` / `cacheHeight` where supported.

**How to verify**

Check Memory view and scroll/frame performance.

---

## 12. `RepaintBoundary` everywhere

**Bad**

```text
Wrap every row, icon, text, button, card, and image in RepaintBoundary.
```

**Why it is slow**

Extra compositing boundaries consume resources and may not reduce any repaint.

**Better**

Add boundaries where repaint diagnostics show a frequently updating subtree invalidating expensive neighbors.

**How to verify**

Compare repaint regions, layer behavior, raster time, and memory.

---

## 13. Removing every `RepaintBoundary`

**Bad**

```text
Layers are expensive, remove all boundaries.
```

**Why it is slow**

Large static regions may repaint unnecessarily when a small child changes.

**Better**

Keep framework/default boundaries and remove only boundaries proven harmful.

**How to verify**

Compare paint/raster traces before and after.

---

## 14. Unnecessary intrinsic layout

**Bad**

```dart
IntrinsicHeight(
  child: largeComplexTree,
)
```

without actual intrinsic-sizing requirements.

**Why it is slow**

Intrinsic measurement can trigger extra layout passes.

**Better**

Use explicit constraints/known geometry when the design allows.

**How to verify**

Enable layout tracing and compare layout duration.

---

## 15. Clipping everything

**Bad**

```dart
ClipRRect(
  borderRadius: BorderRadius.circular(0),
  child: content,
)
```

when no clipping is needed.

**Why it is slow**

Clips add rendering work and some forms can require more expensive compositing.

**Better**

Do not clip unless required.

**How to verify**

Profile raster time and visual correctness.

---

## 16. Large blur/shadow effects without profiling

**Bad**

```dart
BoxShadow(
  blurRadius: 80,
  spreadRadius: 30,
)
```

across a huge animated area.

**Why it is slow**

Large blurred effects can be raster intensive.

**Better**

Reduce affected area/radius only when profiling proves the effect is the bottleneck and design accepts the change.

**How to verify**

Compare raster duration on the same hardware.

---

## 17. `CustomPainter.shouldRepaint => true`

**Bad**

```dart
@override
bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
```

for static data.

**Why it is slow**

Flutter loses a key opportunity to avoid unnecessary repainting.

**Better**

Compare the fields that actually affect paint output.

**How to verify**

Track paints/repaints and compare raster/UI paint cost.

---

## 18. Layout-heavy animation when a transform suffices

**Bad**

Animating a complex subtree's layout position every frame when neighboring layout need not change.

**Why it is slow**

Layout can propagate through the render tree every tick.

**Better**

Use an appropriate transform/transition if the same visual and interaction semantics are preserved.

**How to verify**

Compare layout events/frame UI duration.

---

## 19. Rebuilding a large static animation subtree

**Bad**

```dart
AnimatedBuilder(
  animation: controller,
  builder: (context, child) {
    return Transform.scale(
      scale: controller.value,
      child: const VeryLargeStaticContent(),
    );
  },
)
```

where the static subtree is recreated by the builder in real code.

**Why it is slow**

Stable content participates unnecessarily in animation rebuilds.

**Better**

Pass static content via `child`.

**How to verify**

Track widget builds during animation.

---

## 20. Giant state object for tiny changes

**Bad**

A 20,000-item immutable state list is copied/emitted every pointer movement.

**Why it is slow**

Large copies/equality/subscriptions can consume main-isolate CPU.

**Better**

Partition high-frequency transient state from large stable state where architecture permits.

**How to verify**

CPU profile state transition/equality and compare frame time.

---

## 21. Deep equality over massive lists at high frequency

**Bad**

```text
every animation/scroll event
→ compare 50,000-element state collections
```

**Why it is slow**

Equality becomes a hot CPU path.

**Better**

Use stable references, versioning, narrower state, or reduced update frequency while preserving correctness.

**How to verify**

CPU profiler should show reduced comparison cost.

---

## 22. Uncontrolled high-frequency streams

**Bad**

```text
sensor at 200 Hz
→ emit state 200 Hz
→ rebuild UI 200 Hz
```

when the UI only needs 30 updates/sec.

**Why it is slow**

Unnecessary event/state/render work consumes CPU.

**Better**

Sample/throttle/batch only if product semantics permit.

**How to verify**

Compare emission frequency, CPU, and frame timing.

---

## 23. Search computation on every keystroke

**Bad**

```dart
onChanged: (query) {
  final results = searchHugeDataset(query);
  setState(() {
    visibleResults = results;
  });
}
```

when `searchHugeDataset` is measured as expensive.

**Why it is slow**

Typing directly triggers CPU-heavy synchronous work.

**Better**

Debounce where UX permits and/or move genuinely heavy search computation away from the UI isolate.

**How to verify**

Profile typing latency and CPU activity.

---

## 24. Loading all paginated data at once

**Bad**

```text
download and render every historical record
```

before first content.

**Why it is slow**

It increases network, parse, memory, and UI work.

**Better**

Progressively load when product semantics permit.

**How to verify**

Measure first-content latency, memory, and scroll behavior.

---

## 25. Keeping every page/tab alive

**Bad**

All tabs retain large lists, images, controllers, and platform views indefinitely.

**Why it is slow**

Memory pressure increases and hidden work may continue.

**Better**

Keep alive only state that materially benefits user experience.

**How to verify**

Inspect memory while visiting many tabs and after navigation.

---

## 26. Excessive worker pool

**Bad**

```text
spawn dozens of isolates for maximum performance
```

**Why it is slow**

CPU contention, memory, scheduling, and thermal pressure can overwhelm benefits.

**Better**

Start with one measured worker strategy and scale only if throughput measurements justify it.

**How to verify**

Measure throughput, UI responsiveness, CPU, memory, and thermals.

---

## 27. Synchronous plugin work on a critical path

**Bad**

A tap triggers a native operation that monopolizes the platform main thread and stalls rendering.

**Why it is slow**

Platform/native work can contend with UI/composition.

**Better**

Use plugin/native background execution where supported, reduce payload/chattiness, or defer noncritical work.

**How to verify**

Correlate timeline/native traces with the stall.

---

## 28. Blocking `runApp` on unrelated initialization

**Bad**

```dart
await initializeEverything();
runApp(const App());
```

**Why it is slow**

Unrelated work directly delays first Flutter content.

**Better**

Complete only correctness-critical startup dependencies first; initialize secondary services after the UI starts.

**How to verify**

Measure time to first frame and first meaningful content.

---

## 29. Initializing every service eagerly

**Bad**

Construct every repository, database, SDK, feature controller, and cache at process start.

**Why it is slow**

Startup CPU/I/O and memory increase regardless of feature usage.

**Better**

Use lazy initialization where lifecycle allows.

**How to verify**

Startup trace and memory before/after.

---

## 30. Continuous animation while offscreen

**Bad**

Hidden tabs continue multiple repeating animations indefinitely.

**Why it is slow**

They consume CPU/GPU/ticker activity without visible benefit.

**Better**

Pause/mute/dispose animations when feature lifecycle permits.

**How to verify**

Compare CPU/GPU utilization while the feature is hidden.

---

## 31. Aggressive polling

**Bad**

```text
timer every 250 ms
→ network request
```

for slowly changing information.

**Why it is slow**

It wastes network, CPU, battery, and wakeups.

**Better**

Use event-driven updates or a product-appropriate interval.

**How to verify**

Compare request counts, CPU, battery, and freshness.

---

## 32. Excessive production logging

**Bad**

```dart
logger.debug(jsonEncode(hugeState));
```

on every state change.

**Why it is slow**

Serialization/string formatting/I/O can become real CPU work.

**Better**

Log compact metadata and avoid constructing expensive messages when not needed.

**How to verify**

CPU profile with production logging configuration.

---

## 33. Assuming smaller app size means smoother frames

**Bad**

```text
We removed 5 MB, therefore scrolling should be faster.
```

**Why it is slow**

Download/binary size and frame rendering are different metrics.

**Better**

Measure scrolling frames directly.

**How to verify**

Use Performance view before/after.

---

## 34. Assuming new hardware removes the need to optimize

**Bad**

```text
It is smooth on the latest flagship, ship it.
```

**Why it is slow**

Real users can have lower CPU/GPU capacity and different refresh rates.

**Better**

Test representative device tiers.

**How to verify**

Maintain device-level frame metrics.

---

## 35. Treating simulator performance as production evidence

**Bad**

```text
iOS Simulator is smooth, therefore the iPhone build is smooth.
```

**Why it is slow**

Simulator rendering/hardware behavior differs from physical devices.

**Better**

Validate on physical target hardware.

**How to verify**

Compare the same flow on-device.

---

## 36. Applying outdated shader warmup advice automatically

**Bad**

```text
First-run jank → capture SkSL shaders immediately.
```

**Why it is slow**

Current Impeller configurations have different shader behavior; the workaround may be obsolete or irrelevant.

**Better**

Confirm renderer and raster trace first.

**How to verify**

Identify the actual raster event and compare current renderer behavior.

---

## 37. Treating 16 ms as the only frame budget

**Bad**

```text
9 ms frame = always good.
```

**Why it is slow**

At 120 Hz the interval is about 8.33 ms.

**Better**

Use target refresh rate/device frame interval.

**How to verify**

Run on target high-refresh hardware and inspect frame misses.

---

## 38. Optimizing UI work when raster is the bottleneck

**Bad**

Raster = 25 ms, UI = 3 ms, yet code review focuses on `const`.

**Why it is slow**

The optimization addresses the wrong stage.

**Better**

Investigate images/effects/paint/platform views.

**How to verify**

Raster duration should decrease.

---

## 39. Optimizing raster effects when synchronous Dart CPU is the bottleneck

**Bad**

UI = 40 ms due to parsing, yet shadows are redesigned.

**Why it is slow**

Raster was not causing the missed frame.

**Better**

Profile Dart CPU and address parsing/computation.

**How to verify**

Main-isolate duration and interaction latency should improve.

---

## 40. Blindly tuning image cache globally

**Bad**

```dart
PaintingBinding.instance.imageCache.maximumSizeBytes =
    1024 * 1024 * 1024;
```

without memory evidence.

**Why it is slow**

A huge cache can increase memory pressure; an overly small cache can increase decoding churn.

**Better**

Measure working set and tune only when cache behavior is proven relevant.

**How to verify**

Compare memory, image misses/decoding, and frame performance.

---

# New Feature Performance Workflow

Use this process for performance-sensitive features.

## 1. Understand expected workload

Document:

- typical item count;
- worst realistic item count;
- image dimensions;
- update frequency;
- animation frequency;
- supported devices;
- supported refresh rates;
- platform views;
- startup impact.

## 2. Identify likely sensitive paths

Examples:

- infinite scroll;
- full-screen blur;
- chart with 50,000 points;
- large payload parse;
- camera overlay;
- real-time stream.

This is risk identification, not proof of a bottleneck.

## 3. Implement the simplest correct design

Do not prematurely:

- add worker pools;
- cache everything;
- build custom render objects;
- create elaborate selector hierarchies.

## 4. Test in profile mode

Run the real workload.

## 5. Record baseline

Capture:

- UI/raster distributions;
- startup if affected;
- CPU if computational;
- memory if data/image-heavy.

## 6. Inspect frame classification

Determine UI vs raster.

## 7. Inspect CPU/memory only where indicated

Do not open every profiler and optimize every chart.

## 8. Optimize one measured contributor

Prefer the smallest effective change.

## 9. Re-profile

Use identical:

- device;
- data;
- interaction;
- build mode;
- renderer.

## 10. Test representative low/mid-tier hardware

Do not validate only on developer hardware.

## 11. Test relevant refresh rates

A feature may pass 60 Hz and fail 120 Hz.

## 12. Add regression coverage

For critical flows, automate frame/startup/CPU metrics.

## 13. Document non-obvious decisions

Example:

```text
Feed thumbnails decode at 3×96 px because memory profiling showed
full-resolution decode caused >250 MB image memory and scroll GC pressure.
```

Avoid comments like:

```text
// performance optimization
```

without rationale.

---

# Existing-Code Performance Review Workflow

Before modifying existing performance-sensitive code, inspect:

- prior build mode used for measurements;
- device/browser;
- refresh rate;
- renderer/backend;
- frame trace;
- UI/raster split;
- CPU profile;
- state subscriptions;
- `build` methods;
- expensive derived state;
- intrinsic layout;
- shrink wrapping;
- eager lists;
- current/deprecated scroll cache APIs;
- item extents;
- image source/decode sizes;
- image cache;
- vector complexity;
- clips;
- opacity;
- filters;
- shadows;
- `RepaintBoundary`;
- CustomPainter;
- animations;
- synchronous computation;
- isolate usage;
- transfer overhead;
- memory/GC;
- startup initialization;
- dependency injection;
- plugin initialization;
- network behavior;
- platform channels;
- platform views;
- logging;
- analytics;
- background polling.

Require evidence before refactoring.

---

# Performance Refactoring Rules

## Rule 1

**Do not make a large architectural refactor solely because a pattern looks slow.**

## Rule 2

Capture a before measurement.

## Rule 3

Change one major contributor at a time where practical.

## Rule 4

Preserve behavior.

## Rule 5

Re-measure the exact same scenario.

## Rule 6

Revert performance-only complexity if the improvement is not meaningful.

## Rule 7

Do not trade maintainability for tiny microbenchmark wins unless the path is genuinely critical.

## Rule 8

Document significant performance tradeoffs.

---

# Code Review Checklist

- [ ] Performance-sensitive paths identified.
- [ ] No conclusion based only on debug mode.
- [ ] No obvious long synchronous work on interaction path.
- [ ] Network/database/file calls are not triggered repeatedly from `build`.
- [ ] Rebuild scope matches changing state.
- [ ] Selectors are used only when useful.
- [ ] Expensive state equality/copies have been considered.
- [ ] Large collections use lazy construction where appropriate.
- [ ] `shrinkWrap` has a real layout reason.
- [ ] Intrinsic layout is justified.
- [ ] Known item extents are used only when correct.
- [ ] New code uses current `scrollCacheExtent`, not deprecated `cacheExtent`.
- [ ] Large images are not decoded needlessly at full resolution.
- [ ] Image behavior on web is considered separately.
- [ ] Precaching is targeted.
- [ ] Repaint boundaries are deliberate.
- [ ] Expensive clips/filters/blurs are justified.
- [ ] CustomPainter repaint logic is correct.
- [ ] Animation avoids unnecessary rebuild/layout work.
- [ ] Offscreen animation lifecycle is controlled.
- [ ] Isolate use has enough work to justify overhead.
- [ ] `compute` is not incorrectly assumed to parallelize Flutter web.
- [ ] Memory retention/caches are bounded intentionally.
- [ ] Startup does not await unrelated work.
- [ ] Platform views are profiled if used.
- [ ] Platform-channel/native critical work is understood.
- [ ] Production logging is reasonable.
- [ ] Accessibility remains intact.
- [ ] Before/after measurements exist for performance-specific refactors.

---

# Frame / Jank Checklist

- [ ] Reproduced in profile/release-like mode.
- [ ] Representative device used.
- [ ] Target refresh rate known.
- [ ] UI vs raster side classified.
- [ ] Slow-frame trace captured.
- [ ] Build tracing used only if necessary.
- [ ] Layout tracing used only if necessary.
- [ ] Paint tracing used only if necessary.
- [ ] CPU profile used for Dart hotspots.
- [ ] GC correlation checked only when memory signals point there.
- [ ] Largest contributor optimized first.
- [ ] Same scenario re-measured.
- [ ] Input latency considered separately from frame throughput.
- [ ] High-refresh behavior validated where relevant.

---

# Scrolling Checklist

- [ ] Large collection uses lazy builder/sliver.
- [ ] No eager thousands-of-children `Column`.
- [ ] `shrinkWrap` justified.
- [ ] Nested scrolling architecture justified.
- [ ] Fixed/known extent used when correct.
- [ ] `itemExtentBuilder` is cheap and side-effect free if used.
- [ ] `scrollCacheExtent` tuning is evidence-based.
- [ ] Keep-alive behavior balances state and memory.
- [ ] Pagination used where appropriate.
- [ ] Item build cost profiled.
- [ ] Item layout cost profiled.
- [ ] Images decoded appropriately.
- [ ] Expensive effects inside rows profiled.
- [ ] Platform views inside scrolling content tested on-device.
- [ ] Fast fling tested.

---

# Image Checklist

- [ ] Source image dimensions known.
- [ ] Display dimensions known.
- [ ] Device pixel ratio considered.
- [ ] Native decode dimensions use `cacheWidth/cacheHeight` where appropriate.
- [ ] Web behavior handled separately.
- [ ] Large decoded images not retained unnecessarily.
- [ ] `ImageCache` tuning supported by measurement.
- [ ] Precaching is targeted.
- [ ] Image-heavy feed tested during fast scroll.
- [ ] Animated images profiled.
- [ ] Network/CDN source sizing considered.
- [ ] Memory after leaving image-heavy screens is understood.

---

# Animation Checklist

- [ ] Profiled on representative hardware.
- [ ] Tested at relevant refresh rates.
- [ ] Static builder subtree passed as `child` where useful.
- [ ] Layout-per-frame work justified.
- [ ] Paint transform considered when semantics permit.
- [ ] Raster effects profiled.
- [ ] Large blur/filters justified.
- [ ] CustomPainter repaint scope correct.
- [ ] Controllers disposed.
- [ ] Offscreen animations paused/muted where appropriate.
- [ ] Reduced-motion/accessibility behavior preserved.
- [ ] Platform views tested during animation.

---

# Memory Checklist

- [ ] Heap trend understood.
- [ ] Native/external memory considered.
- [ ] Image memory considered.
- [ ] Allocation rate measured.
- [ ] GC events correlated with actual stalls before optimization.
- [ ] Cache growth understood.
- [ ] Leak vs bloat distinction made.
- [ ] Listeners/subscriptions/timers/controllers disposed correctly.
- [ ] Large temporary allocations identified.
- [ ] Large collection copies measured.
- [ ] Memory tested after navigation away.
- [ ] Object pooling avoided unless proven useful.

---

# Startup Checklist

- [ ] Cold-start scenario defined.
- [ ] First-frame metric captured.
- [ ] First-meaningful-content metric captured if important.
- [ ] `main()` synchronous work inspected.
- [ ] Pre-`runApp` awaits justified.
- [ ] DI graph inspected.
- [ ] Plugins initialized only when needed.
- [ ] Storage/database initialization justified.
- [ ] Initial JSON/data transforms profiled.
- [ ] First-screen images sized appropriately.
- [ ] First-screen vector/text layout profiled if suspicious.
- [ ] Deferred work does not break correctness.
- [ ] `deferFirstFrame` used only intentionally.
- [ ] Release startup validated on physical hardware.

---

# Web Checklist

- [ ] Web profile build used.
- [ ] Chrome Performance panel used.
- [ ] Current renderer/build mode known.
- [ ] CanvasKit vs `--wasm`/skwasm tested when relevant.
- [ ] Package/browser Wasm compatibility verified.
- [ ] SharedArrayBuffer/server configuration checked if multithreaded skwasm matters.
- [ ] No stale HTML-renderer advice applied.
- [ ] Main-thread Dart CPU profiled.
- [ ] `compute` not assumed to create a background worker.
- [ ] JS interop profiled if heavy.
- [ ] DOM/platform views profiled.
- [ ] Image decode-sizing differences considered.
- [ ] Code/renderer/assets download measured.
- [ ] Compression/cache headers/CDN considered.
- [ ] Service-worker behavior verified from the actual project rather than assumed.
- [ ] Target browser matrix tested.

---

# Performance Profiling Checklist

- [ ] Exact symptom reproduced.
- [ ] Measurement made in profile/release-like mode.
- [ ] Representative hardware/environment used.
- [ ] Refresh rate recorded.
- [ ] Renderer/backend recorded.
- [ ] Deterministic workload used.
- [ ] Baseline saved.
- [ ] UI vs raster classification made.
- [ ] CPU profiler used only when needed.
- [ ] Memory profiler used only when needed.
- [ ] Network profiler used only when relevant.
- [ ] Enhanced tracing disabled for final baseline.
- [ ] One targeted optimization applied.
- [ ] Same test repeated.
- [ ] p90/p99/worst behavior inspected, not only average.
- [ ] Regression/tradeoffs checked.
- [ ] Unsuccessful optimization reverted.

---

# Production Readiness Checklist

- [ ] Representative profile/release measurements exist.
- [ ] Low/mid-tier target-device behavior is acceptable.
- [ ] Target high-refresh devices are tested where relevant.
- [ ] No known critical UI-isolate stalls remain.
- [ ] Critical scrolling flows meet product smoothness targets.
- [ ] Critical animations fit target frame budgets.
- [ ] Raster-heavy screens have been profiled.
- [ ] Images are decoded near useful dimensions where supported.
- [ ] Large collections are lazy/paginated where appropriate.
- [ ] `shrinkWrap` and intrinsic sizing are deliberate.
- [ ] Memory growth is understood.
- [ ] Image/cache memory is bounded appropriately.
- [ ] Isolate overhead has been measured where isolates are used.
- [ ] Background CPU work is justified.
- [ ] Startup does not block on unnecessary work.
- [ ] Platform views have been profiled on real devices.
- [ ] Web has been profiled separately if supported.
- [ ] Desktop high-DPI/resize behavior is tested if supported.
- [ ] Polling/animations do not create unnecessary sustained CPU/GPU load.
- [ ] Accessibility and reduced motion are preserved.
- [ ] Critical flows have regression benchmarks where appropriate.
- [ ] Performance-specific complexity has documented evidence.

---

# Quick Reference

| Situation | First thing to inspect | Typical targeted response |
|---|---|---|
| Scrolling jank | Frame timeline + list item UI/raster cost | Fix measured row build/layout/image/raster contributor |
| UI side over budget | CPU/build/layout timeline | Reduce synchronous Dart or expensive UI phase |
| Raster side over budget | Images/effects/paint/platform views | Simplify measured raster contributor |
| Both UI and raster high | Full frame trace | Attack largest stage first |
| Input feels delayed | UI event-loop work + `FrameTiming.totalSpan` | Remove synchronous interaction-path work |
| Widget rebuilding often | Build duration, not count | Narrow only expensive rebuilds |
| Large image memory | Decode dimensions + cache | Decode near display size, review retention |
| Feed image jank | Decode/upload/cache timing | Right-size images and profile cache behavior |
| Slow first frame | `main`/startup trace | Defer noncritical initialization |
| Slow meaningful content | Startup + data/network pipeline | Parallelize/defer correctly; reduce critical path |
| Search freezes typing | CPU per keypress | Debounce/offload only measured heavy work |
| Huge list loads slowly | Construction/layout strategy | Lazy builder/pagination/known extents |
| `shrinkWrap` list janks | Layout trace | Use bounded/single-scroll/sliver structure |
| Animation jank | Build/layout/paint per tick | Isolate static child, avoid unnecessary layout, reduce raster cost |
| `CustomPainter` expensive | Paint timeline | Correct `shouldRepaint`, use repaint listener/cache geometry |
| Frequent GC | Allocation + frame correlation | Reduce large churn only if GC causes stalls |
| Memory keeps growing | Snapshot/retention analysis | Distinguish cache, bloat, leak |
| Worker made code slower | Isolate dispatch/transfer cost | Keep small work on main isolate or reuse worker |
| Large JSON blocks UI | CPU profile | `Isolate.run`/native `compute` if payload warrants |
| Async network is slow | Network view | Fix network/backend; isolate only CPU processing |
| Plugin call stalls | Platform/native trace | Batch/move native processing where supported |
| Map/WebView jank | Platform-view composition | Profile platform-specific composition strategy |
| Android platform-view issue | Actual composition mode/device | Benchmark current strategy/HCPP only where supported |
| iOS platform-view animation issue | Native-view composition | Consider measured placeholder-texture strategy |
| Web app slow startup | Code/renderer/assets/network | Test `--wasm`, reduce critical downloads/init |
| Flutter web CPU stall | Chrome Performance | Reduce main-thread work; explicit worker if justified |
| Web `compute` still blocks | Browser main thread | Use Web Worker architecture for real parallelism |
| 60 Hz smooth, 120 Hz janky | Tighter frame interval | Optimize stage exceeding ~8.33 ms |
| Debug mode looks slow | Build mode | Re-test in profile/release-like mode |
| First-run animation jank | Renderer + raster trace | Verify current Impeller/backend before shader advice |
| Large shadows/blur | Raster frame | Reduce effect only if trace proves it matters |
| Too many `RepaintBoundary`s | Paint/layer/memory data | Remove only proven unnecessary boundaries |
| No repaint boundaries | Repaint diagnostics | Add only where repaint isolation helps |
| Huge immutable state updates | CPU/equality/copy profile | Partition state/reduce high-frequency copies |
| Rapid stream events | Event/state/render frequency | Throttle/sample only if semantics allow |
| Offscreen tab consumes CPU | Tickers/timers/polling | Pause nonessential hidden work |
| High battery/thermal load | Sustained CPU/GPU/wakeups | Reduce unnecessary continuous activity |
| Small APK but jank remains | Frame timeline | Treat binary size and rendering separately |
| Simulator is smooth | Physical-device trace | Validate on representative hardware |

---

# Final Performance Engineering Rule

For every proposed Flutter performance optimization, answer all four questions:

```text
1. What measured problem does this solve?
2. Why should this change reduce that measured cost?
3. What tradeoff does it introduce?
4. How will we verify the result?
```

If those answers are not available, profile first.

Optimize in this priority order:

1. Correctness
2. User-perceived responsiveness
3. Frame stability
4. Input latency
5. Memory stability
6. Startup experience
7. Battery and thermal efficiency
8. Maintainability
9. Raw benchmark throughput
10. Developer convenience

Never sacrifice correctness, accessibility, or major maintainability for an unmeasured micro-optimization.
