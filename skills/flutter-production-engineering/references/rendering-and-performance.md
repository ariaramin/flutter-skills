# Rendering and performance playbook

## Establish evidence

Reproduce a specific interaction with representative data. Record hardware/browser, SDK, renderer, build mode, workload, warm-up, repeated samples, and acceptance metric. Native debug timings are unsuitable for speed claims; use profile mode and release validation. Browser tooling measures web main-thread tasks, transfer/loading, and memory.

Separate a verified bottleneck, plausible bottleneck, maintainability change, and speculative micro-optimization. A framework mechanism explains why a change may help; it does not establish a measured app improvement.

Widgets configure elements; render objects compute layout/record paints; the engine rasterizes scenes. Identify the limiting stage rather than equating rebuild counts with slow frames. Use CPU call stacks/timeline for Dart work, layout/build tracking for attribution, repaint diagnostics for paint, and frame raster timings for drawing. Disable expensive diagnostic tracking for comparable timings.

## Choose the stage-specific intervention

| Symptom and diagnosis | Smallest candidate | Verify / avoid |
| --- | --- | --- |
| Slow build / repeated expensive computation | Move lifecycle work out of build; narrow observation; reuse builder `child`; cache only expensive repeated derived values with valid inputs. | Compare CPU/build traces. `const` canonicalizes valid constant objects; it cannot prevent inherited updates or solve raster jank. |
| Repeated intrinsic/layout work | Fix constraints; use flex/slivers or valid known extents. | Test large text and changing content. Fixed extents are wrong if content can grow; small intrinsic layouts may be appropriate. |
| Expensive static subtree repaints with changing surroundings | Try a targeted `RepaintBoundary` after checking framework-inserted boundaries. | Compare repaint work and memory/layers. It isolates paint, not builds/layout, and engine raster caching is discretionary. |
| Slow raster, layers, blur or masks | Inspect `saveLayer`, large filters, clipping and group opacity. Simplify only with equivalent visuals. | Opacity grouping can differ from applying alpha to overlapping children. Ordinary clipping does not always create a saveLayer. |
| Animation repeatedly rebuilds stable content | Use builder `child`, implicit animation, transition widget, or painter repaint listenable as appropriate. | A transform changes painting without reflowing layout. Preserve hit testing, semantics, gesture interruption and reduced motion. |
| Large eager collection | Use a builder/slivers and pagination; keep durable row state outside evictable row subtrees. | Eager construction suits small fixed lists. Lazy builders still need bounded data and suitable identity; they do not solve all data memory. |
| Image feed memory/raster spikes | Reserve layout size; request suitable server assets; use supported decode dimensions near physical display size. | Approximate RGBA cost is width × height × 4, excluding extra buffers. Check quality, DPR and decoded memory. Web `Image.network` ignores decode-size hints; verify current API. |
| CPU parse/filter blocks UI | Improve algorithm first; native isolate if justified; browser worker or yielding batches for web. | Measure startup/transfer/publication and peak memory. Chunking one monolithic `jsonDecode` call does not yield inside it. No universal byte threshold. |
| Retained screens/resources after repeated navigation | Compare post-GC snapshots and retaining paths; fix owned listener/controller/cache references. | Distinguish reachable leaks from expected caches and transient allocation. Inspect native/external memory too. |
| Slow network or storage | Trace duplicate calls, payloads, serialization, query/index plans, transactions, and request sequencing. | Deduplicate safe reads; paginate/batch where semantics permit. Future concurrency is not CPU parallelism or automatic cancellation. |
| Slow first usable frame | Trace critical initialization; defer only non-critical work and display a useful shell. | Measure cold/warm startup separately. Do not defer essential key/storage/error setup blindly; post-frame synchronous work can stall the next frame. |
| Large release artifact | Compare same-target release size reports and asset/dependency contributions. | Upload archive, installed size and end-user download size differ; do not equate them. |

## Runtime and renderer caveats

A 60 Hz display has about 16.7 ms between refreshes; 120 Hz has about 8.3 ms. UI and raster stages are pipelined; timings cannot be reduced to one universal budget or blindly summed into end-to-end latency. Judge missed frames and interaction latency on the target.

Check active renderer and SDK before applying shader advice. Impeller's precompiled engine shaders address a category of shader compilation jank; they do not guarantee all frames are cheap. Web renderer threading is distinct from Dart isolate availability. Avoid prescribing an obsolete HTML renderer or shader warm-up recipe from another backend.

A retained snapshot or bounded cache may trade memory for CPU; measure both. Use `StringBuffer` for substantial iterative string construction and appropriate collection algorithms when profiling shows that work matters, not as a rewrite of every small expression.

## Measurement procedure and stopping

1. Record baseline and target; add a timeline label around a suspected expensive stage when useful.
2. Change one cause, preserve output/error semantics, and rerun the same workload with representative repetitions.
3. Compare relevant percentiles, stalls, retained/peak memory, startup, or size. Retain raw traces and environment details; report variance instead of invented precision.
4. Revert a candidate that adds cost without meeting the target. Stop once acceptance criteria hold; missing hardware/browser evidence remains a reported gap.

For size analysis, first inspect `flutter build <target> --help`. The documented native targets include apk, appbundle, ios, linux, macos and windows; supply a single architecture where the installed CLI requires it. Do not assume `flutter build web --analyze-size` is supported: inspect web output and browser transfer/compression separately. Keep symbol maps matched to the exact release if obfuscation is used; it is not secret protection or a guaranteed size improvement.

Sources: performance/DevTools/build-mode/app-size/Impeller guides and RepaintBoundary, Image.network, compute, Isolate.run APIs in [sources](sources.md).
