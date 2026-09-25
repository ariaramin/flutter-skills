# Checklists, Anti-Patterns, and Decision Tables

This document provides definitive checklists for code and performance reviews, catalogs critical Flutter anti-patterns with their remediations, and details 6 architectural decision tables.

---

## 1. Code Review Checklist

Use this checklist during pull request reviews or before completing any production Flutter task:

1. **Deterministic Build**: Does `build()` remain purely deterministic and free of uncontrolled side effects?
2. **Off-Frame Work**: Is expensive work (parsing, database access, network I/O, heavy math) kept out of `build()`, layout callbacks, `itemBuilder`, and `shouldRepaint`?
3. **State Scope**: Is state owned at the narrowest reasonable scope rather than leaked globally?
4. **Async Races & Stale Data**: Are asynchronous operations protected against stale completions and races (via tokens, guards, or cancellation)?
5. **Resource Disposal**: Are all created controllers (`AnimationController`, `ScrollController`, `TextEditingController`, `FocusNode`), timers, stream subscriptions, and listeners symmetrically cleaned up in `dispose()`?
6. **Lazy Collections**: Do dynamic or unbounded collections use lazy builders (`ListView.builder`, `SliverList.builder`) instead of eager constructors?
7. **Known Extents**: Are `itemExtent`, `prototypeItem`, or `itemExtentBuilder` used when collection row heights are fixed or easily computable?
8. **Justified `shrinkWrap`**: Is `shrinkWrap: true` strictly justified by constrained content-sizing requirements, rather than used as a lazy fix for unbounded height layout errors?
9. **Single-Axis Scrolling**: Are nested scroll views intentional, coordinated, and avoid competing scroll physics along the same axis?
10. **Key Purpose**: Do keys represent true semantic identity across reordering or state moves, rather than used ceremonially?
11. **Global Keys**: Are `GlobalKey` instances restricted to long-lived, necessary state access or reparenting, and kept outside `build()`?
12. **Image Constraints**: Are images decoded near display dimensions using `cacheWidth`, `cacheHeight`, or `ResizeImage`?
13. **Network Deduplication**: Are identical concurrent network requests deduplicated in repositories/services?
14. **Complete UI States**: Are Loading, Empty, Success, Error, and Retry states completely and cleanly handled?
15. **Deep-Link Safe Routing**: Does navigation use declarative routes that properly validate URL arguments, missing IDs, and authentication redirects?
16. **Responsive Space**: Does layout adapt to available parent/window constraints rather than physical device names?
17. **Keyboard & Focus**: Is the UI fully navigable via Tab keys and keyboard shortcuts, with visible focus indicators?
18. **Scalable Text**: Does layout accommodate large accessibility text scaling via `TextScaler` without clipping?
19. **Accessible Semantics**: Do custom interactive widgets provide clear semantic roles, labels, and actions?
20. **Platform Lifecycle**: Does the app handle Android activity death, predictive back, iOS scene lifecycle, and backgrounding?
21. **Typed APIs**: Are public module interfaces strongly typed, without unvalidated `dynamic` or raw `Map<String, dynamic>` leaks?
22. **Clean Analysis**: Does code pass `flutter analyze` with zero warnings, conforming to project lint rules?

---

## 2. Performance Review Checklist

Before approving any performance-focused pull request, require answers to these verification questions:

- [ ] **Symptom**: What specific user-visible performance symptom was observed and reproduced?
- [ ] **Pipeline Stage**: Which pipeline stage was proven slow (UI isolate Dart work, layout, paint, compositing, or rasterization)?
- [ ] **Mode**: Was profiling conducted in **profile mode** on representative physical hardware (not debug mode or simulator)?
- [ ] **Dataset**: Was the test run with realistic data volumes (e.g., thousands of items, realistic network latencies)?
- [ ] **Framework Rationale**: Is the proposed optimization backed by documented framework behavior or engine architecture?
- [ ] **Measurements**: Are concrete before-and-after measurements provided (frame times, DevTools timeline traces, memory graphs)?
- [ ] **Frame Time**: Did 90th/99th percentile UI frame times measurably improve?
- [ ] **Raster Time**: Did raster thread execution stay within the display refresh budget (8.3 ms or 16.7 ms)?
- [ ] **Memory Regressions**: Did the change cause memory growth, leak retained objects, or bloat cache retention?
- [ ] **Startup Impact**: Did the change regress application startup time or first-frame rendering?
- [ ] **Binary Size**: Did added dependencies or pre-baked assets inflate the release APK/AAB/IPA size?
- [ ] **Repaint Boundaries**: If `RepaintBoundary` was added, did DevTools confirm a reduction in painted area without creating excessive GPU layer overhead?
- [ ] **Isolate Overhead**: If an isolate was added, did the data transfer and spawning overhead stay well below the time saved?
- [ ] **Accessibility & Correctness**: Are semantic structure, focus traversal, and visual layout 100% preserved?

> [!CAUTION]
> **Never approve "it should be faster" as acceptable justification for performance changes without profiling evidence.**

---

## 3. Platform Review Checklist

Verify target-platform quality criteria:

### All Platforms
- Responsive layout under arbitrary resize/constraints.
- Accessibility semantics, readable contrast, and text scaling support.
- Keyboard, mouse, touch, and focus support where applicable.
- Unhandled error catching and network loss recovery.
- Controlled memory footprint and bounded startup time.

### Android
- System back gesture and modern Android predictive back via `PopScope`.
- Ephemeral UI restoration and durable data persistence across process death.
- Tested on representative low-memory/low-tier devices.
- System insets, notch, and software keyboard handling (`viewInsetsOf`).
- Verified release App Bundle (AAB) size.

### iOS / iPadOS
- Native interactive swipe-to-back navigation gestures.
- Modern `UIScene` lifecycle integration without deprecated AppDelegate assumptions.
- Correct `SafeArea` handling for Dynamic Island and home indicators.
- iPad external keyboard, trackpad, and mouse pointer testing.

### Web
- Clean URL synchronization, browser history (back/forward), and page refresh.
- Text selection via `SelectionArea` and platform context menus.
- Cross-Origin Resource Sharing (CORS) headers validated for assets and API calls.
- WebAssembly (Wasm) compatibility headers (`COOP`/`COEP`) verified if Wasm target is enabled.
- Startup payload size and deferred script chunking verified.

### Desktop (macOS, Windows, Linux)
- Smooth real-time window resizing across narrow, wide, and multi-monitor setups.
- Complete keyboard Tab traversal, clear visual focus rings, and standard shortcuts (Cmd/Ctrl+S, Enter, Escape).
- Hover states and right-click context menus.
- Responsive layout prioritizing multi-pane master-detail or navigation rails.

---

## 4. Common Anti-Patterns and Remediations

| Anti-Pattern | Why It Is Problematic | Preferred Production Response |
| :--- | :--- | :--- |
| **Huge eager widget lists** (`ListView(children: [...])`) | Instantiates, lays out, and paints hundreds of offscreen widgets eagerly, destroying memory and frame budgets. | Use `ListView.builder` or `SliverList.builder` for lazy, on-demand child construction. |
| **`shrinkWrap: true` everywhere** | Forces the scroll view to measure its entire content extent on every scroll delta, triggering repeated layout passes. | Provide explicit parent constraints using `Expanded`, `Flexible`, or combine into a single `CustomScrollView`. |
| **Nested same-axis `ListView`s** | Causes competing scroll gestures, unbounded height layout exceptions, and broken viewport physics. | Unify into a single `CustomScrollView` composing slivers, or use `NestedScrollView` for coordinated header collapsing. |
| **Expensive work inside `build()`** | Repeated on every single frame rebuild; blocks the UI thread and drops frames. | Initiate work in controllers/repositories; cache results and let `build()` strictly describe state. |
| **API calls directly in `build()`** (`FutureBuilder(future: api.fetch())`) | Every widget rebuild fires a brand new HTTP request, causing API spam, race conditions, and UI flicker. | Store the `Future` in state during `initState()`, or manage request lifecycles via a feature controller. |
| **Heavy JSON decoding on UI isolate** | Synchronous `jsonDecode()` blocks Dart event loop; freezes scrolling and animations. | Profile payload size; move parsing of proven heavy JSON payloads to background isolate via `Isolate.run`. |
| **Unbounded high-res image decoding** | Full-resolution decoded bitmaps consume dozens of megabytes of RAM per image, triggering GPU jank and OOM. | Constrain decode dimensions using `cacheWidth`, `cacheHeight`, `ResizeImage`, or server CDN query parameters. |
| **Undisposed controllers and subscriptions** | Leaks memory, keeps state trees alive in memory, and triggers callbacks after widget destruction. | Symmetrically cancel subscriptions, remove listeners, and call `dispose()` in `State.dispose()`. |
| **Unnecessary global state** | Couples independent features, widens rebuild boundaries, and obscures ownership. | Keep ephemeral state widget-local; keep feature state scoped to the feature lifecycle. |
| **Whole-page rebuild for tiny change** | Calling `setState()` at screen root or subscribing top-level widgets to high-frequency notifiers causes massive rebuild trees. | Localize state observation down to the leaf subtree via `ValueListenableBuilder`, `ListenableBuilder`, or selectors. |
| **Excessive intrinsic layout** (`IntrinsicHeight`) | Triggers speculative, multiple recursive layout passes down the entire subtree. | Use explicit constraints, flex proportions, or custom multi-child layout delegates. |
| **Excessive opacity, clipping, and filters** | `saveLayer` forces offscreen GPU render targets, multiplying memory bandwidth and compositing costs. | Use `FadeTransition` or color alpha instead of `Opacity`; use `Clip.hardEdge` or avoid clipping; minimize full-screen blur filters. |
| **Repaint boundaries everywhere** | Over-allocates compositing layers and GPU memory buffers with zero paint reduction benefit. | Add `RepaintBoundary` only across documented repaint-frequency boundaries verified with DevTools. |
| **"Always add `const`" folklore** | Treating `const` as a silver bullet for raster or layout jank distracts from actual pipeline bottlenecks. | Use `const` naturally for immutable compile-time constants; focus optimization effort on measured expensive subtrees. |
| **Keys everywhere** | Adding keys to arbitrary static widgets adds hash lookup overhead without improving performance. | Use keys only to preserve identity/state when reordering sibling collections or when reparenting. |
| **Premature caching** | Trading RAM for CPU without invalidation policies creates memory bloat and stale data bugs. | Cache only repeated expensive operations; define explicit scope, TTL, and bounded eviction policies. |
| **Premature isolates** | Isolate creation, memory copying, and port communication have non-trivial latency overhead. | Keep cheap transformations synchronous; spawn isolates only for measured CPU-heavy operations. |
| **Debug-mode performance judgments** | JIT compilation, assertions, and DevTools hooks distort runtime speeds by up to 10×. | Always profile in **profile mode** on physical hardware; validate final performance on release builds. |
| **Performance claims without profiling** | Guesswork and intuition lead to wasted engineering time and unhelpful complexity. | Follow the empirical loop: `measure → identify bottleneck → understand cause → change → measure again`. |

---

## 5. Architectural Decision Tables

### Table 1: Collection & List Implementation

| Scenario | Preferred Approach | Why |
| :--- | :--- | :--- |
| Small, static child set (< 10 items) | `ListView(children: ...)` | Simple, readable; eager instantiation cost is bounded and negligible. |
| Large, dynamic, or unbounded list | `ListView.builder` | Lazy, viewport-only child creation prevents memory bloat and layout overhead. |
| Large list with separators/dividers | `ListView.separated` | Built-in lazy row and separator construction with clear separation semantics. |
| Custom child reordering or complex delegates | `ListView.custom` / `SliverChildDelegate` | Grants direct control over child recycling, element caching, and index lookup. |
| Large grid collection | `GridView.builder` | Lazily constructs grid tiles within the active viewport. |
| Header + list + grid + footer in one view | `CustomScrollView` + slivers | Single coordinated viewport without nesting multiple independent scrollables. |
| Dynamic-height items inside a sliver view | `SliverList` / `SliverList.builder` | Standard lazy sliver list supporting variable item dimensions. |
| Known identical main-axis item extent | `itemExtent` / `SliverFixedExtentList` | Bypasses child layout passes purely to compute scroll geometry. |
| Items sharing extent of representative widget | `prototypeItem` / `SliverPrototypeExtentList` | Computes uniform scroll extent from a representative prototype widget. |
| Varied extents cheaply computable from data | `itemExtentBuilder` | Computes scroll offsets from data without laying out unrendered children. |
| Truly content-sized, tightly constrained nested list | `shrinkWrap: true` | Acceptable only when content is strictly bounded and must size parent container. |

### Table 2: State Scoping

| State Nature | Recommended Scope | Implementation Mechanism |
| :--- | :--- | :--- |
| Hover, expansion toggle, local password visibility | Widget-local | `StatefulWidget` with `setState()`, or `ValueNotifier`. |
| Screen workflow, pagination, form validation | Feature-scoped | View model / Controller (`ChangeNotifier`, Bloc, Riverpod). |
| Authenticated session, user theme, global settings | App / Session-scoped | Scoped repository / shared dependency injection provider. |
| Remote cached domain entities | Data / Repository layer | Local database (Drift, Hive) + Repository reactive streams. |
| Ephemeral row state in large scrolling feed | Local if cheap; Repository if durable | Local widget state for visual flickers; external store for edited draft data. |

### Table 3: Asynchronous Execution

| Work Character | Recommended Approach | Reason |
| :--- | :--- | :--- |
| Cheap data transformation (< 1–2 ms) | Synchronous Dart code | Zero coordination or isolate message-passing overhead. |
| Single network I/O or database query | `Future` with `async/await` | Non-blocking asynchronous I/O handled by Dart event loop. |
| Stream of sensor data, web sockets, DB updates | `Stream` | Idiomatic sequence of asynchronous events over time. |
| Heavy native CPU computation blocking frames | `Isolate.run` | Executes heavy CPU tasks in parallel without stalling UI isolate. |
| Small JSON payload (< 100 KB) | Main isolate `jsonDecode()` | Spawning isolates or port transfers costs more than synchronous decode. |
| Proven massive JSON payload (> 1–2 MB) | `Isolate.run` on native | Removes heavy parsing and model mapping from frame-producing isolate. |
| Substantial browser-side CPU computation (Web) | Web Workers / Chunking | Dart isolates on web compile to single-threaded event loop. |

### Table 4: Animation Mechanics

| Requirement | Recommended Approach | Reason |
| :--- | :--- | :--- |
| Simple transition between old & new value | Implicit animation (`AnimatedContainer`, `AnimatedOpacity`) | Minimal boilerplate; framework manages controller lifecycle automatically. |
| Coordinated, repeating, or gesture-coupled motion | Explicit controller (`AnimationController`) | Complete programmatic control over playback, curves, and listeners. |
| Static expensive child inside animated widget | `builder` API `child` parameter | Reuses identical static subtree; skips rebuilding on animation ticks. |
| Pure visual movement, rotation, or scaling | Paint transform (`Transform.scale`, `Transform.translate`) | Avoids triggering relayout passes across the animated widget and its ancestors. |
| High-frequency custom graphics (charts, particles) | `CustomPainter` with repaint `Listenable` | Paints directly on controller ticks, bypassing widget rebuild and layout. |
| Layout must reflow surrounding content | Explicit layout animation | Visual correctness requires layout reflow; cannot use paint transform shortcut. |

### Table 5: Layout Primitives

| Need | Prefer | Avoid |
| :--- | :--- | :--- |
| Linear horizontal or vertical alignment | `Row` / `Column` / `Flex` | Nested `IntrinsicHeight` or hardcoded screen coordinate positioning. |
| Consume remaining space along flex axis | `Expanded` (must fill) / `Flexible` (can fill) | Using `shrinkWrap: true` on child lists to silence unbounded height errors. |
| Adapt layout to parent dimensions | `LayoutBuilder` | Branching layout on physical device model names or OS types. |
| Long scrolling collection | Lazy `ListView.builder` | Eager `Column` wrapped in `SingleChildScrollView` for hundreds of items. |
| Composing headers, grids, and lists | `CustomScrollView` + slivers | Nesting multiple independently scrolling `ListView`s on the same axis. |
| Layered visual overlays | `Stack` with `Positioned` | Deeply nested negative-margin padding hacks. |
| Wrapping chips or tags across lines | `Wrap` | Huge eager `Wrap` containing thousands of dynamically generated children. |

### Table 6: Performance Bottleneck Diagnostics

| Observed Symptom | Primary Investigation Area | DevTools Tools |
| :--- | :--- | :--- |
| Slow UI / Dart frame times | Heavy `build()`, synchronous CPU blocks, intrinsics | Performance Timeline, CPU Profiler, Track Widget Builds. |
| Slow Raster / GPU frame times | Offscreen layers, `saveLayer`, high-res image buffers | Raster Timeline, Highlight Repaints, Layer Inspector. |
| Excessive widget rebuilds | Overly broad state notification scope, missing selectors | Track Widget Builds, DevTools Rebuild Counters. |
| Excessive layout passes | `shrinkWrap: true`, `IntrinsicHeight`, constraint churn | Track Layouts, DevTools Timeline Layout Events. |
| Unbounded memory growth | Retained closures, uncancelled listeners, memory bloat | Memory Heap Snapshots, Snapshot Diffing, Retaining Paths. |
| Slow cold startup | Synchronous pre-`runApp()` work, premature SDK init | Startup Timeline Traces, CPU Profiler on Launch. |
| Scrolling jank in image feeds | Unbounded image decode sizes, excessive filter effects | Memory Snapshot, Raster Timeline, Network view. |
| Duplicate API calls | HTTP requests triggered from `build()` methods | Network view (native) / Chrome DevTools Network (web). |
| Large application binary size | Unoptimized assets, unstripped debug symbols | `flutter build --analyze-size`, DevTools App Size tool. |
