# Performance and resources

Performance discipline for code shipped inside other people's apps. Every claim below is labeled: **documented** (official docs state the behavior), **measure-first** (benefit depends on the consumer workload), or **convention**. Strength labels per SKILL.md §1.

## Principles

- Package performance costs multiply across every consumer. But packages have no app of their own — the `example/` app and `benchmark/` directory are the measurement harnesses.
- Classify optimizations: documented → apply when relevant; measure-first → profile in the example app before committing complexity; speculative → drop. No numeric claim in docs/changelog without a reproducible measurement (device, mode, workload, metric).
- Flutter timing budget context (documented): frames "well under 16 ms total in profile mode" mean the consumer likely has headroom; 120 Hz targets need "under 8 ms". Never hand consumers a widget that eats that budget by default.

## Widget performance (documented)

- `build()` runs on any ancestor rebuild — the package does not control frequency. Keep it cheap; split large builds by "how they change", not just encapsulation. Reusable UI pieces: `StatelessWidget` classes over builder functions.
- Scope `setState`/notification to the changing subtree; "all descendent widgets rebuild" when state changes at a parent.
- **Child pass-down pattern**: accept a `child` widget and reuse the same instance across ticks — rebuild traversal "stops when the same instance of the child widget as the previous frame is re-encountered" (the `TransitionBuilder`/`SlideTransition` technique). Use for animated wrappers around consumer content.
- Never override `operator ==` on widgets to force that shortcut: documented O(N²) risk; leaf widgets are the only exception and caching beats them.
- `saveLayer` triggers offscreen buffer allocation (sources: `ShaderMask`, `ColorFilter`, `Chip` with non-opaque disabled color, `Text` overflow shader). Where your package can trigger it, document when, how to avoid it, and when it's unavoidable — an explicit documentation duty for package authors. Prefer semitransparent colors over `Opacity` widgets for shapes/text; `FadeInImage` over animating `Opacity`; `borderRadius` over clip rects; `Clip.antiAliasWithSaveLayer` never.
- Collections: lazy builders (`ListView.builder`-style APIs, slivers) for large/unbounded content; eager children only for small fixed sets; fixed extents (`itemExtent`) avoid the intrinsic layout pass when correct under text scaling.
- Validation tooling: DevTools "Track layouts", `checkerboardOffscreenLayers` / `checkerboardRasterCacheImages` in the example app expose your package's raster behavior.

Source: https://docs.flutter.dev/perf/best-practices

## Concurrency and async (documented)

- `Isolate.run` for expensive CPU work on native platforms: no shared memory; the worker transfers the result after a transferability check ("It does not copy the data"); errors propagate to the awaiting future. The same page also says short-lived isolates pay spawn cost and copy objects sent between isolates. Do not describe all isolate traffic as zero-copy. **Flutter web does not support isolates** — a public API that only works via isolates needs a web story (chunked async, workers, or documented platform exclusion).
- Repeated identical work belongs in a long-lived isolate (`Isolate.spawn` + ports + `Isolate.exit`), not per-call `Isolate.run`. Isolates do not remove platform-channel serialization.
- Public async APIs: return futures callers can't orphan silently — document error behavior; provide cancellation where the operation owns cancellable resources. Timer/periodic work in a package class needs disposal (`tearDown` in tests proves it).
- Streams: single-subscription by default (broadcast only when multiple listeners are real); close streams and cancel subscriptions on dispose; a leaked stream subscription is the canonical package memory leak. `Stream`-returning APIs should emit errors, not swallow them, and document completion semantics.

Sources: https://dart.dev/language/isolates , https://dart.dev/language/concurrency

## Allocation and runtime costs (measure-first, with documented specifics)

- String building in loops: `StringBuffer`, not `+` concatenation (documented).
- Choose data structures for the operation actually performed (lookup vs iteration vs append); avoid repeated conversions between representations in hot paths. These are measure-first: profile the example workload before restructuring.
- Platform-channel calls serialize on both sides and cross a thread boundary — batch chatty calls (documented channel model is async message passing; batching is the standard engineering response). Prefer Pigeon's typed calls or FFI for hot native paths; Pigeon's experimental FFI/JNI mode exists specifically for low-latency sync calls.

## Code size and startup (documented mechanisms, measure-first outcomes)

- Every consumer's app embeds package code: keep dependencies minimal (each one adds transitives and size), avoid `dart:mirrors` (tree-shaking/banned on several targets), keep implementation in `lib/src` so dead-code elimination can work.
- Deferred loading (`deferred as`) can split rarely-used package parts, but it adds load-time complexity — measure-first.
- Measure with `flutter build apk --analyze-size` (native targets) or `--dump-info` for web builds from the example app; compare before/after in the same SDK.

## Benchmarks

- `benchmark/` is the official directory convention; `benchmark_harness` (first-party) provides the harness pattern. Run on the target platform with release/profile-mode timing semantics; debug-mode numbers are not evidence.
- Publish benchmarks in the repo so regressions are comparable across versions; reference them from performance claims in docs.
