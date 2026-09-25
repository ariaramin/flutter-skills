# Performance Playbook

## Principle: measure in profile mode

Debug mode includes assertions, instrumentation, and compilation/runtime characteristics that invalidate many timing conclusions.

Before optimizing, identify the bottleneck category:

- build/layout;
- raster/painting/compositing;
- CPU computation;
- memory/GC;
- image decode/cache;
- I/O/network;
- startup;
- binary/build size.

## High-value structural checks

### 1. Heavy work in build

Look for parsing, sorting large collections, regex work, JSON decode, synchronous file operations, object graph construction, requests, logging loops.

Move expensive stable work out; compute derived values closer to source/state updates when appropriate.

### 2. Rebuild scope

- localize state changes;
- extract stable children;
- use const constructors naturally;
- use selector mechanisms if a broad listener is proven costly;
- avoid overriding widget equality as a rebuild hack.

### 3. Lazy scrolling

Prefer builders/slivers for large data. Provide `itemCount` when known. Avoid building offscreen expensive widgets eagerly.

### 4. Intrinsic layout

`IntrinsicWidth`/`IntrinsicHeight` add speculative layout. Avoid in deep/repeated trees where constraints can solve the same problem.

### 5. `shrinkWrap`

`shrinkWrap` is often necessary for small nested content, but can make scroll views measure more content. Prefer a unified sliver scroll structure for large dynamic pages.

### 6. Images

- avoid decoding huge images for tiny thumbnails;
- use cache dimensions/appropriate variants where available;
- investigate oversized-image diagnostics;
- pre-cache only when it improves a real interaction and does not explode memory.

### 7. Opacity/saveLayer/compositing

Fractional opacity and some effects can require offscreen buffers. Avoid wrapping a single image/color in `Opacity` when direct alpha is equivalent.

### 8. CPU isolates

Offload work that takes enough milliseconds to threaten frames. Do not offload tiny computations just because isolates sound faster.

### 9. Allocation

Do not allocate controllers, futures, streams, regexes, large lists/maps, or expensive immutable objects repeatedly in `build` when they can safely be stable.

But ordinary small widget objects are expected; do not prematurely cache every widget.

## Const guidance

Official Flutter performance guidance recommends const constructors when possible because stable identical widget instances can short-circuit traversal work.

Use lints to catch easy opportunities. Avoid cargo-cult claims such as “const prevents all rebuilds.” Parents can rebuild; const mainly gives stable canonical widget instances and reduces work when the framework reaches the same instance.

## MediaQuery specificity

Prefer aspect methods (`sizeOf`, `paddingOf`, etc.) over `MediaQuery.of` when only one field is needed, reducing rebuilds caused by unrelated media changes.

## Profiling workflow

1. Define scenario and device.
2. Run profile build.
3. Record timeline with DevTools.
4. Identify UI/raster spikes.
5. Toggle rebuild/repaint diagnostics if relevant.
6. Inspect CPU profile for expensive Dart work.
7. Inspect memory when leaks/GC suspected.
8. Inspect image/network views where relevant.
9. Apply one change.
10. Re-run the same trace and compare.

## Performance anti-patterns from tip culture

### “Replace `Container` with nested widgets for performance”

Treat as **Maintainability/Situational**, not a universal optimization. `Container` is a convenience widget that composes primitives; replace it when doing so clarifies intent or avoids unnecessary behavior in a hot path proven by profiling, not as a blanket style rule.

### “Use IntrinsicWidth, not fixed width”

The responsiveness intent is correct, but intrinsic sizing is not free. Prefer constraints/flex first.

### “Move everything to compute/isolate”

Wrong. Transfer/spawn overhead and web behavior matter.

### “Use const everywhere”

Prefer it where natural. Do not redesign runtime values around artificial const-ness.

## Verification metrics

Depending on the issue, compare:

- frame build/raster time;
- missed/janky frames;
- CPU samples;
- allocation/memory growth;
- image memory;
- startup duration;
- request count/data transfer;
- number/scope of rebuilds/repaints.
