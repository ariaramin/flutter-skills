# UI, Rendering, Startup, Lifecycle & Energy

Source-preserving excerpt from the uploaded production skill. Use this file when the core `SKILL.md` routes to this topic.

## Table of contents
- [UI Rebuild Performance](#ui-rebuild-performance)
- [const](#const)
- [Expensive Work in build](#expensive-work-in-build)
- [State Management Performance](#state-management-performance)
- [Large Lists and Collections](#large-lists-and-collections)
- [Allocation and Collection Performance](#allocation-and-collection-performance)
- [Rendering Performance](#rendering-performance)
  - [Repaint boundaries](#repaint-boundaries)
  - [saveLayer](#savelayer)
  - [Opacity and clipping](#opacity-and-clipping)
  - [CustomPainter](#custompainter)
  - [Intrinsic layout](#intrinsic-layout)
- [Animation Efficiency](#animation-efficiency)
- [Startup Optimization](#startup-optimization)
  - [Required before meaningful first frame](#required-before-meaningful-first-frame)
  - [Deferrable](#deferrable)
- [App Lifecycle Efficiency](#app-lifecycle-efficiency)
- [Battery and Energy](#battery-and-energy)

---

# UI Rebuild Performance

Flutter is declarative and rebuilds are expected. Do not treat every call to `build` as a defect. Flutter's own declarative model is designed around rebuilding UI from state.

Optimize rebuilds when profiling shows:

- a large subtree rebuilds at high frequency
- build methods perform significant synchronous computation
- notifications are much broader than necessary
- identical derived values are recomputed repeatedly
- list cells perform expensive work
- parent updates recreate expensive descendants needlessly

Strategies:

- scope state notifications more narrowly
- move deterministic heavy transformations outside `build`
- precompute/cache only expensive derived data with valid invalidation
- pass stable child subtrees to builders where supported
- split highly dynamic and static sections
- use `const` where semantically natural

---

# `const`

Dart constant objects are compile-time constants, and equal constant expressions may be canonicalized into an identical instance.

In Flutter, stable widget identity can permit framework reuse in suitable cases, but:

- `const` does not make arbitrary descendant work free
- it does not fix expensive layout
- it does not fix raster jank
- it does not fix CPU parsing
- it does not make every parent rebuild disappear

Use `const` for correctness/readability and cheap reuse opportunities. Never make "add const everywhere" the primary performance plan without measurement.

---

# Expensive Work in `build`

Do not repeatedly perform large deterministic work from `build`, including:

- JSON parsing
- large sorting
- large filtering
- database queries
- network calls
- image processing
- decompression
- expensive regular expressions
- full-document parsing
- building large temporary lookup structures

Move work to:

- data/model layer
- event-triggered computation
- cached derived state
- native worker isolate where measured CPU warrants it
- explicit asynchronous I/O layer

Ensure invalidation is correct.

---

# State Management Performance

Remain library-neutral unless the repository uses a known package.

Inspect:

- notification frequency
- subscription breadth
- selector granularity
- derived-state recomputation
- synchronous listeners
- entire-screen rebuilds for local changes
- large immutable-state copies in hot paths

Do not replace state management packages solely to pursue theoretical speed.

When package semantics matter, verify the current package documentation/implementation before prescribing selectors, equality behavior, or disposal rules.

---

# Large Lists and Collections

Prefer lazy viewport construction for large content:

- `ListView.builder`
- `GridView.builder`
- slivers
- equivalent lazy delegates

Flutter documents builder-based list creation as on-demand. Large eager `SingleChildScrollView` + `Column` structures can be expensive for large content.

Use fixed extent/prototype extent where it is correct and produces a measurable layout benefit.

Be cautious with `shrinkWrap`: Flutter documents shrink-wrapping scroll content as significantly more expensive because size can need recomputation as scrolling changes.

### Current API freshness

Older advice telling agents to tune `cacheExtent` directly is version-stale for current Flutter. `ScrollView.cacheExtent` is deprecated after v3.41.0-0.0.pre in favor of `scrollCacheExtent`.

---

# Allocation and Collection Performance

Do not optimize allocation by intuition.

Use Memory/CPU tools to identify:

- high-rate temporary Lists/Maps
- repeated object graphs
- repeated string concatenation
- repeated serialization
- unnecessary byte-buffer copies
- eager `toList()` materialization
- closures created inside proven hot loops
- model reconstruction caused by overly broad updates

Prefer:

1. eliminate duplicate work
2. improve algorithm/data structure
3. avoid unnecessary copies
4. reduce hot-path allocation
5. only then consider specialized pooling

An algorithmic improvement from repeated quadratic work to linear or n-log-n behavior usually outweighs syntax-level tuning.

---

# Rendering Performance

## Repaint boundaries

`RepaintBoundary` can isolate repaint work and may enable raster caching in some situations, but each added layer has management/memory costs. Flutter already inserts boundaries in useful places.

Use only when profiling shows:

- an expensive static subtree repaints because a sibling changes
- custom painting is isolated from unrelated animation

Do not surround every widget with `RepaintBoundary`.

## `saveLayer`

Flutter's performance guidance warns that `saveLayer` can require an offscreen buffer/render-target switch and is costly, particularly on GPUs.

Inspect effects that may induce it:

- particular clipping/effects
- certain shader/mask operations
- custom painting
- compositing operations

## Opacity and clipping

Intermediate opacity layers and complex clipping can become raster costs. Prefer simpler paint paths when visual equivalence exists and profiling justifies a change.

Do not remove required visual effects merely because they are sometimes expensive.

## CustomPainter

For custom painting:

- implement `shouldRepaint` accurately
- use repaint `Listenable`s where this avoids unnecessary build/layout
- avoid constructing huge complex paths every frame
- cache expensive immutable geometry when memory tradeoff is justified
- reduce image-filter/shader complexity when raster traces prove it expensive
- limit painting to needed bounds

## Intrinsic layout

Flutter performance guidance warns that intrinsic sizing can cause additional layout passes. Use DevTools layout tracking to identify this rather than banning intrinsic widgets globally.

---

# Animation Efficiency

Owned `AnimationController`s require correct ticker/disposal lifecycle.

Avoid:

- running discretionary animations while not visible
- entire-screen rebuilds for a tiny animation
- layout-triggering animation when paint/transform animation can achieve the same design
- expensive image filters every frame without evidence

For builder-style animations, pass unchanged descendants as stable child parameters where the API supports it.

Animation optimization should determine whether the cost lies in:

- ticker callback/Dart
- build
- layout
- paint
- raster
- image/shader work

before changing animation architecture.

---

# Startup Optimization

Measure startup first-frame and first-use behavior.

Partition initialization into:

## Required before meaningful first frame

Examples might include:

- configuration needed to decide initial route
- critical persisted authentication state
- dependency required to render first screen safely

## Deferrable

Potential examples:

- analytics warmup
- secondary caches
- optional SDKs
- preload for later screens
- nonessential network refresh
- expensive indexing

Prefer lazy initialization or after-first-meaningful-frame scheduling for nonessential work.

Important:

> moving work to a post-frame callback does not move it off the root isolate.

Heavy synchronous work performed immediately after frame 1 can simply jank frame 2. Classify CPU work independently and use an isolate where justified.

Measure both:

- startup/first meaningful frame
- first interaction/use latency

Do not improve startup by creating a severe first-use stall without considering the UX tradeoff.

---

# App Lifecycle Efficiency

Current Flutter lifecycle states include:

- `detached`
- `resumed`
- `inactive`
- `hidden`
- `paused`

`paused` is specific to iOS/Android; `hidden` provides a cross-platform concept for all views being hidden, including minimized desktop windows and hidden Web tabs. During mobile `paused`, Flutter does not invoke begin-frame/draw-frame callbacks.

Use lifecycle transitions to consider reducing discretionary work:

- animations
- polling
- sensor usage
- location
- camera
- network refresh
- worker throughput
- expensive stream processing
- caches/resources that can be reacquired

Do not assume lifecycle callbacks are guaranteed during abrupt process termination. Persist important state incrementally instead of relying exclusively on `dispose` or shutdown callbacks.

---

# Battery and Energy

Optimize energy by reducing unnecessary work, not merely making individual functions faster.

Common sources of waste:

- polling
- tiny periodic timers
- continuous animation
- repeated network wakeups
- GPS/sensors at excessive rates
- duplicate requests
- retry storms
- background worker loops
- unnecessary decoding
- excessive logging
- high CPU while hidden
- rendering at unnecessarily high frequency

Prefer:

- event-driven updates
- batched network activity
- lifecycle-aware suspension
- adaptive refresh/work rates
- request deduplication
- lower sensor accuracy/rate when requirements permit
- bounded retry
- coalescing

Apple notes that higher display refresh rates can increase power use, and system refresh may change due to thermal/power conditions.

Measure battery/energy using platform tools where practical; CPU time alone is not a complete battery metric.

---
