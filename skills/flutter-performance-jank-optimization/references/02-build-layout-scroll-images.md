# Contents

- [Build Optimization](#build-optimization)
  - [Rebuilds are a means, not the metric](#rebuilds-are-a-means-not-the-metric)
  - [Keep state local](#keep-state-local)
  - [Avoid expensive work in `build`](#avoid-expensive-work-in-build)
  - [`const`](#const)
  - [Widget extraction](#widget-extraction)
  - [Keys](#keys)
  - [Stable child subtrees](#stable-child-subtrees)
- [State Management Performance](#state-management-performance)
  - [Subscribe narrowly when broad subscription is measured to be expensive](#subscribe-narrowly-when-broad-subscription-is-measured-to-be-expensive)
  - [Do not use selectors everywhere](#do-not-use-selectors-everywhere)
  - [State granularity](#state-granularity)
  - [Bloc / Cubit](#bloc-cubit)
  - [Provider](#provider)
  - [Riverpod](#riverpod)
- [Build Method Rules](#build-method-rules)
- [Layout Optimization](#layout-optimization)
  - [Constraints first](#constraints-first)
  - [Intrinsic measurements](#intrinsic-measurements)
  - [`shrinkWrap`](#shrinkwrap)
- [Scrolling Optimization](#scrolling-optimization)
  - [Diagnose scrolling jank in this order](#diagnose-scrolling-jank-in-this-order)
- [List / Grid Performance](#list-grid-performance)
  - [Prefer lazy construction for large collections](#prefer-lazy-construction-for-large-collections)
  - [Known item extents](#known-item-extents)
  - [`prototypeItem`](#prototypeitem)
  - [`itemExtentBuilder`](#itemextentbuilder)
  - [Scroll cache extent](#scroll-cache-extent)
- [Slivers](#slivers)
- [KeepAlive](#keepalive)
- [Pagination](#pagination)
- [Images](#images)
  - [Understand decoded size](#understand-decoded-size)
  - [Decode near display size](#decode-near-display-size)
  - [Web difference](#web-difference)
  - [ImageCache](#imagecache)
  - [Precache](#precache)
  - [Image-heavy scrolling](#image-heavy-scrolling)
  - [Animated images](#animated-images)
- [Image Memory](#image-memory)
- [SVG / Vector Graphics](#svg-vector-graphics)
- [Paint / Compositing](#paint-compositing)
  - [`RepaintBoundary`](#repaintboundary)
  - [`saveLayer`](#savelayer)
  - [Opacity](#opacity)
  - [Clipping](#clipping)
  - [Shadows and blur](#shadows-and-blur)
- [Layer Tree](#layer-tree)

---

# Build Optimization

## Rebuilds are a means, not the metric

Do not optimize based on rebuild count alone.

Ask:

- How long do builds take?
- How large is the rebuilt subtree?
- Does rebuilding trigger layout?
- Does it trigger expensive paint?
- Does the builder perform CPU-heavy work?
- Is the state changing at high frequency?

## Keep state local

If one small element changes, prefer state ownership near that element when the architecture permits.

Potentially expensive:

```text
page-level setState
       ↓
large subtree
```

Potentially better:

```text
small state owner
      ↓
small affected subtree
```

Flutter's official best practices recommend localizing `setState` calls rather than rebuilding unnecessarily high in the tree.

Do not move state solely for performance unless the trace shows meaningful build cost.

## Avoid expensive work in `build`

Do not repeatedly perform:

- large sorting;
- JSON parsing;
- network requests;
- file reads;
- database queries;
- heavy serialization;
- complex regex compilation;
- expensive geometry generation.

A simple object allocation in `build` is normally fine.

Do not turn every `EdgeInsets`, `TextStyle`, or short collection into a cache without evidence.

## `const`

Use `const` when:

- values are compile-time constants;
- it improves clarity;
- a stable widget instance can avoid unnecessary subtree update work.

Example:

```dart
const SizedBox(
  width: 16,
  height: 16,
)
```

Flutter can reuse canonical constant objects, and stable widget instances can allow element update traversal to stop earlier.

But:

```text
const
≠
automatic no-build guarantee for an entire screen
≠
fix for raster jank
≠
fix for synchronous Dart work
```

Use `const` as normal good Flutter code, not as the central performance strategy.

## Widget extraction

Extract a subtree into a widget when it:

- improves readability;
- gives a meaningful state/rebuild boundary;
- can become `const`;
- allows a stable child to be passed through a builder;
- makes profiling easier.

Do not claim that turning every helper method into a widget automatically improves performance.

## Keys

Use keys for identity/state correctness.

Do not add keys as generic performance hints.

Inappropriate keys—especially global keys used without need—can increase complexity.

## Stable child subtrees

When a builder rebuilds for one changing value, keep stable children outside it where the API supports this.

This is particularly useful with:

- `AnimatedBuilder`;
- `ListenableBuilder`;
- provider consumers;
- state selectors.

---

# State Management Performance

Use framework-neutral principles first.

## Subscribe narrowly when broad subscription is measured to be expensive

Prefer:

```text
state source
   ↓
small selected value
   ↓
affected widget
```

over:

```text
huge application state
      ↓
entire page rebuild
```

when the latter causes measurable cost.

## Do not use selectors everywhere

Selectors add:

- code;
- comparison work;
- complexity;
- debugging surface.

Use them when they eliminate meaningful repeated work.

## State granularity

Watch for:

- a giant immutable state updated for tiny changes;
- high-frequency state emission;
- large collection copies;
- expensive deep equality;
- multiple unrelated UI concerns sharing one rebuild boundary.

Measure CPU and frame costs before redesigning state architecture.

---

## Bloc / Cubit

If the repository uses `flutter_bloc`, use:

- `BlocBuilder` for normal state-driven rebuilds;
- `BlocSelector` where selecting a stable subvalue avoids meaningful work;
- `buildWhen` when the build can safely be skipped for specific transitions.

Do not treat `buildWhen` as business correctness logic.

Example:

```dart
BlocSelector<SearchCubit, SearchState, int>(
  selector: (state) => state.visibleResultCount,
  builder: (context, visibleResultCount) {
    return Text('$visibleResultCount results');
  },
)
```

The selected value should have reliable equality/immutability semantics.

Do not replace a cheap `BlocBuilder` with selectors merely to lower an arbitrary rebuild counter.

---

## Provider

If using Provider:

- place `Consumer`/`Selector` near the affected subtree when broad rebuilds are expensive;
- use non-listening reads for event dispatch where no subscription is needed;
- pass stable child content through `child` when supported.

---

## Riverpod

If using Riverpod:

- use targeted providers or `select` when measured rebuild work justifies it;
- do not add selection complexity preemptively.

The performance rule is architecture-independent:

> Narrow subscriptions only when broad subscriptions produce measurable work.

---

# Build Method Rules

Good:

```dart
@override
Widget build(BuildContext context) {
  return ListTile(
    title: Text(user.name),
    subtitle: Text(user.email),
  );
}
```

Do not prematurely cache trivial formatting or widget creation.

Move computation out of `build` when it is:

- deterministic from slowly changing data;
- expensive enough to appear in profiling;
- repeatedly recomputed due to unrelated rebuilds.

For derived state, compute:

- when source data changes;
- in a controller/view model;
- in a memoized selector;
- off-isolate if truly CPU-heavy.

Choose based on measured cost and architecture.

---

# Layout Optimization

Layout cost comes from resolving constraints and sizes through the render tree.

Investigate layout when:

- UI timeline time is high;
- DevTools layout tracing shows repeated expensive layouts;
- scrolling becomes worse with deeper/nested layout structures;
- animation changes dimensions every frame.

## Constraints first

Before adding performance workarounds, understand:

```text
constraints go down
sizes go up
parents position children
```

Many pathological layouts originate from unclear constraint ownership.

## Intrinsic measurements

Widgets such as:

- `IntrinsicWidth`;
- `IntrinsicHeight`;

can require an additional speculative layout pass.

Flutter performance guidance explicitly warns that intrinsic layout can add extra passes and can become costly, especially in large trees.

Do not ban them.

Use them when:

- content is small;
- intrinsic sizing is genuinely required;
- measured layout cost is acceptable.

Prefer explicit constraints or known dimensions when they express the same design.

## `shrinkWrap`

A shrink-wrapped scroll view must determine its extent based on content and can recompute it as scrolling changes.

Current Flutter API documentation explicitly describes `shrinkWrap` as significantly more expensive than allowing the scroll view to expand to the available maximum extent.

Do not use:

```dart
ListView.builder(
  shrinkWrap: true,
  itemCount: items.length,
  itemBuilder: buildItem,
)
```

as a universal fix for nesting.

For large scrollable content, prefer one coordinated scroll view/sliver structure.

Use `shrinkWrap` when:

- content is small;
- the parent genuinely requires content-sized scrolling;
- the measured cost is acceptable.

---

# Scrolling Optimization

Scrolling is one of the highest-value performance paths because work repeats continuously while the viewport moves.

Profile:

- fast fling;
- slow drag;
- initial entry;
- image arrival;
- pagination boundary;
- returning to previously visited content.

## Diagnose scrolling jank in this order

1. Record a profile trace.
2. Determine UI vs raster.
3. Inspect list child construction.
4. Inspect layout.
5. Inspect image decode/upload.
6. Inspect raster effects.
7. Inspect synchronous callbacks/state updates.
8. Inspect platform views.
9. Inspect cache/keep-alive behavior.
10. Change one contributor.
11. Re-profile the same fling.

---

# List / Grid Performance

## Prefer lazy construction for large collections

Use:

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ItemRow(item: items[index]);
  },
)
```

for large lists.

Use:

```dart
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
  ),
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ProductCard(product: items[index]);
  },
)
```

for large grids.

Builder-based lists construct children lazily as needed.

A normal `Column` is perfectly appropriate for a short fixed group of widgets.

## Known item extents

When rows genuinely have a fixed main-axis extent, use `itemExtent`.

```dart
ListView.builder(
  itemExtent: 72,
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ContactRow(contact: items[index]);
  },
)
```

Flutter can perform more efficient scroll calculations when item dimensions are known.

Do not use fixed extents if text wrapping or accessibility settings make actual item dimensions variable.

## `prototypeItem`

Use `prototypeItem` when all rows should match the extent of a representative widget.

Do not simultaneously specify `itemExtent`, `prototypeItem`, and `itemExtentBuilder`; current `ListView` permits only one extent strategy.

## `itemExtentBuilder`

Current Flutter supports `itemExtentBuilder` for known but varying extents.

Its callback may run multiple times during layout, so keep it:

- deterministic;
- cheap;
- side-effect free.



## Scroll cache extent

Current Flutter uses `scrollCacheExtent`.

Example:

```dart
ListView.builder(
  scrollCacheExtent: const ScrollCacheExtent.pixels(600),
  itemCount: items.length,
  itemBuilder: (context, index) {
    return FeedCard(item: items[index]);
  },
)
```

Only tune this after measurement.

Increasing scroll cache means more offscreen content can be laid out ahead of visibility.

Tradeoff:

```text
larger scroll cache
        ↓
potentially fewer just-in-time builds/layouts
        +
more build/layout work ahead of time
        +
more retained memory
```

Current Flutter also uses cached regions for some implicit accessibility scrolling behavior, so do not optimize the value without testing accessibility.

Do not use deprecated `cacheExtent` in new code on current Flutter.

---

# Slivers

Use slivers when one scrollable experience contains:

- lazy lists;
- lazy grids;
- expanding/collapsing app bars;
- mixed sections;
- sticky headers;
- large coordinated content.

Example structure:

```dart
CustomScrollView(
  slivers: <Widget>[
    const SliverAppBar(
      pinned: true,
      title: Text('Feed'),
    ),
    SliverList.builder(
      itemCount: items.length,
      itemBuilder: (context, index) {
        return FeedCard(item: items[index]);
      },
    ),
  ],
)
```

Do not convert every screen into `CustomScrollView`.

Use slivers when they solve:

- nesting;
- lazy composition;
- coordinated scrolling;
- measured layout issues.

---

# KeepAlive

Flutter's lazy sliver delegates can destroy children that leave the active viewport.

Use keep-alive behavior only when retaining the child's state or expensive resource is valuable.

`AutomaticKeepAliveClientMixin` is appropriate when a row/page must remain alive.

Tradeoff:

```text
keep alive
   ↓
less recreation
   +
more retained memory/state
```

Do not keep every feed cell alive by default.

For tabs, decide independently for each tab whether preserving:

- scroll position;
- controller state;
- expensive content;

justifies retained memory.

---

# Pagination

For large network or local datasets, load incrementally when product semantics permit.

A robust paginator should:

- avoid duplicate requests;
- retain a loading flag;
- detect end-of-list;
- ignore stale responses where needed;
- prefetch before the user reaches the final item;
- keep page size reasonable;
- expose failure/retry state.

Do not render 100,000 records simply because the backend can return them.

Pagination can reduce:

- memory;
- initial network payload;
- parse work;
- widget count;
- startup/first-content latency.

It can introduce:

- extra network round trips;
- boundary loading;
- state complexity.

Measure the total user experience.

---

# Images

Image performance has both runtime and memory dimensions.

## Understand decoded size

Compressed file size is not decoded memory size.

An RGBA-style decoded image is roughly:

```text
width × height × 4 bytes
```

A 4000 × 4000 image can therefore require roughly:

```text
4000 × 4000 × 4 ≈ 64 MB
```

before additional overhead.

Displaying that as a tiny avatar wastes decode and memory resources.

## Decode near display size

For a 96 logical-pixel thumbnail:

```dart
class NetworkThumbnail extends StatelessWidget {
  const NetworkThumbnail({
    required this.url,
    super.key,
  });

  final String url;

  @override
  Widget build(BuildContext context) {
    const logicalSize = 96.0;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final decodeSize = (logicalSize * dpr).ceil();

    return Image.network(
      url,
      width: logicalSize,
      height: logicalSize,
      fit: BoxFit.cover,
      cacheWidth: decodeSize,
      cacheHeight: decodeSize,
    );
  }
}
```

`cacheWidth` and `cacheHeight` instruct Flutter's image pipeline to decode closer to a requested physical size where supported, reducing memory pressure.

Do not simply use:

```dart
cacheWidth: 96
```

for a 96 logical-pixel widget on a 3× device if quality matters.

Account for device pixel ratio.

## Web difference

For `Image.network` on Flutter web, `cacheWidth` and `cacheHeight` are ignored because browser decoding is delegated to the web platform.

Do not assume native image decode optimizations apply identically to web.

## ImageCache

Current Flutter's `ImageCache` is an LRU cache with default limits of up to:

- 1000 images;
- 100 MB.

Those limits are configurable.

Do not immediately increase the global cache to fix image flicker.

Measure:

- cache churn;
- decoded image memory;
- total process memory;
- image reuse.

Likewise, do not shrink the cache globally without confirming that memory savings outweigh extra decoding/network/cache misses.

## Precache

Use `precacheImage` for targeted high-value cases such as:

- an upcoming hero transition;
- one critical next-screen image;
- a known first interaction.

Example:

```dart
Future<void> precacheProfileImage(
  BuildContext context,
  ImageProvider<Object> provider,
) {
  return precacheImage(provider, context);
}
```

Do not precache every asset/image at startup.

Preloading shifts work earlier and consumes memory.

## Image-heavy scrolling

When a feed janks:

1. verify row build/layout;
2. verify decode size;
3. inspect image arrival timing;
4. inspect raster;
5. inspect cache churn;
6. reduce unnecessary simultaneous image work;
7. re-profile fast scrolling.

## Animated images

Large animated GIF-style images can require:

- repeated decoding;
- memory for frames;
- ongoing raster work.

Profile them.

For long/high-resolution animations, consider an appropriately optimized media format or playback technology rather than treating an enormous animated image as free.

---

# Image Memory

Use DevTools Memory view to distinguish:

```text
Dart heap
vs
native/external image allocations
vs
raster/cache-related memory
```

A small Dart heap does not guarantee low total process memory.

When image memory is excessive:

1. inspect source resolution;
2. inspect decode dimensions;
3. inspect number of simultaneously retained images;
4. inspect cache configuration;
5. inspect hidden/kept-alive pages retaining images;
6. test memory after navigation away;
7. verify whether objects become collectible.

Do not classify every large image cache as a leak.

---

# SVG / Vector Graphics

Flutter itself does not provide one universal SVG widget; vector package behavior varies.

Treat complex vector graphics as rendering workloads.

Potential costs include:

- XML/vector parsing;
- path construction;
- tessellation;
- many draw operations;
- complex clipping;
- gradients;
- filters.

If a vector asset is measured to be expensive:

1. simplify the source paths;
2. reduce invisible/duplicate geometry;
3. cache parsed/precompiled representations if the selected package supports it;
4. avoid reparsing every build;
5. consider a raster asset at suitable resolutions for static complex artwork;
6. profile visual fidelity and memory after conversion.

Do not rasterize all vectors preemptively.

Simple icons are normally inexpensive.

---

# Paint / Compositing

A fast build can still produce an expensive scene.

Investigate painting/compositing when raster time dominates.

## `RepaintBoundary`

A `RepaintBoundary` isolates painting into a separate display-list/compositing boundary.

Use it when:

- one subtree repaints frequently;
- adjacent expensive content is otherwise repainting with it;
- profiling shows repaint isolation would remove meaningful paint/raster work.

Flutter itself inserts repaint boundaries in many common structures, including lazy sliver children by default.

Do not wrap every widget in `RepaintBoundary`.

Potential tradeoffs include:

- extra compositing structure;
- memory;
- more retained layers/resources.

Verify with repaint diagnostics and frame traces.

## `saveLayer`

Offscreen rendering can be expensive because it requires additional render targets and compositing work.

Potential sources include:

- some blend modes;
- certain filters;
- opacity/filter combinations;
- explicit APIs that require offscreen composition;
- `Clip.antiAliasWithSaveLayer`.

Flutter's official performance best practices explicitly call out `saveLayer` as expensive, particularly due to render-target switching on mobile GPUs.

Do not rewrite visual effects merely because `saveLayer` exists.

Confirm it contributes to slow raster frames.

## Opacity

Do not state:

```text
Opacity is always slow
```

Current rendering engines can optimize some cases.

For a simple leaf where direct alpha provides identical visuals, direct color/image alpha can avoid an extra compositing operation.

For animations, use purpose-built APIs such as:

- `FadeTransition`;
- `AnimatedOpacity`;

according to semantics and profiling.

Do not sacrifice correct compositing merely to remove an `Opacity` widget.

## Clipping

Do not clip unless the design requires it.

Prefer the least expensive clip mode that satisfies visual quality.

Especially investigate:

```dart
clipBehavior: Clip.antiAliasWithSaveLayer
```

if raster time is high.

Do not blindly change anti-aliasing if it creates visible artifacts.

## Shadows and blur

Large-radius:

- shadows;
- backdrop blurs;
- image filters;

can be raster expensive.

When profiling proves they dominate:

- reduce blur radius;
- reduce affected area;
- simplify effect count;
- avoid animating a huge blur surface;
- replace with a pre-rendered/static asset where visually acceptable.

Preserve visual requirements unless the product accepts a design change.

---

# Layer Tree

Flutter retains and composites scene layers for operations such as:

- transforms;
- clips;
- opacity;
- physical shapes;
- platform views.

Do not optimize "layer count" as a standalone metric.

A layer can:

- enable retained rendering;
- isolate updates;
- reduce repeated work.

It can also:

- consume resources;
- increase composition complexity.

Inspect the frame and visual pipeline, not just the number of nodes.

---
