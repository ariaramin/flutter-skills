# Flutter UI Performance Engineering

Validated against current Flutter documentation/API behavior on:

```text
2026-08-11
```

Primary documentation baseline:

```text
Flutter documentation reflecting Flutter 3.44.7
Flutter stable API documentation in the Flutter 3.44.x line
Dart documentation current to Dart 3.12.x
```

This skill is version-sensitive.

Always inspect the project's actual:

```text
flutter --version
dart --version
pubspec.lock
target platforms
rendering backend
minimum OS versions
```

before applying renderer-, scrolling-, or platform-view-specific advice.

---

# Purpose

This skill governs engineering decisions intended to maximize sustainable Flutter UI smoothness while preserving correctness, accessibility, battery life, memory bounds, and maintainability.

Use it to diagnose and optimize:

- dropped frames
- frame pacing
- input latency
- scrolling lag
- animation hitching
- route-transition stutter
- high UI-thread time
- high raster-thread time
- layout spikes
- paint spikes
- compositing spikes
- image decode/memory spikes
- allocation churn
- garbage-collection-related stalls
- platform-view composition
- startup-to-first-interactive-UI smoothness
- low-end hardware
- high-refresh hardware
- Web rendering
- desktop rendering
- Android/iOS rendering

The objective is:

```text
highest sustainable smoothness supported by the target hardware
```

not:

```text
a meaningless maximum FPS number
```

and not:

```text
a promise of literal zero jank on every OS/device/workload
```

---

# When to Use This Skill

Trigger this skill for tasks involving:

- UI jank
- low or unstable FPS
- dropped frames
- bad frame pacing
- laggy scrolling
- slow lists/grids
- route-transition hitching
- animation hitching
- expensive CustomPainter
- high UI time
- high raster time
- high GPU load
- full-screen blur
- excessive clipping
- large images
- image-list jank
- slow text-heavy layouts
- input latency
- keyboard-opening jank
- resize lag
- platform-view lag
- 90/120/144 Hz readiness
- low-end-device tuning
- memory-related performance degradation
- long-session slowdown
- performance architecture reviews
- invalid performance folklore

---

# Rule Language

- **MUST** — correctness/lifecycle or non-negotiable performance requirement.
- **SHOULD** — strong production recommendation.
- **MAY** — situational optimization.
- **UI-thread optimization** — reduces Dart/framework work.
- **Layout optimization** — reduces RenderObject layout/intrinsic work.
- **Paint optimization** — reduces recording/display-list work.
- **Raster/GPU optimization** — reduces scene raster/composition work.
- **Memory optimization** — reduces retained/decoded/allocation footprint.
- **Animation optimization** — reduces per-frame animation work.
- **Scrolling optimization** — reduces viewport child/layout/paint work.
- **Image optimization** — reduces decode/memory/upload work.
- **Concurrency optimization** — moves genuinely CPU-heavy Dart computation away from frame-critical execution.
- **Platform-specific optimization** — concerns renderer/native composition/browser behavior.

---

# Core Principles

1. **MUST measure before optimizing.**

2. **MUST separate UI-thread and raster-thread problems.**

3. **MUST reason in frame time, not average FPS.**

4. **MUST use the actual display refresh cadence rather than assuming 60 Hz.**

5. **MUST NOT use debug-mode timings as production evidence.**

6. **SHOULD profile in profile mode on representative physical hardware.**

7. **SHOULD verify final behavior in release builds.**

8. **MUST NOT confuse rebuild, relayout, repaint, and rasterization.**

9. **SHOULD keep rebuild scope proportional to the state that changed, but MUST NOT fear cheap rebuilds.**

10. **MUST keep expensive CPU work off the main/UI isolate when measurements show it exceeds frame budgets.**

11. **MUST remember that `async`/`await` does not move CPU work to another isolate.**

12. **SHOULD use lazy rendering for large collections.**

13. **SHOULD decode images near the resolution at which they are actually rendered.**

14. **SHOULD minimize intrinsic layout, shrink wrapping, and repeated layout in frame-critical paths.**

15. **SHOULD keep raster effects proportional to their visual value.**

16. **MUST NOT add `RepaintBoundary` blindly.**

17. **MUST NOT classify every `Opacity`, gradient, `Container`, or rebuild as expensive without measuring the mechanism.**

18. **SHOULD stop/mute invisible continuous animations.**

19. **MUST dispose UI resources according to their documented ownership.**

20. **MUST preserve accessibility; never disable semantics/text scaling/reduced-motion handling as a performance hack.**

21. **SHOULD optimize algorithmic complexity before object-level micro-optimizations.**

22. **SHOULD optimize p90/p99/worst frames and repeated spikes, not only averages.**

23. **SHOULD optimize idle efficiency as well as animation smoothness.**

24. **MUST NOT assume Impeller fixes arbitrary rendering problems.**

25. **MUST NOT recommend historical SkSL bundling on current Flutter.**

---

# Flutter Frame Pipeline

A simplified current frame path is:

```text
OS input / platform events
        ↓
Flutter scheduler receives vsync
        ↓
Transient callbacks
(AnimationController / Ticker)
        ↓
Dart UI isolate
        ↓
Build dirty Elements
        ↓
Layout dirty RenderObjects
        ↓
Paint / generate scene + layer tree
        ↓
Raster thread
        ↓
Impeller / Skia rendering work
        ↓
GPU
        ↓
Platform compositor
        ↓
Display presentation
```

Other important threads/resources:

```text
Platform thread
  -> host OS main thread
  -> plugin/native UI work
  -> platform views

I/O thread
  -> selected engine I/O work
  -> image-related/other expensive engine tasks

GPU
  -> executes graphics workloads submitted by renderer
```

The raster thread itself runs on CPU while coordinating graphics work with the GPU.

---

# Pipeline Consequence

UI and raster processing are pipelined.

Therefore:

```text
UI work
and
raster work
```

can overlap across frames.

This means:

```text
buildDuration + rasterDuration
```

is not a simple "must always be below exactly one frame" equation for frame throughput.

However:

- if UI consistently exceeds display cadence, UI becomes the throughput bottleneck;
- if raster consistently exceeds display cadence, raster becomes the throughput bottleneck;
- if `totalSpan` exceeds cadence, touch/input latency can increase even if pipelining prevents obvious dropped frames.

---

# Frame Budgets

Approximate display period:

```text
budget = 1000 ms / refresh rate
```

| Refresh rate | Approx. frame period |
|---:|---:|
| 30 Hz | 33.33 ms |
| 60 Hz | 16.67 ms |
| 75 Hz | 13.33 ms |
| 90 Hz | 11.11 ms |
| 120 Hz | 8.33 ms |
| 144 Hz | 6.94 ms |
| 165 Hz | 6.06 ms |
| 240 Hz | 4.17 ms |

Do not treat:

```text
16 ms
```

as a universal Flutter budget.

---

# Refresh Rate

The current engine API exposes:

```dart
FlutterView.display.refreshRate
```

through `dart:ui.Display`.

Refresh rate can differ:

- between devices
- between monitors
- after moving desktop windows
- under platform variable/adaptive refresh policies

Do not hardcode:

```text
device == iPhone => 120 Hz
```

or similar hardware assumptions.

---

# Frame-Time Targets

A production application SHOULD leave margin.

For a 120 Hz target, repeatedly finishing at:

```text
8.2 ms
```

is fragile.

A tiny CPU/GPU spike will miss cadence.

Prefer meaningful headroom on target low-percentile hardware.

There is no universal safe-margin percentage.

Measure the actual workload.

---

# Frame Pacing vs FPS

Average FPS can hide:

```text
8 ms
8 ms
8 ms
42 ms
8 ms
8 ms
```

The average can still look acceptable.

The user saw a hitch.

Track:

```text
long-frame percentage
dropped frames
buildDuration
rasterDuration
totalSpan
p90
p99
worst frame
```

rather than only average FPS.

---

# Production Frame Metrics

Current Flutter guidance recommends monitoring:

```text
average
p90
p99
worst
```

for build and raster duration.

For production telemetry, aggregate sampled `FrameTiming`.

Do not log every frame.

---

# Jank Classification

| Symptom | Likely bottleneck | First tool |
|---|---|---|
| UI bar over budget | Dart/build/layout/CPU | DevTools Performance + CPU profiler |
| Raster bar over budget | GPU/raster effects/images/paths | DevTools Performance |
| Both bars high | UI work may create complex scene; investigate UI first | Timeline |
| Scroll hitch only when new rows enter | build/layout/image decode | Track builds/layouts + image diagnostics |
| First transition hitch | image decode, first-use rendering, route construction | Timeline |
| Input feels delayed but animation looks smooth | pipeline latency / main-isolate work | `FrameTiming.totalSpan` |
| App degrades after minutes | leak, memory bloat, image cache, retained controllers | Memory view |
| Keyboard opening stutters | broad MediaQuery invalidation / heavy relayout | Track builds/layouts |
| Web resize lags | broad rebuild/layout/recomputation | Chrome Performance |
| Platform view transitions lag | composition/synchronization | platform-view profiling |
| 60 Hz fine, 120 Hz bad | smaller cadence budget | target 120 Hz profile |

---

# Required Performance Decision Tree

```text
UI feels janky
│
├── Reproduce in profile/release on target hardware
│
├── UI thread over budget?
│   │
│   ├── expensive build?
│   ├── broad state invalidation?
│   ├── expensive layout/intrinsics?
│   ├── synchronous CPU work?
│   ├── large collection processing?
│   ├── text shaping/layout?
│   ├── platform callback processing?
│   └── allocation/GC correlation?
│
├── Raster thread over budget?
│   │
│   ├── saveLayer?
│   ├── blur / BackdropFilter?
│   ├── opacity layer?
│   ├── clipping?
│   ├── shadows/elevation?
│   ├── oversized images?
│   ├── complex paths?
│   ├── excessive paint area/overdraw?
│   └── platform views?
│
├── Both within budget?
│   │
│   ├── totalSpan / input latency?
│   ├── network/backend latency?
│   ├── native/plugin stall?
│   ├── platform-view/native UI?
│   ├── event batching issue?
│   └── measurement artifact?
│
└── Change one dominant cause
    ↓
   re-profile
    ↓
   validate representative devices
    ↓
   release verification
```

---

# Profiling Workflow — HIGH PRIORITY

## Step 1 — Reproduce a deterministic scenario

Examples:

```text
open dashboard
scroll 30 rows
open detail route
return
repeat 5 times
```

Do not profile random manual behavior and compare unrelated traces.

---

## Step 2 — Use profile mode

Native:

```shell
flutter run --profile
```

Use a physical mobile device.

Mobile simulators/emulators are not representative enough for final performance measurements.

For Web:

```shell
flutter run -d chrome --profile
```

and use Chrome DevTools Performance.

For WebAssembly evaluation:

```shell
flutter run -d chrome --wasm --profile
```

where dependencies/browser support allow it.

---

## Step 3 — Capture a baseline

Before changing code:

- capture frame trace
- record p90/p99/worst frames
- note UI/raster slow frames
- record memory if relevant

Never optimize without a baseline.

---

## Step 4 — Select a slow frame

Inspect:

```text
UI duration
raster duration
Timeline
GC
build/layout/paint events
custom application events
```

---

## Step 5 — Enable enhanced tracing selectively

Available current tooling includes:

```text
Track Widget Builds
Track Layouts
Track Paints
```

These options can perturb frame times.

Use them diagnostically, not as your final benchmark recording.

---

## Step 6 — Correlate CPU

When UI time is high:

1. record CPU profile;
2. use Bottom Up for expensive leaf functions;
3. use Call Tree for expensive paths;
4. inspect self time vs total time;
5. identify your code before changing widget architecture.

---

## Step 7 — Test raster hypotheses

DevTools can temporarily disable:

```text
Clip layers
Opacity layers
Physical Shape layers
```

If raster time drops materially after one category is disabled, investigate that visual effect.

---

## Step 8 — Change one dominant mechanism

Do not simultaneously:

```text
change state management
reduce images
remove shadows
add repaint boundaries
rewrite list
```

because you will not know which change helped.

---

## Step 9 — Repeat identical trace

Compare:

```text
before p99
after p99

before slow-frame count
after slow-frame count

before memory
after memory
```

---

## Step 10 — Validate sustained load

Repeat for:

```text
30-60 seconds scrolling
multiple navigation cycles
large data set
keyboard open/close
rotation/resize
background/resume
```

when relevant.

---

## Step 11 — Validate low-end hardware

A developer flagship is insufficient.

Use the lowest realistic product hardware tier.

---

## Step 12 — Validate target high-refresh hardware

If product advertises 120 Hz smoothness, measure on 120 Hz hardware.

Do not infer it from 60 Hz traces.

---

# Performance Instrumentation

For application-specific CPU work, use current `dart:developer`:

```text
Timeline
TimelineTask
```

around operations such as:

```text
decode_dashboard_payload
build_chart_series
hydrate_large_document
```

Do not instrument every tiny function.

Instrumentation should isolate meaningful units of work.

---

# `FrameTiming`

Current Flutter API:

```text
SchedulerBinding.addTimingsCallback
```

is preferred over:

```text
PlatformDispatcher.onReportTimings
```

because multiple listeners can coexist.

Useful fields:

```text
buildDuration
rasterDuration
totalSpan
layerCacheBytes
pictureCacheBytes
```

Use aggregated/sampled production telemetry if the product needs real-device frame data.

Remove callbacks when their owner is disposed.

---

# Build Optimization

## Problem

Large or frequent `build()` work pushes UI-thread time over budget.

## Mechanism

Dirty Elements execute `build`.

The framework then updates child Elements.

A build can trigger later layout/paint, but rebuilding a widget does not inherently mean its RenderObject will relayout/repaint.

## Detection

Use:

```text
DevTools Track Widget Builds
CPU profiler
```

Look for:

```text
large build methods
many descendants rebuilt
expensive application functions inside build
```

## Fix

- move changing state closer to the UI that changes;
- remove expensive transformations from build;
- use stable children in builders;
- subscribe only to state actually required;
- split widgets by update responsibility;
- use `const` where naturally possible.

## Tradeoff

Over-fragmenting can harm readability and architecture.

Do not create dozens of tiny classes solely to reduce an already-cheap 0.1 ms build.

## Verification

Compare:

```text
UI frame time
build timeline events
CPU profile
```

before and after.

---

# `setState`

Current behavior:

```text
setState(callback)
 -> callback executes synchronously
 -> Element.markNeedsBuild()
```

Direct overhead is minimal.

The indirect subtree work is what matters.

---

# `setState` Rules

**SHOULD**:

```text
place State near the smallest independently changing subtree
```

**MUST NOT**:

```dart
setState(() {});
```

repeatedly in a tight loop.

Multiple calls for one State in one frame are redundant.

---

# High-Level State Anti-Pattern

Bad:

```text
AppStatefulWidget
  -> setState for one like button
  -> entire page/application subtree rebuilt
```

Preferred:

```text
LikeButtonState
  -> rebuild button/count only
```

unless the higher-level state change genuinely affects the whole page.

---

# State Management

Do not judge performance by package name.

These can all be fast or slow:

```text
setState
InheritedWidget
Provider
Riverpod
Bloc
Redux
ChangeNotifier
ValueNotifier
custom architecture
```

The mechanism that matters is:

```text
how many consumers are invalidated
+
what those consumers do
```

---

# Selectors / Granular Subscriptions

Use framework/state-management selector mechanisms when they:

```text
prevent meaningful expensive unrelated subtree work
```

Do not wrap every text widget in a selector because "selectors are faster."

Measure the saved work against increased architecture complexity.

---

# `const`

## Problem

The framework repeatedly encounters unchanged widget configuration.

## Mechanism

A reused identical widget instance can short-circuit much descendant update work.

`const` enables canonical/stable immutable widget instances where values are compile-time constants.

## Detection

Look at high-frequency parent builds with large truly-static subtrees.

## Fix

Use natural `const` constructors.

## Tradeoff

Usually negligible complexity.

## Verification

Only performance-test if the subtree was materially expensive.

---

# `const` Reality

`const` does **not** fix:

- raster blur
- image decode
- layout from changed constraints
- plugin stalls
- expensive parent CPU work
- list eagerness
- algorithmic O(N²) work

Do not spend hours adding `const` while a 50 ms JSON parse runs every frame.

---

# StatelessWidget vs StatefulWidget

Myth:

```text
StatelessWidget is inherently faster.
```

Reality:

The mutable-state ownership/lifecycle differs.

A StatefulWidget that builds once can be extremely cheap.

A StatelessWidget subscribed to frequently changing inherited state can rebuild constantly.

Choose based on lifecycle/state semantics.

---

# Widgets vs Helper Functions

Official Flutter guidance prefers reusable widgets over functions returning widgets because widgets provide:

- Element identity
- update boundaries
- const reuse
- dependency locality

But:

```text
function returning a Widget
```

is not automatically a performance bug.

Refactor when it improves:

```text
update granularity
identity
dependency scope
maintainability
```

not mechanically.

---

# Keys

Use keys to preserve correct identity.

Performance follows correctness.

---

# ValueKey

Use when identity derives from a stable value:

```text
database ID
row ID
tab identifier
```

Good default for reorderable collections.

---

# ObjectKey

Use when object identity itself defines child identity.

---

# UniqueKey

A fresh `UniqueKey` guarantees new identity.

Bad in rebuild hot paths when reuse/state preservation is intended:

```dart
Widget build(BuildContext context) {
  return ExpensiveRow(
    key: UniqueKey(),
  );
}
```

That intentionally prevents reuse.

---

# GlobalKey

Use when genuinely requiring:

- State lookup
- BuildContext lookup
- subtree reparenting across locations
- certain framework APIs that require it

GlobalKey reparenting is relatively expensive:

```text
deactivate subtree
+
rebuild inherited dependencies
```

Do not use GlobalKey as the default solution to state access.

Own GlobalKeys long-term.

Never recreate them from build.

---

# Keyless Reordered Lists

If rows reorder and contain state, give them stable keys.

Incorrect identity can cause:

```text
state attached to wrong row
recreated RenderObjects
animation/controller churn
```

Correctness comes first.

---

# Layout Optimization

Flutter's core layout model:

```text
constraints go down
sizes go up
parent sets position
```

Most normal layout is efficient.

Problems arise when architecture causes:

- repeated layout passes
- intrinsic measurement
- shrink wrapping
- huge child sets
- per-frame layout animation

---

# Intrinsic Layout

## Problem

`IntrinsicHeight` / `IntrinsicWidth` inside large/deep trees cause layout spikes.

## Mechanism

They perform speculative intrinsic measurement before final layout.

Worst-case intrinsic queries can become O(N²) through deep layout dependencies.

## Detection

Enable:

```text
Track Layouts
```

Look for:

```text
$runtimeType intrinsics
```

timeline events.

## Fix

Prefer:

- known dimensions
- fixed cell sizes
- normal constraints
- an anchor/prototype design
- custom layout only when justified

## Tradeoff

Fixed dimensions can reduce layout flexibility/accessibility.

Do not force fixed height if text scaling requires dynamic rows.

## Verification

Compare layout timeline duration and scroll-frame p99.

---

# `shrinkWrap`

## Problem

Large shrink-wrapped scrollables cost too much during scrolling.

## Mechanism

The scroll view's own extent depends on children and can change as scroll offset changes.

Flutter documents this as significantly more expensive than normal expansion.

## Detection

Search:

```text
shrinkWrap: true
```

especially with:

```text
ListView
GridView
nested scrolling
large data
```

## Fix

Prefer:

```text
bounded viewport
single CustomScrollView
sliver composition
```

## Tradeoff

Sliver composition can require architectural refactoring.

## Verification

Measure layout time during scroll.

---

# Nested Scroll Anti-Pattern

Bad:

```text
SingleChildScrollView
  Column
    ListView.builder(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics()
    )
```

for thousands of rows.

Preferred:

```text
CustomScrollView
  slivers:
    SliverToBoxAdapter(...)
    SliverList(...)
```

One viewport preserves lazy layout.

---

# LayoutBuilder

`LayoutBuilder` is not inherently slow.

It runs when layout-relevant constraints require the builder.

Use it when child configuration genuinely depends on local constraints.

Avoid deeply nesting many builders that each trigger expensive computations on continuous desktop resize.

---

# MediaQuery Granularity

Prefer:

```dart
MediaQuery.sizeOf(context)
MediaQuery.paddingOf(context)
MediaQuery.viewInsetsOf(context)
```

when only that aspect is needed.

`MediaQuery.of(context)` subscribes to all `MediaQueryData` changes.

This matters during:

- keyboard appearance
- orientation changes
- window resize
- accessibility changes

---

# Do Not Cache View Size Globally

Current docs explicitly discourage caching `MediaQuery.sizeOf`.

Sizes can change.

Desktop/Web multi-window/resize makes stale size assumptions particularly dangerous.

---

# Baseline Layout

Text baseline alignment can require baseline queries.

Do not avoid baseline alignment universally.

Only optimize it when Track Layouts/CPU traces show meaningful cost in repeated dense structures.

---

# Wrap / Stack / Flow / FittedBox

None is globally "slow."

Analyze mechanism:

```text
Wrap
 -> potentially many child placements

Stack
 -> layout all children

IndexedStack
 -> keeps/layouts all children, paints one

Flow
 -> custom paint-time positioning semantics

FittedBox
 -> transform/scale based on child sizing
```

Optimize based on actual child count and update rate.

---

# IndexedStack

Useful for preserving tab state.

Cost:

```text
all children retained
all children participate in Stack-style layout
only selected child painted
```

Do not use an IndexedStack with ten extremely heavy dashboards merely to avoid reconstructing them.

Balance:

```text
recreation latency
vs
memory/layout retention
```

---

# Paint Optimization

Rebuild ≠ repaint.

Relayout ≠ repaint.

Paint is invalidated through RenderObject painting state.

A widget can rebuild with no new paint if render configuration is unchanged.

An animated render object can repaint without rebuilding its widgets.

---

# `RepaintBoundary`

## Problem

A small frequently changing foreground causes a large stable expensive background to repaint.

## Mechanism

Without a paint boundary, repaint invalidation can propagate to a shared painting layer.

`RepaintBoundary` creates a separate composited layer.

## Detection

Use:

```text
repaint rainbow
Track Paints
raster timings
```

## Fix

Place a boundary at a natural asymmetric repaint boundary:

```text
static complex chart background
+
small animated marker
```

## Tradeoff

Additional:

```text
layers
raster-cache memory
compositing bookkeeping
```

If both sides repaint together, the boundary can add cost without reducing paint.

## Verification

Measure paint events and raster time.

---

# Repaint Rainbow

Enable via current Flutter inspector or:

```dart
debugRepaintRainbowEnabled = true;
```

Use only in debug diagnostics.

A region changing color frequently is not automatically a bug.

Animated regions are expected to repaint.

The question is:

```text
is more area repainting than necessary?
```

---

# `saveLayer`

## Problem

Offscreen-layer effects cause raster spikes.

## Mechanism

`saveLayer()`:

1. allocates/uses an offscreen render target;
2. redirects drawing;
3. may break GPU batching;
4. composites that result back.

Render-target changes are especially costly on tiled/mobile GPUs.

## Detection

Use:

```text
DevTools timeline
checkerboard offscreen layers
raster bars
```

## Fix

- remove unnecessary overlapping transparency;
- precompose static visuals where practical;
- use direct alpha for simple images/colors;
- eliminate unnecessary filters.

## Tradeoff

Sometimes `saveLayer` is required for correct blending.

Do not remove it if the visual result becomes mathematically wrong.

## Verification

Compare raster p90/p99.

---

# Opacity

Partial opacity:

```text
0 < opacity < 1
```

can require an intermediate buffer.

Opacity exactly:

```text
0
or
1
```

has fast paths.

Therefore:

```text
Opacity is always slow
```

is false.

---

# Opacity Alternatives

For a simple color:

Bad:

```dart
Opacity(
  opacity: 0.5,
  child: ColoredBox(
    color: Colors.red,
  ),
)
```

Prefer directly painting translucent color.

For one `Image`, prefer the image's own opacity mechanism where appropriate.

For animated general subtrees, `FadeTransition`/`AnimatedOpacity` avoid rebuilding the whole animation subtree manually, but the opacity composition itself can still have raster cost.

---

# Clipping

Current relative conceptual cost:

```text
Clip.none
    lowest clipping work

Clip.hardEdge
    simple hard clip

Clip.antiAlias
    antialiased edge

Clip.antiAliasWithSaveLayer
    antialias + offscreen layer
    most expensive
```

Use the lowest fidelity that meets visual correctness.

---

# Rounded Corners

Do not automatically wrap every rounded decoration in `ClipRRect`.

Many widgets/decorations can paint rounded geometry without clipping descendants.

Clip only when child content actually must be clipped.

---

# Blur — HIGH PRIORITY

## Problem

Scrolling/animation behind large blur has high raster time.

## Mechanism

Backdrop blur must sample/filter pixels from content behind the filter.

Cost grows with:

- filtered region
- blur radius/sigma
- number of filters
- how often backdrop changes
- pixel density

## Detection

Raster bar, layer diagnostics, disable filters experimentally.

## Fix

- clip backdrop filters to smallest necessary region;
- reduce sigma;
- avoid full-screen blur during fast scrolling;
- use `ImageFiltered` when only filtering a child;
- use `BackdropGroup` + `BackdropFilter.grouped` for shareable multiple backdrop filters.

## Tradeoff

Reduced visual fidelity/design richness.

## Verification

Compare raster p99 during the real scrolling/transition scenario.

---

# Shadows and Elevation

Large blurred shadows can be raster-heavy.

Risk increases with:

```text
large blur radius
large painted area
many simultaneous shadows
animated shadow geometry
```

Do not remove ordinary Material elevation without evidence.

Use DevTools' Physical Shape layer toggle to test whether this class of work matters.

---

# Gradients

Static gradients are not automatically a performance problem.

Do not replace a simple gradient with an image as a blind optimization.

Investigate when:

- full-screen gradient changes every frame;
- shader parameters change continuously;
- many layers overlap;
- gradient combines with blur/transparency.

---

# CustomPainter

For animation-driven canvas graphics, the current highest-efficiency framework pattern is:

```text
Listenable
   ↓
CustomPainter(repaint: listenable)
   ↓
paint directly
```

This bypasses build and layout for each animation tick.

---

# CustomPainter Rules

**SHOULD**:

- use a `repaint` Listenable for paint-only animation;
- keep immutable/static geometry cached where meaningful;
- reuse semantic inputs;
- minimize path complexity;
- constrain painting region;
- keep `saveLayer` rare;
- pair with RepaintBoundary only when repaint isolation is beneficial.

**MUST**:

- implement `shouldRepaint` according to actual visual input changes.

---

# `shouldRepaint`

Bad:

```dart
@override
bool shouldRepaint(covariant MyPainter oldDelegate) {
  return true;
}
```

if painter inputs are often identical.

Also bad:

```dart
return false;
```

when visual inputs changed.

Correct principle:

```text
new visual information differs from old
    -> true
otherwise
    -> false
```

Remember: even `false` does not guarantee paint is never called because parent/child/size invalidation can still require painting.

---

# Canvas Hot Paths

Within a high-frequency `paint()`:

Avoid when measurable:

- reparsing path data;
- rebuilding huge Paths;
- laying out unchanged text;
- allocating giant temporary collections;
- repeated image conversion;
- `saveLayer` for every primitive.

Do not micro-optimize a handful of tiny `Offset` allocations unless profiling shows allocation pressure.

---

# Text in CustomPainter

A retained `TextPainter` can reuse layout information when text and constraints remain compatible.

Text shaping is relatively expensive compared with simple line breaking.

If drawing hundreds of stable labels:

```text
cache laid-out TextPainters or equivalent prepared data
```

where maintainable and memory-bounded.

Dispose long-lived `TextPainter` instances when their owner is disposed.

---

# Animation Performance

Animation controllers produce values at the display's presentation cadence while active.

Current Flutter documentation notes typical rates around:

```text
60–120 values/second
```

depending on the device.

---

# AnimationController Lifecycle

Typical:

```text
initState
 -> create controller

dispose
 -> controller.dispose()
```

Use:

```text
SingleTickerProviderStateMixin
```

for one ticker.

Use:

```text
TickerProviderStateMixin
```

when multiple controllers are required.

---

# TickerMode

Widget-aware tickers stop producing values when their subtree's `TickerMode` is disabled.

Use this mechanism for hidden retained subtrees.

Do not manually run invisible animations.

---

# Transform vs Layout Animation

## Problem

Movement animation relayouts a large subtree every frame.

## Mechanism

Animating:

```text
width
height
padding
positioned layout constraints
alignment in layout
```

can call layout each frame.

Transform/paint translation can often reuse existing layout.

## Detection

Track Layouts during animation.

## Fix

When geometry does not genuinely need recomputation, prefer paint/compositing motion such as:

```text
SlideTransition
Transform.translate
Transform.scale
```

## Tradeoff

Transforms do not change layout/hit-test geometry in all the same ways as true layout changes.

Choose semantics correctly.

## Verification

Compare layout timeline and UI time.

---

# AnimatedPositioned Example

Current Flutter docs explicitly state:

```text
AnimatedPositioned
 -> relayout + repaint every animation frame

SlideTransition
 -> repaint-only for stable-sized child
```

Use `AnimatedPositioned` when size/layout genuinely changes.

Do not ban it.

---

# Implicit vs Explicit Animation

Myth:

```text
explicit AnimationController is always faster
```

False.

Performance depends primarily on:

```text
what changes each tick
and
how large the affected subtree is
```

Use implicit animation for simple state-to-state transitions.

Use explicit animation when needing:

- orchestration
- control
- interruption
- repeat/reverse
- shared progress

---

# AnimatedBuilder / ListenableBuilder

When builder-independent child content exists:

```dart
AnimatedBuilder(
  animation: animation,
  child: const ExpensiveStaticChild(),
  builder: (context, child) {
    return Transform.rotate(
      angle: animation.value,
      child: child,
    );
  },
)
```

The `child` subtree is built once instead of once per tick.

Apply when that subtree is meaningfully expensive.

---

# Infinite Animations

Every active ticker can schedule continuous work.

Examples:

```text
shimmer
loading pulse
ambient background
rotating decoration
particle system
```

Do not let dozens of offscreen/invisible independent animations run.

Prefer:

- finite animation;
- TickerMode;
- remove hidden widgets;
- shared animation only where semantically appropriate.

---

# Loading Skeletons and Shimmer

Do not animate 100 independent shimmer controllers.

Possible strategies:

```text
one shared progress animation
simple static skeletons
animate only visible placeholders
stop once content arrives
```

Profile raster impact of large animated gradients.

---

# Route Transitions

For smooth navigation:

- keep transition effects simple;
- avoid full-screen blur unless measured;
- avoid triggering large synchronous model processing as navigation begins;
- pre-resolve critical images when justified;
- avoid rebuilding unrelated application roots during route animation.

---

# Hero

Hero performance can suffer when:

- source/destination image needs decode during transition;
- child subtree is complex;
- transition coincides with heavy route initialization;
- large image is decoded far beyond displayed size.

Treat Hero as a transition plus all work happening around it.

Profile the exact route.

---

# Scrolling — HIGH PRIORITY

Large-scroll performance generally depends on:

```text
lazy construction
bounded child work
known extent where possible
correct image decode size
low per-row state churn
bounded keep-alive/cache
no expensive intrinsic layout
no per-pixel application CPU
```

---

# Lazy Lists

Use builder/delegate constructors for large collections:

```dart
ListView.builder(...)
GridView.builder(...)
SliverList(...)
SliverGrid(...)
```

Only visible and cache-region children are created/layout.

---

# Eager Lists

This is fine:

```dart
ListView(
  children: const [
    SettingsRow(...),
    SettingsRow(...),
    SettingsRow(...),
  ],
)
```

when there are eight fixed settings rows.

Do not mechanically use `ListView.builder` for every five-item list.

---

# Large List Anti-Pattern

Bad:

```text
SingleChildScrollView
  Column
    5,000 item widgets
```

Mechanism:

```text
eager widget creation
eager element/render objects
large layout
large memory
```

Preferred:

```text
SliverList/ListView.builder
```

---

# `itemExtent`

When every row has known main-axis extent:

```dart
ListView.builder(
  itemExtent: 72,
  itemCount: items.length,
  itemBuilder: ...,
)
```

lets scrolling machinery predict geometry without measuring each row.

---

# `prototypeItem`

Use when rows share an extent but deriving the numeric height manually would be brittle.

The prototype provides the extent.

---

# `itemExtentBuilder`

Current Flutter supports different known extents per index.

Useful when:

```text
row height known from metadata
without laying row out
```

Do not make the builder perform expensive calculations because it can be called repeatedly during layout.

---

# `scrollCacheExtent`

Current Flutter 3.44-era API:

```text
scrollCacheExtent
```

replaces deprecated:

```text
cacheExtent
```

Do not generate new code using the deprecated property.

---

# Scroll Cache Tradeoff

## Problem

Rows hitch into view because creation/decode starts too late.

## Mechanism

Cache region determines how far beyond visible viewport children are laid out.

## Detection

Trace build/layout spikes at viewport edges.

## Fix

Increase `scrollCacheExtent` modestly where it actually improves scrolling.

## Tradeoff

Larger extent means:

```text
more offscreen layout
more widgets retained
more images potentially loaded
more memory
more prework
```

## Verification

Measure scroll p99 and memory simultaneously.

---

# KeepAlive

By default, lazy lists use automatic keep-alive wrappers that respond to child requests.

Do not force:

```text
every list item keepAlive forever
```

unless state recreation is truly expensive.

Memory can become the new bottleneck.

---

# KeepAlive Decision

Keep an offscreen child alive when:

```text
its state is important
and
recreation is more costly/incorrect than retention
```

Examples:

```text
active editable field
rare expensive stateful editor
```

Do not keep a simple static card alive.

---

# Scroll Listeners

A `ScrollController` callback can fire at high frequency.

Bad:

```text
every scroll pixel
 -> sort list
 -> network call
 -> global setState
```

Preferred:

- derive small visual transforms;
- threshold state changes;
- debounce network/search work;
- start pagination near a meaningful boundary;
- use repaint-driven effects where appropriate.

---

# Parallax

For paint-only scroll effects, avoid rebuilding the entire page every scroll tick.

Localize:

```text
listener / animation
 -> transform only dependent element
```

Profile both UI and raster cost.

---

# Slivers

Use slivers when composing one scrolling experience containing:

```text
header
grid
list
footer
collapsing app bar
```

They preserve one viewport and lazy child construction.

Slivers are not "faster because they are slivers."

They are often the correct architecture because they avoid nested-scroll/shrink-wrap work.

---

# Pagination

Even lazy widgets cannot solve:

```text
10 million model objects already loaded
huge JSON already parsed
huge in-memory list transformations
```

Use data pagination/incremental loading in addition to view virtualization.

---

# Table / Data Grid

For thousands of rows/columns:

- virtualize;
- paginate where appropriate;
- avoid constructing every cell;
- use known dimensions when possible;
- avoid intrinsic sizing across the entire dataset;
- limit expensive per-cell widgets.

Horizontal + vertical scrolling multiplies layout complexity.

---

# PageView / Tabs

Use lazy page construction when many pages exist.

A regular `PageView` with an explicit small page list is fine.

A large page set should use:

```text
PageView.builder
```

---

# Hidden Tabs

Avoid:

```text
IndexedStack with 12 continuously animating dashboards
```

unless retention is required.

If keeping hidden pages alive, ensure their tickers are muted.

---

# Images — HIGH PRIORITY

Decoded image memory is approximately:

```text
width × height × bytes-per-pixel
```

For typical RGBA8888:

```text
≈ width × height × 4
```

Example:

```text
4000 × 3000 × 4
≈ 48,000,000 bytes
≈ 45.8 MiB
```

Compressed JPEG size can be 2 MB while decoded memory is ~46 MiB.

---

# Oversized Image Problem

## Problem

A 4000 px photo is displayed as a 100 px thumbnail.

## Mechanism

The engine stores decoded pixels, not only compressed source bytes.

Large decoded images consume memory/cache space and can create decode/upload pressure.

## Detection

Use Flutter Inspector:

```text
Highlight oversized images
```

or:

```dart
debugInvertOversizedImages = true;
```

in debug.

## Fix

Prefer source/CDN resize.

Otherwise native platforms can use:

```text
cacheWidth
cacheHeight
```

close to required physical-pixel dimensions.

## Tradeoff

Too-small decode sizes blur when displayed larger.

## Verification

Measure Memory view + scroll frame timings.

---

# Decode Target Formula

Engineering starting point:

```text
target physical width
≈ logical display width × device pixel ratio
```

Do not blindly use logical width as decode width on a 3× screen if full sharpness is needed.

Also do not decode 4× beyond the maximum actual presentation requirement.

---

# Web Decode Caveat

Current Flutter Web network-image implementation ignores:

```text
cacheWidth
cacheHeight
```

because browser image decoding does not support Flutter's custom decode-size hint in that path.

For Web:

- serve appropriately sized responsive assets;
- use CDN resize variants;
- reduce source dimensions.

---

# Image Layout Stability

Give images:

```text
width/height
or
tight constraints/aspect ratio
```

so layout does not jump when intrinsic image dimensions arrive.

This improves visual stability and reduces avoidable relayout.

---

# ImageCache

Current default framework cache:

```text
LRU
up to 1000 entries
up to 100 MB
```

Do not increase these limits as a default optimization.

---

# Image Cache Tuning

## Problem

Measured image-cache thrash repeatedly decodes important images.

## Mechanism

Images larger than cache policy or churned out by other images are decoded again.

## Detection

Memory/image traces and repeat transition timings.

## Fix

First:

- resize images correctly;
- reduce unnecessary unique images;
- limit precaching.

Only then consider changing `maximumSizeBytes`.

## Tradeoff

Larger cache:

```text
higher retained memory
higher OS pressure
potential OOM
less memory for Dart/GPU
```

## Verification

Measure both re-decodes and RSS/heap.

---

# `precacheImage`

Use when a known next interaction benefits:

```text
hero destination image
next onboarding page
next gallery item
```

Do not precache:

```text
entire 500-photo gallery
```

Flutter explicitly warns that pinning many/large images can cause OOM termination.

---

# Network Images

Network latency does not itself create frame jank if the event loop is free.

Jank occurs when response/decode/render handling creates large synchronous work or layout/paint changes.

Remember:

```text
Flutter ImageCache != persistent disk HTTP cache
```

Do not assume core Flutter gives offline disk caching.

---

# HTML Element Web Images

Current `Image.network` can use HTML-element strategy for certain CORS cases.

That becomes a platform-view-like element and carries documented performance/feature limitations.

Prefer normal Flutter image rendering when your server can provide correct CORS.

---

# Animated Images

Large GIF/WebP-style frame animations can cause:

- repeated frame decode;
- larger memory;
- continuous raster work.

Do not assume a compressed animated asset is cheap because its file is small.

Profile representative assets.

---

# Text Performance

Normal Text is generally efficient.

Text becomes significant when there is:

- extremely large text;
- many labels per frame;
- repeated custom TextPainter layout;
- complex RichText spans;
- frequent constraint changes;
- large dynamic charts/tables.

---

# TextPainter

Current `TextPainter.layout()` caches compatible layout.

Do not invalidate/recreate a large number of text paragraphs in every `paint()` call when inputs are unchanged.

For stable custom-painted text:

```text
prepare/layout only when text/style/constraints change
paint many times
```

---

# Font Guidance

Do not load dozens of unused custom font families/weights.

Benefits are primarily:

```text
bundle/Web download size
asset management
```

Do not claim ordinary use of several fonts is inherently a runtime jank problem without profiling.

---

# CPU Work on the Main Isolate

These are common frame killers when large:

```text
JSON decoding
sorting
regex over huge data
compression
encryption
PDF generation
image processing
large CSV parsing
large collection mapping
cryptographic work
database result transformation
chart point processing
```

---

# Expensive Work in `build()`

MUST NOT perform:

```text
network request
database query
filesystem operation
large JSON parse
large sort
large regex scan
image byte conversion
expensive date parsing over thousands of items
```

from `build()`.

`build()` can be called every frame.

---

# Collection Hot Paths

Before using isolates, fix complexity.

Bad:

```text
for each item:
   scan every other item
```

O(N²)

is often much worse than:

```text
build index/map once
then O(1)/O(logN) lookup
```

Algorithmic improvement dominates object-allocation micro-tuning.

---

# Derived State

Compute expensive derived state when source changes, not every widget build.

Good candidates:

```text
sorted/filter result for 20k rows
aggregated chart series
search index
expensive date grouping
```

Do not memoize:

```text
a + b
string.isEmpty
simple color choice
```

without reason.

---

# Async Does Not Mean Off-Main-Isolate

This:

```dart
await expensiveCpuFunction();
```

does not automatically move the function.

If the function executes synchronous Dart CPU work, it still blocks that isolate until complete.

`await` helps asynchronous waiting.

It does not create parallel CPU execution.

---

# Isolates

## Problem

CPU computation blocks the UI isolate for multiple milliseconds and causes long frames/input delay.

## Mechanism

Native Dart isolates execute independently with isolated memory.

## Detection

CPU profiler shows one synchronous application function spanning slow UI frames.

## Fix

First reduce work.

Then consider:

```dart
Isolate.run(...)
```

or:

```dart
compute(...)
```

for self-contained CPU-heavy tasks.

## Tradeoff

Costs include:

```text
isolate startup
message transfer
serialization/copying
architecture complexity
memory
```

## Verification

Confirm UI frame p99 improves and total task latency remains acceptable.

---

# `Isolate.run`

Good for one-shot computational work.

For repeated expensive jobs, a long-lived isolate may avoid repeated startup overhead.

Do not create one isolate per tiny calculation.

---

# Transfer Costs

Messages between isolates generally require copying/transfer semantics.

Very large data can erase the benefit of parallelism.

`Isolate.run` can transfer its final result through isolate exit semantics efficiently in supported cases.

For large typed data, investigate current transferable-data APIs only when measurements justify them.

---

# Isolate Limitations

Spawned isolates cannot perform Flutter UI work.

Do not attempt:

```text
build widgets
Canvas painting
dart:ui rendering
rootBundle UI access
```

inside a generic worker isolate.

Plugin use in background isolates also has specific limitations.

---

# Flutter Web Concurrency

Current Flutter Web does not support Dart isolates.

On Web:

```dart
compute(...)
```

runs on the main event loop.

Do not tell an AI agent:

```text
use compute() to move Web JSON parsing off main thread
```

because that is currently false.

If Web CPU parallelism is essential, Web Workers require a separate Web-specific architecture.

---

# Garbage Collection and Allocation

Frequent GC events are not automatically bad.

Flutter DevTools explicitly notes that GC can occur during idle time without performance impact.

Investigate only when:

```text
GC aligns with slow frames
heap grows unexpectedly
RSS grows
large temporary allocations repeat in hot paths
retaining paths reveal leaks
```

---

# Allocation Rules

Do not micro-optimize every small temporary Dart object.

Do optimize:

```text
megabyte buffers per frame
new 100k-element list per frame
repeated huge string building
large matrix/path creation in hot loops
large decoded image churn
```

---

# Memory and Long-Session Jank

Memory bloat can lead to:

```text
more cache eviction
re-decoding
more GC pressure
OS pressure
process termination
GPU resource churn
```

Short benchmark traces may miss this.

Run repeated navigation/scroll scenarios while monitoring memory.

---

# Memory View Workflow

Use:

```text
Memory chart
Profile Memory
Diff Snapshots
Trace Instances
retaining paths
```

Scenario:

1. snapshot;
2. open/close route 20 times;
3. force/observe GC where tooling allows;
4. snapshot;
5. diff;
6. inspect retained controllers/listeners/images.

---

# Resource Lifecycle

Review ownership for:

```text
AnimationController
ScrollController
TabController
PageController
FocusNode
TextEditingController
ChangeNotifier
StreamSubscription
ValueNotifier
Timer
OverlayEntry
custom listeners
ImageStream listeners
TextPainter if retained
```

Dispose only when **your code owns** the resource.

Do not dispose controllers provided by a parent unless API ownership says you should.

---

# Leaks

Common long-session leaks:

```text
listener added in initState, never removed
new stream subscription per navigation
OverlayEntry never removed
timer retaining State
controller retained by singleton
BuildContext retained in long-lived closure
```

Memory leaks are performance and correctness problems.

---

# FutureBuilder

Bad:

```dart
FutureBuilder<Data>(
  future: fetchData(),
  builder: ...,
)
```

when `fetchData()` creates a new Future on every build.

Parent rebuild can restart the asynchronous task.

Own the Future earlier:

```text
initState
didUpdateWidget when input changes
controller/repository state
```

---

# StreamBuilder

Same principle:

```text
do not create expensive/new Stream in build
```

unless restarting it every rebuild is intended.

Own stream lifecycle outside build.

---

# Input and Gesture Performance

Pointer move/drag callbacks can fire frequently.

Do not perform:

```text
large sort
JSON parsing
sync IO
platform-channel roundtrip
global rebuild
```

on every pointer event.

---

# Input Latency

Input can feel delayed even when average FPS seems acceptable.

`FrameTiming.totalSpan` captures pipeline latency beyond just build/raster throughput.

Long synchronous Dart work also delays event handling before the next frame.

Optimize responsiveness, not only visual FPS.

---

# Debounce / Throttle

Appropriate for:

```text
network search requests
analytics
resize-driven backend work
hover-driven heavy data lookup
scroll pagination
```

Do not throttle core animation values arbitrarily; animations should remain vsync-driven.

---

# Keyboard Opening

Keyboard changes:

```text
viewInsets
available size
layout
possibly MediaQuery
```

A broad dependency on:

```dart
MediaQuery.of(context)
```

can rebuild more UI than necessary.

Prefer:

```dart
MediaQuery.viewInsetsOf(context)
```

when only keyboard insets matter.

Also investigate:

- huge form relayout;
- nested scrollables;
- AnimatedPadding over an entire expensive page.

---

# Forms

For large forms:

- localize field state;
- avoid validating every field on every keystroke unless required;
- do not rebuild entire form because one field changes;
- dispose owned controllers/focus nodes;
- virtualize extremely large/generated forms where appropriate.

---

# Platform Channels

Platform channel calls are asynchronous from Dart's perspective, but values are encoded/decoded and native method invocation occurs on platform-side threading rules.

---

# High-Frequency Platform Channel Anti-Pattern

Bad:

```text
every animation frame
 -> MethodChannel.invokeMethod(...)
```

Mechanism:

```text
message serialization
engine dispatch
platform thread work
response serialization
```

Preferred:

- send semantic state changes;
- batch samples;
- move high-rate work into one side of the boundary;
- use texture/native-rendering integrations designed for continuous media where appropriate.

Measure before building custom codecs.

---

# Network Callbacks

Network latency is not frame rendering cost.

But this can be:

```text
HTTP response arrives
 -> decode 5 MB JSON synchronously
 -> map 100k objects
 -> global state update
 -> huge rebuild
```

Separate:

```text
backend latency
response CPU processing
UI invalidation
```

---

# Database Results

Even if the database query itself happens off the UI isolate/native layer, processing 50,000 result objects synchronously in Dart can jank.

Use:

- pagination;
- limited projections;
- incremental rendering;
- indexed/efficient queries;
- bounded model transformation.

---

# Platform Views — HIGH PRIORITY

Platform views embed native UI into Flutter's scene.

They are not normal Flutter render objects from a performance perspective.

---

# Android Platform Views

Current Flutter 3.44 documentation describes:

### Texture-layer composition

Benefits:

```text
good Flutter performance
Flutter transforms
```

Tradeoffs:

```text
can jank during quick scrolling
some native-view fidelity/accessibility limitations
```

### Hybrid Composition

Benefits:

```text
native fidelity
```

Tradeoffs:

```text
thread synchronization/merging
potential Flutter FPS degradation
older Android extra graphics copies
```

### HCPP

Current status:

```text
experimental
Flutter 3.44+
Android API 34+
Vulkan
Impeller
```

Do not automatically enable experimental HCPP in production without compatibility testing.

---

# Platform View Animation Strategy

When a complex route animation around a native view is slow, Flutter docs suggest considering:

```text
temporary screenshot/texture placeholder
during Flutter animation
```

rather than continuously compositing the live platform view.

Use only if the UX tolerates temporarily noninteractive native content.

---

# iOS Platform Views

iOS platform views have composition limitations.

Current docs specifically note:

```text
ShaderMask unsupported
ColorFiltered unsupported
BackdropFilter limitations
```

Test complex overlays/route transitions on physical devices.

---

# macOS Platform Views

Native view graphics execute on platform thread and require synchronization with Flutter's raster work.

Blocking platform thread can therefore affect combined frame performance.

---

# Impeller

Current platform state:

| Platform | Current status |
|---|---|
| iOS | Impeller is the only supported renderer |
| Android API 29+ | Impeller enabled by default |
| Android lower API / no Vulkan | falls back to legacy OpenGL renderer |
| Web | Skia-based Web renderers, not Impeller |
| macOS | Impeller currently opt-in/preview |
| Windows/Linux | verify current renderer for installed Flutter version |

---

# What Impeller Changes

Impeller:

- uses a smaller shader set;
- precompiles shaders/reflection at engine build time;
- builds pipeline state predictably;
- uses modern APIs such as Metal/Vulkan where available;
- improves historical first-use shader predictability.

---

# What Impeller Does NOT Fix

Impeller does not make these free:

```text
huge blur
too many paths
100 MB decoded images
O(N²) layout
main-isolate parsing
overdraw
platform-view synchronization
too many layers
infinite animation load
GPU saturation
```

---

# Shader Compilation Guidance

Historical Flutter advice often said:

```shell
--cache-sksl
```

and bundled captured SkSL shaders.

Current Flutter tooling removed SkSL bundling in Flutter 3.32.

Do not generate that workflow for current projects.

---

# Shader Jank Today

Shader compilation can still be relevant when:

- running renderer paths that still compile shaders at runtime;
- Web/Skia behavior;
- Android renderer fallback;
- custom rendering/pipeline behavior.

Use current DevTools dark-red shader markers and installed renderer behavior.

Do not apply historical mobile warmup recipes globally.

---

# Web Performance

Current Flutter Web renderers:

```text
CanvasKit
skwasm
```

The historical HTML renderer is not the current decision point.

---

# Default Web Build

```shell
flutter build web
```

uses CanvasKit.

CanvasKit adds its Skia WebAssembly payload.

---

# WebAssembly Build

```shell
flutter build web --wasm
```

makes `skwasm` available with CanvasKit fallback.

Current Flutter docs state `skwasm` can provide noticeably better startup/frame performance.

---

# Multi-Threaded skwasm

For rendering on a separate worker, the server/browser must support required:

```text
SharedArrayBuffer security configuration
```

Without that, skwasm can operate single-threaded.

Do not assume `--wasm` automatically means multithreaded rendering in every deployment.

---

# Web Performance Decision

## Problem

Complex Flutter Web app is frame-bound.

## Mechanism

Renderer/build mode changes startup/runtime execution architecture.

## Detection

Chrome DevTools Performance.

## Fix

If dependencies and browser matrix support it:

```shell
flutter build web --wasm
```

and configure deployment headers for the intended multithreaded mode.

## Tradeoff

Package/browser compatibility must be validated.

## Verification

Compare:

```text
startup
long-frame rate
scroll/animation traces
browser matrix
```

---

# Web Images

Because browser decode ignores Flutter `cacheWidth/cacheHeight` for network images:

- serve appropriately sized files;
- use CDN transforms;
- avoid enormous originals for thumbnails.

---

# Web CPU Concurrency

`compute()` does not offload work from the Web UI event loop.

For heavy Web CPU:

- first reduce work;
- incrementalize if possible;
- investigate Web Worker architecture if necessary.

---

# Web Resize

Continuous desktop browser resize can generate frequent:

```text
MediaQuery/constraint changes
build
layout
paint
```

Do not perform heavy application data transformation inside responsive builders.

Keep responsiveness calculations simple.

---

# Android Performance

Current concerns:

- device/GPU diversity;
- Impeller Vulkan support/fallback;
- high-refresh screens;
- platform-view composition;
- decoded-image memory;
- thermal constraints;
- large raster effects.

Test both:

```text
modern flagship
lowest realistic support tier
```

---

# iOS Performance

Current iOS uses Impeller.

Still test:

- ProMotion/high-refresh devices;
- older supported devices;
- large decoded images;
- platform views;
- route transitions;
- blur/material effects.

"Impeller" is not equivalent to "automatically 120 FPS."

---

# Desktop Performance

Desktop can expose different pressure:

```text
4K/5K window
large paint surfaces
144/165/240 Hz monitor
continuous mouse/trackpad events
resizing
multiple panels
long-lived memory
```

A design that is easy at:

```text
390 × 844 logical pixels
60 Hz
```

can become expensive at:

```text
large desktop viewport
144 Hz
```

because both painted area and cadence change.

---

# High Refresh Rate

## 120 Hz Readiness

Frame period:

```text
~8.33 ms
```

Review:

- no heavy per-frame layout;
- no large sync CPU in gesture/animation callbacks;
- images decoded near target;
- scroll rows bounded;
- blur/paths/elevation measured;
- no unnecessarily broad rebuilds;
- platform views tested;
- no first-use image/route work coinciding with transitions;
- p99 below target with margin.

---

# 144 Hz Readiness

Frame period:

```text
~6.94 ms
```

The same UI may need reduced visual complexity compared with its 60 Hz mode if the product insists on sustaining 144 Hz.

Do not degrade functionality to chase the number.

Prioritize smooth input/scrolling and meaningful animation.

---

# Variable Refresh

Do not force invisible work to "maintain max refresh."

If screen is static:

```text
no frames need to be scheduled
```

Idle is efficient.

Higher FPS is useful when motion exists.

---

# Low-End Device Strategy

Prefer robust defaults:

- lazy collections;
- bounded images;
- no huge full-screen blur;
- simple route transitions;
- finite decorative animation;
- bounded cache;
- minimal retained hidden pages;
- algorithmically efficient data processing.

Avoid brittle hardware scoring systems.

A UI that naturally scales is better.

---

# Adaptive Quality

MAY reduce nonessential visual density when:

```text
measured constraints justify it
```

Examples:

- fewer particles;
- smaller chart point density;
- less blur;
- fewer decorative shadows;
- static loading placeholders.

Do not remove accessibility or business functionality.

---

# GPU Overdraw

Overdraw occurs when the same pixels are drawn repeatedly.

Potential causes:

```text
stacked full-screen backgrounds
large translucent overlays
blur
multiple full-screen gradients
large semi-transparent decorations
particle layers
```

Do not hunt overdraw before confirming raster bottleneck.

---

# Offstage

`Offstage`:

- lays out the child;
- does not paint it;
- does not hit test it;
- leaves animations active.

Therefore it is not a generic performance optimization for hidden heavy UI.

---

# Visibility

Default hidden `Visibility` removes/replaces the child.

Maintaining:

```text
state
animation
size
```

retains progressively more work/resources.

Current docs explicitly say maintaining animation is more expensive than merely maintaining state.

---

# TickerMode for Hidden Content

If a hidden subtree must remain alive:

```dart
TickerMode(
  enabled: isVisible,
  child: retainedPage,
)
```

can mute widget-aware animations.

Do not assume all timers/custom loops obey TickerMode.

---

# Loading and Startup Smoothness

Startup performance is distinct from steady-state rendering.

Review:

```text
work before runApp
initial widget construction
first layout
first image decode
font loading
plugin startup
initial data processing
```

---

# First Frame

Current Flutter metric:

```text
WidgetsBinding.instance.firstFrameRasterized
```

indicates the first Flutter frame was rasterized.

Do not confuse:

```text
first frame
```

with:

```text
fully interactive content
```

if significant work continues immediately afterward.

---

# Startup Rules

- minimize synchronous work before first frame;
- do not build an enormous initial hidden navigation tree;
- avoid decoding unneeded galleries at startup;
- defer optional data;
- ensure first Flutter screen is lightweight;
- profile startup separately.

---

# Prefetching

Prefetching can improve perceived latency.

Cost:

```text
network
memory
decode
CPU
```

Use bounded prediction:

```text
next route's hero
next page
small critical asset set
```

Do not preload the whole application.

---

# Navigation Preloading

Do not construct every possible route at startup.

Preload only high-probability assets/data when measured navigation latency justifies memory/network cost.

---

# Focus / Keyboard / Forms

Large form jank commonly comes from:

```text
global form rebuild on each keystroke
expensive validation
keyboard-triggered full-page relayout
many retained controllers
```

Localize validation/state and inspect layout timeline.

---

# Charts

For charts:

- reduce point count when extra points are visually indistinguishable;
- avoid recreating complete series on unrelated state;
- cache expensive coordinate transformation until data/viewport changes;
- use paint-driven animation;
- minimize text labels;
- profile path complexity.

Do not reduce data fidelity when precise interaction requires it.

---

# Canvas / Particle Effects

Particle workload roughly grows with:

```text
active particle count
×
simulation work
×
draw complexity
×
lifetime
```

Use finite, bounded effects.

Do not render thousands of decorative particles forever behind normal app UI.

---

# SVG / Vector-Like Graphics

Generic rules:

- parse static vector descriptions once;
- avoid reconstructing huge Paths per frame;
- simplify invisible geometry;
- consider raster assets where content is static and scaling requirements allow;
- profile before converting everything to bitmaps.

Do not claim vectors are always slower than raster images.

---

# Video and Maps

Video/platform textures can already consume substantial compositor/GPU bandwidth.

Combining:

```text
video
+
full-screen blur
+
translucent route transition
+
particle overlay
```

can exceed raster budget.

Profile the combined scene.

---

# Logging

Do not log per animation/scroll frame.

Bad:

```dart
controller.addListener(() {
  debugPrint('${controller.value}');
});
```

in performance-sensitive runs.

Logging can distort debug/profile timing and flood I/O/console pipelines.

Use targeted sampled instrumentation.

---

# Theme and Locale Changes

Theme/locale changes legitimately rebuild dependent UI.

Do not fight correct dependency invalidation.

Optimize expensive work inside those rebuilds instead.

---

# Accessibility

Always validate performance with:

- larger text scaling;
- screen-reader semantics where relevant;
- reduced-motion setting;
- larger touch targets.

Do not "optimize" by removing semantics or disabling text scaling.

---

# Reduced Motion

Decorative infinite/large animation SHOULD respond to:

```dart
MediaQuery.disableAnimationsOf(context)
```

with:

- no animation;
- reduced animation;
- static equivalent.

This improves both accessibility and unnecessary rendering cost.

---

# Semantics

Lazy scrollables also bound semantics work naturally.

For custom canvas widgets, create appropriate semantics without rebuilding enormous semantic trees every animation tick when semantic meaning is static.

Do not suppress required semantics for performance.

---

# CPU vs Raster Examples

### Slow build + cheap raster

```text
sort 20k items every frame
simple white page
```

Fix Dart/data architecture.

### Cheap build + slow raster

```text
static widget config
fullscreen animated blur
```

Fix rendering effect.

### Both slow

```text
rebuild huge chart
regenerate 10k path
draw 10k path
```

Start with UI-side algorithmic work, then raster complexity.

---

# Performance Rules — HIGH PRIORITY

## Build

- no network/database calls in build;
- no heavy sorting/parsing in build;
- localize changing state;
- use stable Future/Stream identity;
- use `const` naturally;
- use specific MediaQuery aspect APIs;
- keep builder-independent child content stable.

## Layout

- avoid intrinsic passes in hot/large trees;
- avoid large `shrinkWrap` scrollables;
- use known item extents when semantically correct;
- use one sliver viewport instead of nested scroll hacks;
- avoid layout-affecting animation when a transform provides correct semantics.

## Paint

- drive paint-only animation through `CustomPainter.repaint` when appropriate;
- implement `shouldRepaint` correctly;
- isolate repaint only where repaint frequency differs;
- avoid repeated path/text preparation.

## Raster

- minimize `saveLayer`;
- bound blur regions;
- avoid giant animated shadows;
- minimize complex clipping;
- remove unnecessary partial-opacity groups;
- control path/particle count;
- monitor platform-view composition.

## Scroll

- lazy build large collections;
- paginate data;
- bound keep-alive;
- tune `scrollCacheExtent` only from evidence;
- resize list images;
- avoid expensive per-scroll callbacks.

## Images

- decode near rendered physical resolution;
- size source assets appropriately;
- use image-cache defaults until evidence says otherwise;
- precache narrowly;
- prevent layout jumps.

## Animation

- dispose controllers;
- stop hidden/infinite effects;
- keep static child outside animated builders;
- use transforms for motion where layout semantics need not change;
- test high-refresh target hardware.

## CPU

- fix algorithmic complexity;
- move measured CPU-heavy native tasks to isolates;
- remember Web isolate limitation;
- do not perform CPU-heavy work in input callbacks.

## Memory

- monitor long sessions;
- dispose owned resources;
- bound images/cache;
- avoid retaining all tabs/list rows;
- reduce giant temporary buffers.

## Platform

- test platform views explicitly;
- understand current Impeller status;
- do not use old SkSL recipes;
- use current Web renderer guidance;
- validate release behavior.

---

# Performance Myths

| Myth | Verdict | Reality |
|---|---|---|
| "`const` fixes jank" | False | Helps unchanged widget reuse; cannot fix layout/raster/CPU/image problems |
| "`Container` is slow" | Mostly false | It composes conveniences; use specialized widgets for clarity, not as primary optimization |
| "`SizedBox` is always faster than Container" | Misleading | Avoid unused Container features, but difference is rarely dominant |
| "StatelessWidget is faster than StatefulWidget" | False | Update frequency/work matters, not class label |
| "Functions returning widgets are always bad" | False | Dedicated widgets provide better identity/dependency boundaries, but helper functions aren't automatically janky |
| "`setState` is slow" | False | Direct call is cheap; affected subtree work can be expensive |
| "Rebuilds are bad" | False | Flutter is designed for rebuilds; expensive/broad work is bad |
| "Provider is slow" | Unsupported claim | Invalidation granularity and consumer work matter |
| "Bloc/Riverpod/GetX guarantees speed" | False | Architecture can still rebuild too much or do heavy work |
| "`RepaintBoundary` always helps" | False | Can add layers/memory with no saved repaint |
| "`Opacity` is always expensive" | False | 0/1 fast paths; partial grouped opacity can be expensive |
| "Never clip" | False | Clip when correct; choose least costly adequate mode |
| "Gradients are slow" | Usually folklore | Simple static gradients are often fine |
| "More widgets means slower app" | Oversimplified | Active layout/paint/update complexity matters more than raw count |
| "Every calculation should use an isolate" | False | Isolate startup/transfer can cost more than small work |
| "`await` moves work off main isolate" | False | CPU work remains on current isolate |
| "60 FPS means performance is solved" | False | Could have bad p99/input latency and fail 120 Hz |
| "Impeller removes all jank" | False | Removes/reduces shader-runtime issues, not arbitrary rendering/CPU costs |
| "Use `--cache-sksl` for modern mobile Flutter" | Outdated | Flutter tooling removed SkSL bundling in 3.32 |
| "Release mode fixes bad architecture" | False | It removes debug overhead, not algorithmic/rendering mistakes |
| "Flutter cannot do 120 Hz" | False | Current framework/rendering supports capable high-refresh devices |
| "Image file is only 2 MB so memory is cheap" | False | Decoded memory depends on pixel dimensions |
| "Offstage means no cost" | False | It still lays out and animations continue |
| "Keep every tab alive for smooth navigation" | False | Can increase memory/layout/animation cost |
| "Average FPS is the right KPI" | False | Frame-time distributions and long frames matter |

---

# Anti-Patterns

## Network call in `build()`

### Bad

```text
build
 -> fetch
```

### Why

Build can run frequently, causing duplicate requests and unpredictable state updates.

### Preferred

Own request lifecycle outside build.

### Verify

Request count + UI trace.

---

## Sort large list in `build()`

### Bad

```text
20k rows
 -> sort every rebuild
```

### Why

O(N log N) UI-isolate work in frame path.

### Preferred

Recompute only when source/sort key changes.

### Verify

CPU profiler.

---

## Large JSON decode on UI during animation

### Why

Blocks event/frame processing.

### Preferred

Reduce payload and/or use native isolate when measured.

### Verify

UI frame + CPU profile.

---

## `FutureBuilder(future: fetch())`

### Why

Future recreated on parent rebuild.

### Preferred

Stable Future ownership.

### Verify

Count requests.

---

## Recreated StreamBuilder stream

### Why

Repeated subscription/restart.

### Preferred

Stable stream lifecycle.

### Verify

Subscription logs/CPU/network.

---

## Root `setState` for tiny local UI

### Why

Broad element traversal.

### Preferred

Local state/consumer.

### Verify

Track Widget Builds.

---

## Huge state object with every consumer subscribed to all fields

### Why

Unrelated invalidation.

### Preferred

granular selectors/state partitions.

### Verify

build traces.

---

## `shrinkWrap` large list

### Why

viewport extent recomputation.

### Preferred

bounded viewport/slivers.

### Verify

layout trace.

---

## ListView inside SingleChildScrollView

### Why

often destroys laziness via shrink-wrap/nested architecture.

### Preferred

one CustomScrollView.

### Verify

number of built children + layout time.

---

## Eager thousands of children

### Why

memory/build/layout explosion.

### Preferred

builder/sliver delegate.

### Verify

heap + startup/scroll trace.

---

## Huge image for thumbnail

### Why

decoded pixel memory and decode/upload cost.

### Preferred

right-sized source/decode.

### Verify

oversized-image inspector + memory.

---

## Precache entire gallery

### Why

retains/decodes too much.

### Preferred

bounded next-content prefetch.

### Verify

RSS/ImageCache.

---

## Keep every list row alive

### Why

retains State/resources.

### Preferred

selective keep-alive.

### Verify

Memory diff.

---

## Full-screen BackdropFilter during scrolling

### Why

re-filters changing large backdrop every frame.

### Preferred

bound/reduce/remove/group filter.

### Verify

raster p99.

---

## Giant animated shadows

### Why

large blur/raster region changes every frame.

### Preferred

simpler/static shadow or reduced region.

### Verify

physical-layer toggle/raster trace.

---

## Animated complex ClipPath

### Why

complex changing clipping/rasterization.

### Preferred

simpler geometry/preclipped asset/transform if valid.

### Verify

raster trace.

---

## Many independent infinite animations

### Why

continuous scheduling/build/paint.

### Preferred

finite/shared/muted animations.

### Verify

idle CPU/frame activity.

---

## Heavy CPU in drag callback

### Why

input events compete with frame handling.

### Preferred

light visual update; defer/batch heavy work.

### Verify

input trace.

---

## Per-frame platform channel

### Why

serialization/platform-thread crossing.

### Preferred

batch/semantic messages.

### Verify

Timeline/platform trace.

---

## Unnecessary platform view

### Why

additional composition/synchronization.

### Preferred

Flutter-native content when equivalent and practical.

### Verify

compare scene with/without platform view.

---

## Many GlobalKeys

### Why

not inherently always slow, but reparenting/dependency cost and unnecessary global identity.

### Preferred

local state + ordinary stable keys.

### Verify

tree/update trace.

---

## `UniqueKey()` every build

### Why

destroys identity/reuse.

### Preferred

stable ValueKey/ObjectKey or no key.

### Verify

State lifecycle/build trace.

---

## Huge `scrollCacheExtent`

### Why

offscreen children laid out/retained.

### Preferred

measured bounded value.

### Verify

memory + scroll p99.

---

## Repaint entire screen for tiny animation

### Why

paint/raster area larger than necessary.

### Preferred

natural repaint boundary or repaint-driven local render object.

### Verify

repaint rainbow.

---

## RepaintBoundary everywhere

### Why

layer/memory overhead.

### Preferred

only asymmetric repaint boundaries.

### Verify

layer count/raster timings.

---

## Per-frame logging

### Why

distorts hot path/debug timing.

### Preferred

sampled events.

### Verify

CPU trace after removal.

---

## Optimizing micro widgets before O(N²) work

### Why

wrong order of magnitude.

### Preferred

fix algorithm first.

### Verify

CPU complexity/profile.

---

# Optimization Priority Ladder

Default priority:

1. **algorithmic complexity**
2. **main-isolate blocking CPU**
3. **unbounded/eager UI/data construction**
4. **oversized image decode/payload**
5. **scroll/layout architecture**
6. **high-cost raster/compositing effects**
7. **rebuild invalidation scope**
8. **memory retention/allocation churn**
9. **micro-optimizations**

Adjust based on profiling evidence.

If raster is 25 ms and UI is 2 ms, raster work is obviously higher priority than an O(N) method that takes 0.1 ms.

---

# 120 Hz Readiness Checklist

- [ ] Physical 120 Hz device used.
- [ ] Target cadence ~8.33 ms understood.
- [ ] UI p99 within target with margin.
- [ ] Raster p99 within target with margin.
- [ ] `totalSpan` reviewed.
- [ ] Large scroll tested.
- [ ] Route transition tested.
- [ ] Keyboard transition tested.
- [ ] No large sync CPU during animation.
- [ ] Images correctly sized.
- [ ] No large unnecessary blur.
- [ ] No heavy layout animation.
- [ ] Platform views tested.
- [ ] Long-session thermal behavior checked.
- [ ] Idle UI stops scheduling decorative frames.

---

# Low-End Device Checklist

- [ ] Lowest supported RAM tier tested.
- [ ] Lowest realistic CPU/GPU tier tested.
- [ ] Large image list tested.
- [ ] Long scrolling tested.
- [ ] Image-cache memory observed.
- [ ] Navigation repeated.
- [ ] Keyboard/form tested.
- [ ] Decorative effects bounded.
- [ ] Blur/shadows tested.
- [ ] Platform views tested.
- [ ] Memory does not grow unbounded.
- [ ] p99/worst frames acceptable.
- [ ] App remains responsive under slow network + response processing.

---

# UI Performance Audit Checklist

## Measurement

- [ ] Profile mode used.
- [ ] Representative physical hardware.
- [ ] Actual refresh target recorded.
- [ ] Baseline trace saved.
- [ ] p90/p99/worst captured.
- [ ] UI vs raster bottleneck identified.

## Build

- [ ] Expensive work removed from build.
- [ ] setState/state invalidation scoped.
- [ ] stable Future/Stream ownership.
- [ ] selectors only where useful.
- [ ] MediaQuery aspect-specific APIs used where appropriate.
- [ ] no GlobalKey/UniqueKey misuse.

## Layout

- [ ] IntrinsicHeight/Width reviewed.
- [ ] `shrinkWrap` large scrollables reviewed.
- [ ] nested scrolling reviewed.
- [ ] known row extents considered.
- [ ] layout-heavy animations reviewed.

## Paint/raster

- [ ] Repaint regions inspected.
- [ ] `saveLayer` activity reviewed.
- [ ] partial Opacity reviewed.
- [ ] clipping reviewed.
- [ ] BackdropFilter/blur reviewed.
- [ ] shadows/elevation reviewed.
- [ ] CustomPainter paths reviewed.
- [ ] platform views reviewed.

## Scroll

- [ ] lazy construction.
- [ ] pagination.
- [ ] bounded keep-alive.
- [ ] `scrollCacheExtent` intentional.
- [ ] scroll listeners lightweight.

## Images

- [ ] decode dimensions reviewed.
- [ ] oversized-image diagnostics run.
- [ ] precache bounded.
- [ ] image cache not blindly enlarged.
- [ ] source assets appropriately sized.

## CPU

- [ ] CPU profiler inspected.
- [ ] algorithmic complexity checked.
- [ ] sync parsing/sorting identified.
- [ ] isolate use justified.
- [ ] Web isolate limitation accounted for.

## Memory

- [ ] controllers disposed.
- [ ] listeners/subscriptions disposed.
- [ ] overlay entries removed.
- [ ] hidden tabs not over-retained.
- [ ] memory snapshots stable after repeated flow.

---

# Code Review Checklist

- [ ] No performance claim without mechanism.
- [ ] No debug-only performance conclusions.
- [ ] No network/database/IO in build.
- [ ] No large collection transformation in hot build.
- [ ] No accidental Future/Stream recreation.
- [ ] setState scope appropriate.
- [ ] const used naturally, not cargo cult.
- [ ] correct key identity.
- [ ] no unnecessary GlobalKey.
- [ ] no large shrink-wrapped lists.
- [ ] lazy collection APIs.
- [ ] current `scrollCacheExtent`, not deprecated `cacheExtent`.
- [ ] known extents used where correct.
- [ ] keep-alive selective.
- [ ] images right-sized.
- [ ] no unbounded precache.
- [ ] animation controllers disposed.
- [ ] hidden animations muted/stopped.
- [ ] layout animation justified.
- [ ] paint-only animation uses efficient mechanism when needed.
- [ ] RepaintBoundary evidence-based.
- [ ] no unnecessary saveLayer.
- [ ] blur bounded.
- [ ] clipping mode appropriate.
- [ ] platform-view tradeoff documented.
- [ ] no per-frame channel traffic.
- [ ] main-isolate CPU bounded.
- [ ] Web compute/isolate assumptions correct.
- [ ] Impeller advice current.
- [ ] no obsolete SkSL bundling.
- [ ] accessibility preserved.

---

# Production Readiness Checklist

- [ ] Profile traces captured.
- [ ] Release build validated.
- [ ] Android low-end tested.
- [ ] Android high-refresh tested where relevant.
- [ ] iPhone tested.
- [ ] ProMotion device tested where relevant.
- [ ] iPad/tablet tested.
- [ ] Web production build tested.
- [ ] Web Wasm/skwasm evaluated where compatible.
- [ ] Desktop resize tested.
- [ ] High-DPI desktop tested.
- [ ] Large-data scroll tested.
- [ ] Slow-network response processing tested.
- [ ] Memory soak test performed.
- [ ] No route/controller leaks.
- [ ] No invisible continuous animation load.
- [ ] Images bounded.
- [ ] platform views tested during transitions.
- [ ] keyboard/form flows tested.
- [ ] reduced-motion tested.
- [ ] text scaling tested.
- [ ] p90/p99/worst metrics reviewed.
- [ ] startup/first frame reviewed separately.
- [ ] no performance regression from speculative optimizations.

---

# Version-Sensitive Areas

Always revalidate these.

## Flutter Version

Current research baseline:

```text
Flutter documentation reflecting 3.44.7
```

Framework APIs and renderer choices continue changing.

---

## Scroll Cache API

Current:

```text
scrollCacheExtent
```

Deprecated after Flutter 3.41:

```text
cacheExtent
```

Do not emit old code for new projects.

---

## Text Scaling

Old:

```text
textScaleFactor
```

has been deprecated in many APIs in favor of:

```text
TextScaler
```

Use current API.

---

## Impeller

Current baseline:

```text
iOS: only renderer
Android 29+: default
Android fallback: legacy OpenGL where needed
Web: Skia renderers
macOS: preview/opt-in
```

Recheck with installed Flutter.

---

## SkSL

Historical SkSL bundling was removed from Flutter tooling in 3.32.

Do not emit obsolete:

```text
capture --cache-sksl
bundle captured SkSL
```

guidance for current stable projects.

---

## Flutter Web

Current renderer guidance:

```text
default -> CanvasKit
--wasm -> skwasm with CanvasKit fallback
```

Do not discuss the retired HTML renderer as the current performance choice.

---

## Platform Views

Current Android HCPP:

```text
experimental
Flutter 3.44+
API 34+
Vulkan
Impeller
```

Revalidate before production use.

---

## DevTools

Available tracing/debugging features evolve with Flutter SDK.

Current major tools include:

```text
Frame chart
Frame analysis
Timeline
Track Widget Builds
Track Layouts
Track Paints
CPU profiler
Memory view
Inspector oversized images
repaint rainbow
```

---

## Image Cache

Current defaults:

```text
1000 entries
100 MB
```

Do not hardcode those numbers forever.

Inspect current API when tuning.

---

## Web Isolates

Current Flutter Web does not support Dart isolates; `compute()` remains on main event loop.

Revalidate future versions.

---

# Official References

## Flutter performance

https://docs.flutter.dev/perf/best-practices

https://docs.flutter.dev/perf/ui-performance

https://docs.flutter.dev/perf/rendering-performance

https://docs.flutter.dev/perf/metrics

https://docs.flutter.dev/perf/isolates

https://docs.flutter.dev/perf/impeller

https://docs.flutter.dev/perf/faq

## DevTools

https://docs.flutter.dev/tools/devtools/performance

https://docs.flutter.dev/tools/devtools/cpu-profiler

https://docs.flutter.dev/tools/devtools/memory

https://docs.flutter.dev/tools/devtools/inspector

## Build modes

https://docs.flutter.dev/testing/build-modes

## Architecture

https://docs.flutter.dev/resources/architectural-overview

## Web rendering

https://docs.flutter.dev/platform-integration/web/renderers

https://docs.flutter.dev/platform-integration/web/faq

## Platform views

https://docs.flutter.dev/platform-integration/android/platform-views

https://docs.flutter.dev/platform-integration/ios/platform-views

https://docs.flutter.dev/platform-integration/macos/platform-views

## Platform channels

https://docs.flutter.dev/platform-integration/platform-channels

## Scheduler/frame timing

https://api.flutter.dev/flutter/scheduler/SchedulerBinding/addTimingsCallback.html

https://api.flutter.dev/flutter/dart-ui/FrameTiming-class.html

https://api.flutter.dev/flutter/dart-ui/Display-class.html

## Widget rebuilding

https://api.flutter.dev/flutter/widgets/State/setState.html

https://api.flutter.dev/flutter/widgets/StatefulWidget-class.html

https://api.flutter.dev/flutter/widgets/StatelessWidget-class.html

https://api.flutter.dev/flutter/widgets/GlobalKey-class.html

https://api.flutter.dev/flutter/widgets/MediaQuery-class.html

## Layout

https://api.flutter.dev/flutter/widgets/IntrinsicHeight-class.html

https://api.flutter.dev/flutter/widgets/IntrinsicWidth-class.html

https://api.flutter.dev/flutter/widgets/ScrollView/shrinkWrap.html

## Lists

https://api.flutter.dev/flutter/widgets/ListView-class.html

https://api.flutter.dev/flutter/widgets/ListView/ListView.builder.html

https://api.flutter.dev/flutter/widgets/ListView/itemExtent.html

https://api.flutter.dev/flutter/widgets/ListView/itemExtentBuilder.html

https://api.flutter.dev/flutter/widgets/AutomaticKeepAliveClientMixin-mixin.html

## Painting

https://api.flutter.dev/flutter/rendering/CustomPainter-class.html

https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html

https://api.flutter.dev/flutter/dart-ui/Canvas/saveLayer.html

https://api.flutter.dev/flutter/widgets/Opacity-class.html

https://api.flutter.dev/flutter/widgets/BackdropFilter-class.html

https://api.flutter.dev/flutter/widgets/BackdropGroup-class.html

https://api.flutter.dev/flutter/widgets/ImageFiltered-class.html

## Animation

https://api.flutter.dev/flutter/animation/AnimationController-class.html

https://api.flutter.dev/flutter/widgets/TickerMode-class.html

https://api.flutter.dev/flutter/widgets/AnimatedBuilder-class.html

https://api.flutter.dev/flutter/widgets/AnimatedPositioned-class.html

https://api.flutter.dev/flutter/widgets/SlideTransition-class.html

## Images

https://api.flutter.dev/flutter/widgets/Image-class.html

https://api.flutter.dev/flutter/widgets/Image/Image.network.html

https://api.flutter.dev/flutter/painting/ImageCache-class.html

https://api.flutter.dev/flutter/widgets/precacheImage.html

## Async builders

https://api.flutter.dev/flutter/widgets/FutureBuilder-class.html

https://api.flutter.dev/flutter/widgets/StreamBuilder-class.html

## Visibility/lifecycle

https://api.flutter.dev/flutter/widgets/Offstage-class.html

https://api.flutter.dev/flutter/widgets/Visibility-class.html

https://api.flutter.dev/flutter/widgets/IndexedStack-class.html

## Text

https://api.flutter.dev/flutter/painting/TextPainter-class.html

https://api.flutter.dev/flutter/painting/TextPainter/layout.html

## Current migration evidence

https://docs.flutter.dev/release/release-notes/release-notes-3.32.0

---

# Final Performance Philosophy

When asked to optimize Flutter UI, use this order:

```text
reproduce
    ↓
profile
    ↓
identify slow stage
    ↓
identify dominant mechanism
    ↓
remove unnecessary work
    ↓
reduce algorithmic complexity
    ↓
reduce layout/rendering complexity
    ↓
re-profile
    ↓
test low-end hardware
    ↓
test target high-refresh hardware
    ↓
release verification
```

Never start with:

```text
add const everywhere
switch state-management package
wrap everything in RepaintBoundary
move everything to isolates
remove every Container
```

without evidence.

The desired pipeline is:

```text
User input / application event
        ↓
minimal necessary state change
        ↓
smallest dependent UI rebuild
        ↓
minimal required layout
        ↓
minimal required paint
        ↓
bounded efficient raster/composition
        ↓
display cadence met with margin
```

The production target is not:

```text
"the app once showed 120 FPS"
```

It is:

```text
stable frame pacing
rare long frames
responsive input
bounded memory
low idle cost
sustainable thermals
correct accessibility
across representative devices
```

Optimize the dominant measured work.

Ignore folklore until measurement proves its mechanism matters.