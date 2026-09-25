# Flutter Performance

## Measure first [F]

Use profile/release-representative behavior and Flutter DevTools. Do not optimize from folklore.

Classify bottleneck:
- build;
- layout;
- paint/raster;
- animation;
- image decode/upload;
- CPU parsing/computation;
- I/O/network;
- memory/GC;
- platform view/native;
- startup;
- shader/graphics pipeline.

## Build cost [F]

Official guidance emphasizes:
- avoid repetitive expensive work in `build()`;
- avoid overly large widgets;
- localize `setState`;
- use `const` constructors where valid;
- prefer reusable widgets over helper functions when that improves framework short-circuiting/composition.

Operational translation:
- precompute data outside `build()` when it is not view-dependent;
- do not sort/filter huge datasets on every rebuild;
- observe/select narrow state.

## Lists

Use lazy list/sliver builders for large data.
Keep item identity stable.
Avoid nested unconstrained scrollables.
Paginate remote data.
Prefetch intentionally.

## Images

Control:
- source dimensions;
- decode size;
- cache size;
- prefetch;
- placeholder behavior;
- memory pressure.

Profile image-heavy screens on low/mid devices.

## Repaint

Use `RepaintBoundary` when profiling/paint topology indicates benefit.
It can increase memory/layer cost; do not blanket-wrap everything.

## Animations

Prefer framework-optimized transitions.
Avoid rebuilding expensive static children every animation tick.
Separate animated value from static subtree where appropriate.

## CPU work

Heavy synchronous Dart work on the UI isolate can cause jank.
Use isolates only when work is large enough to justify overhead. [D]

## Network/data

Performance is also:
- response size;
- pagination;
- caching;
- compression;
- serialization cost;
- duplicate requests;
- offline/local startup path.

A smooth widget tree cannot compensate for a poor data access pattern.

## Startup

Inspect:
- synchronous initialization before `runApp`;
- eager dependency creation;
- DB migrations;
- remote config/auth bootstrap;
- asset/font loading.

Move non-critical startup work after first frame when product semantics allow it.

## Memory

Watch:
- image cache;
- retained controllers/listeners;
- large in-memory lists;
- global providers/singletons keeping feature state alive;
- duplicate model graphs.

## Platform views

Platform views can have rendering/interaction tradeoffs depending on platform and composition mode. Profile the actual target.

## Performance anti-patterns

- “widgets are expensive” as generic explanation;
- adding caches without invalidation;
- isolate for every JSON decode;
- premature `RepaintBoundary`;
- huge `build()` performing transformations;
- rebuilding whole app for a local toggle;
- loading entire dataset for infinite feed;
- shipping oversized images;
- performance testing only in debug mode.
