---
name: flutter-image-performance
description: Diagnose, design, implement, optimize, review, and verify production Flutter image loading, decoding, resizing, caching, rendering, prefetching, animation, local assets, user-generated media, and lifecycle behavior across Android, iOS, macOS, Windows, Linux, and Web. Use this skill whenever a Flutter task involves slow or flickering images, image-heavy scrolling, memory/OOM issues, oversized downloads or decodes, ImageCache behavior, CDN thumbnails, `cacheWidth`/`cacheHeight`, `ResizeImage`, `precacheImage`, image formats, Web CORS/HTML image strategies, persistent image caching, SVG/vector assets, animated media, picker/camera images, image package selection, or any request to improve image performance—even if the user does not explicitly name image optimization.
compatibility: Requires repository/file inspection for real optimization work. Use profile/release-appropriate measurement and verify version-sensitive Flutter/Web/package behavior against the repository's pinned SDK before changing APIs or platform assumptions.
---
# Flutter Image Performance

## Mission
Optimize the complete pipeline:
```text
source → fetch/read → encoded bytes → decode/resample → decoded image
→ ImageCache → raster/texture → paint → display → eviction/disposal
```
Reduce wasted network, CPU, memory, GPU, storage, and battery work without sacrificing required quality, privacy, correctness, reliability, or maintainability. Never claim an optimization worked without before/after evidence when measurement is available.

## Operating Rules
1. Inspect before editing; identify the bottleneck before selecting a fix.
2. Distinguish transfer bytes, encoded dimensions, decoded dimensions, logical size, physical size, cache footprint, and renderer memory.
3. Prefer server/CDN resizing over downloading huge originals and fixing only client decode memory.
4. Decode close to actual display need where supported.
5. Treat Flutter `ImageCache` as in-memory image reuse, not persistent disk caching.
6. Keep large collections lazy and prefetch narrowly.
7. Bound caches, queues, retries, processing concurrency, and persistent storage.
8. Reserve stable layout geometry before an image arrives.
9. Keep provider/cache identities stable unless content identity changes.
10. Treat Web as a separate image platform.
11. Do not project Android/iOS native implementation details onto Flutter without evidence.
12. Add packages only for demonstrated capability gaps.
13. Let framework-owned resources remain framework-owned; explicitly dispose only directly owned low-level resources.
14. Test realistic constrained devices, DPRs, window sizes, and cache states.
15. Change one variable at a time and re-measure.
16. Record platform/version uncertainty instead of inventing guarantees.

## Version Gate
Before version-sensitive work inspect `pubspec.yaml`, `pubspec.lock`, target platforms, actual Flutter/Dart versions, and current API signatures. Inspect the exact Flutter tag/source when public docs conflict. Research baseline: Flutter 3.44.x / Dart 3.12.x-era behavior, 2026-08-09. Do not silently assume later Flutter behavior.

## Reference Routing
| Need | Read |
|---|---|
| Full API/workflow/cache/platform/package/testing guidance | `references/implementation-guide.md` |
| Findings, myths, contradictions, deprecated advice | `references/research-findings.md` |
| Exact Flutter/Dart/platform/package sources | `references/research-sources.md` |

Use `research-sources.md` for disputed, version-sensitive, platform-specific, or package-specific claims.

## Repository Inspection
Inspect:
- project SDK constraints, platforms, deployment minimums, existing traces/tests;
- usages of `Image.*`, `NetworkImage`, `AssetImage`, `FileImage`, `MemoryImage`, `ResizeImage`, `ImageProvider`, `precacheImage`, `imageCache`, custom `ImageStream` listeners, `ui.Image`, and `Codec`;
- image cache, SVG/vector, processing, picker/camera, HTTP, and CDN dependencies;
- remote URL construction, derivative parameters, crop/quality/format settings, versioning, signatures, authorization, and unnecessary URL changes;
- local asset dimensions, encoded bytes, density variants, duplicates, unused files, and giant startup assets;
- render geometry: logical size, DPR, physical target size, aspect ratio, crop, `BoxFit`, zoom, and maximum desktop/tablet dimensions;
- collections: lazy builders, prefetch distance, simultaneous loads, thumbnail/original choice, placeholders, animation, and memory during fast scroll;
- Web separately: CORS, origins, auth headers, `WebHtmlElementStrategy`, browser caching, service workers, and renderer/build path.

## Diagnostic Workflow
For each issue:
1. Define a reproducible workflow.
2. Record device, OS, SDK, build mode, dataset, and cache state.
3. Capture baseline metrics.
4. Classify the dominant cost.
5. Apply the smallest relevant change.
6. Repeat the identical scenario.
7. Compare equivalent metrics.
8. Keep only measurable improvements or clear correctness/resource-lifecycle fixes.

Classify as network/source, encoded bytes, decode/resample, decoded memory, cache churn, layout, paint, raster/GPU, animation, custom processing, or package/native integration. Do not prescribe a disk cache for decoded-memory pressure or an isolate for raster jank.

## Image Size Model
Always qualify "image size." Encoded/transfer bytes drive bandwidth, storage, latency, and network energy; decoded dimensions drive base bitmap memory. Use:
```text
decodedBytes ≈ width × height × bytesPerPixel
```
For common 32-bit output, plan with roughly 4 bytes/pixel:
```text
1000×1000 ≈ 3.8 MiB
3840×2160 ≈ 31.6 MiB
4000×4000 ≈ 61 MiB
```
These are base bitmap estimates, not total process/GPU formulas. Estimate useful physical dimensions with:
```text
physicalPixels ≈ logicalPixels × devicePixelRatio
```
Then adjust for crop, zoom, transforms, quality tolerance, stable CDN buckets, and responsive maximums.

## Source and Decode Sizing
Prefer `thumbnail → feed/card → detail → zoom/full`. For each use:
1. determine display geometry;
2. estimate physical need;
3. request a stable server/CDN derivative;
4. keep URL/content identity stable;
5. apply `cacheWidth`, `cacheHeight`, or `ResizeImage` when the source is still materially oversized and the path supports it;
6. verify quality.

Do not claim decode hints reduce network bytes or that every codec avoids full-resolution intermediate work. Do not animate decode dimensions because changing sizes can create repeated decodes/cache variants.

### Web decode exception
Current `Image.network` guidance documents network `cacheWidth`/`cacheHeight` as ignored on Web. Use source/CDN derivatives rather than assuming native decode hints work there.

## Cache Model
Always name the layer.

### Flutter `ImageCache`
In-process resolved/decoded reuse. Current documented defaults are roughly 1000 entries and 100 MB; defaults are not recommendations. Increasing retention can raise OOM risk, while shrinking it can cause decode/fetch churn. Current standard memory-pressure handling clears ordinary image-cache entries, so do not duplicate that reflexively.

### HTTP/browser cache
Encoded-response freshness/revalidation via mechanisms such as `Cache-Control`, `ETag`, `Last-Modified`, `Vary`, and versioned URLs. Separate from Flutter `ImageCache`.

### Disk/package cache
Add only for real persistent encoded-file reuse/offline requirements. Define hard limits for bytes/objects/files, age/freshness, eviction, privacy, logout/account switching, corruption recovery, and OS deletion. Treat cache directories as evictable.

### CDN cache
Use for derivatives, transforms, immutable/versioned assets, and origin reduction. Private media needs deliberate cache isolation.

## Stable Keys and Rebuilds
A rebuild does not inherently redownload or redecode an image. Inspect effective identity: URL, scale, headers where relevant, resize dimensions, custom provider key, and package cache key. Common churn causes include random cache-busting values, frequently regenerated signed URLs, exact per-pixel desktop resize URLs, changing resize hints, unstable custom equality/hashCode, and eviction pressure. Fix key instability before rewriting state management.

## Lists, Feeds, Galleries, and Prefetch
Use lazy builders/slivers. Prefer right-sized thumbnails, stable aspect ratios, bounded concurrent work, detail images only when relevant, static previews for expensive animations, and narrow predicted prefetch. Avoid eager full collections, full-resolution thumbnails, precaching whole feeds, dozens of high-resolution animations, and arbitrary huge offscreen cache windows.

Use `precacheImage` only for high-probability near-future images such as the next carousel/gallery page, likely hero destination, or a small critical asset set. Every prefetch spends resources before the user asks for them.

## Loading Layout and Placeholders
Reserve geometry with width/height, `AspectRatio`, known media dimensions, or stable card constraints. Prefer simple placeholders. Use `frameBuilder` for frame-aware transitions and `loadingBuilder` only when load progress matters; it can rebuild repeatedly. Profile animated skeletons, blur placeholders, and fade/effect chains in dense collections.

## Rendering Gate
If traces show paint/raster cost, inspect blur, `ImageFiltered`, `ShaderMask`, opacity, clipping, `saveLayer`, transforms, and repeated custom painting. Remember:
- `BoxFit` changes paint geometry, not transfer or decoded-memory size;
- `RepaintBoundary` is conditional, not blanket optimization;
- clipping is not universally slow;
- making a giant bitmap look small does not reclaim decode memory.

Profile before removing required visual design.

## Formats and Vectors
Safe guaranteed Flutter raster baseline: JPEG, PNG, GIF/animated GIF, WebP/animated WebP, BMP, WBMP. Treat AVIF, APNG, HEIF/HEIC, and additional formats as platform/version/path dependent unless verified. Choose formats by content, transparency, animation, transfer bytes, decode cost, quality, and compatibility; do not claim WebP is always best.

Flutter raster `Image` is not a general SVG renderer. Add vector tooling only for real vector input. Profile complex vectors with many paths, masks, gradients, or filters; compiled vector or pre-rasterized fixed-size output may be faster. Do not claim SVG is always smaller/faster than raster.

## Animated Images
Treat multiframe media separately. Measure frame dimensions, codec/decode work, memory, CPU, raster cost, battery, and simultaneous active count. Use static previews in large lists when acceptable. Respect `TickerMode` and accessibility animation settings. Do not claim Flutter retains every animation frame decoded forever; use the actual codec/frame lifecycle.

## User-Generated Images
For camera/gallery media:
1. acquire with a maintained platform-aware picker;
2. handle documented recovery/lifecycle semantics;
3. keep durable original only when required;
4. create a lightweight preview;
5. normalize orientation;
6. strip sensitive metadata when unnecessary;
7. resize/compress upload where appropriate;
8. generate server thumbnails;
9. show thumbnails in lists;
10. load larger media on demand.

For untrusted inputs cap encoded bytes, dimensions, and total pixel count. Reject malformed/unsupported data safely and do not trust file extensions alone.

## Private Images
Reason across URL, headers, redirects, browser cache, disk cache, CDN, and logout/account switching. Do not place long-lived bearer secrets in query strings for convenience. Signed URLs may be appropriate, but frequently changing signatures can destroy cache identity. Ensure one user's cached private images cannot leak to another user.

## Web Gate
Prefer fixing CORS at the image origin/CDN. Current API exposes `WebHtmlElementStrategy.never`, `fallback`, and `prefer`; the researched `Image.network` default is `never`. A higher-level Flutter Web guide was found to conflict by describing automatic fallback. Therefore inspect the exact SDK, choose the strategy explicitly, integration-test target browsers, and record the inconsistency when relevant.

HTML-element image rendering can trade CORS behavior for limitations such as custom-header restrictions, screenshot/effect limitations, and platform-view overhead. Do not use it as a universal workaround. Browser HTTP cache is separate from Flutter `ImageCache`; do not assume Flutter manages a service worker by default.

## Platform Gates
### Android
Test low-memory devices. Prioritize decoded dimensions, simultaneous images, memory pressure, network permission, picker lifecycle, and camera metadata. Do not claim every Flutter codec call maps directly to a specific Android decoder API.

### iOS/macOS
Prioritize Retina DPR, decoded-memory footprint, memory pressure, metadata, and native plugin behavior. Do not assume standard Flutter `NetworkImage` uses Apple `URLCache`; the researched native path uses Dart networking.

### Windows/Linux
Apply shared Flutter pipeline rules first, then account for high DPI, large/resizable windows, long-lived sessions, local files, and native codec/plugin dependencies. Use stable derivative buckets during resizing.

## Package Decision Gate
Start with Flutter SDK APIs. Add a package only for a concrete missing capability. Verify maintenance, publisher, current version, platforms, Web behavior, native dependencies, cache semantics, privacy/security, and dependency footprint. Persistent-cache packages do not solve oversized source downloads or decoded-memory waste automatically. The researched `cached_network_image` release explicitly documented minimal Web support without Web caching.

## Profiling
Use profile/release-appropriate measurement.

### Performance
Measure framework/UI frame time, raster time, jank, and build/layout/paint activity.

### Memory
Measure peak process memory, retained memory after navigation, allocation behavior, and cache footprint.

### Network
Measure request count, bytes, latency, and repeated URLs. Use browser Network tools for Web.

### CPU
Profile custom resize, compression, transforms, conversion, and image processing.

### App size
Inspect local image assets and density variants.

### Oversized-image debugging
Use `debugInvertOversizedImages` during development where relevant; it is not production behavior.

## Measurement Record
Record:
```text
Scenario:
Device / OS:
Flutter version:
Build mode:
Cache state:
Dataset:
Source dimensions:
Rendered logical dimensions:
DPR:
Requested derivative:
Transfer bytes:
Request count:
Peak memory:
Post-navigation memory:
ImageCache bytes/count:
Frame p50/p95/p99:
Janky frames:
CPU hotspot:
Quality notes:
```

## Anti-Patterns
Reject or correct:
- originals used as thumbnails;
- `BoxFit` presented as memory optimization;
- "Flutter automatically disk-caches network images";
- blindly increasing `ImageCache`;
- precaching whole feeds/galleries;
- arbitrary huge offscreen cache windows;
- URL changes on every rebuild;
- changing `cacheWidth` continuously;
- no constraints while loading;
- simultaneous high-resolution bursts;
- giant animations in lists;
- heavy placeholders everywhere;
- blanket `RepaintBoundary`;
- "WebP always wins";
- "SVG always wins";
- "rebuild means reload";
- "`cacheWidth` reduces network bytes";
- "`cacheWidth` works for Web network images";
- universal AVIF/APNG/HEIF support claims;
- iOS `URLCache` claims for standard Flutter `NetworkImage`;
- cache packages added before diagnosis;
- debug-only benchmarking.

## Migration Workflow
1. Record SDK/platform targets.
2. Capture baseline image-heavy scenarios.
3. Inventory providers, packages, and cache layers.
4. Find grossly oversized source requests.
5. Add server/CDN tiers where possible.
6. Apply stable decode sizing on supported targets.
7. Stabilize layout dimensions.
8. Keep collections lazy.
9. Bound prefetch/concurrency.
10. Fix unstable URLs/cache keys.
11. Audit `ImageCache` tuning.
12. Add disk caching only for a proven requirement.
13. Review animated media and camera/gallery originals.
14. Review Web independently.
15. Profile raster/effects.
16. Re-run identical scenarios.
17. Keep only evidence-backed changes.

Do not combine this migration with unrelated architecture/state-management rewrites.

## Reporting Format
```markdown
### Image performance change
- Symptom:
- Baseline evidence:
- Bottleneck class:
- Source dimensions:
- Render dimensions / DPR:
- Cache layers involved:
- Change:
- Trade-offs:
- Before/after metrics:
- Platform verification:
- Residual uncertainty:
```
If evidence is insufficient, state the gap.

## Production Gate
Approve only when applicable evidence shows:
- no known image OOM path on representative devices;
- failures/retries are bounded and corrupt/unsupported inputs fail safely;
- picker/camera recovery is handled where required;
- thumbnails/cards do not routinely fetch giant originals;
- cache identities and repeated requests are understood;
- private delivery does not expose credentials;
- decoded dimensions and peak memory are appropriate;
- cache behavior is bounded and custom resources do not leak;
- image-heavy scrolling meets product frame targets;
- loading preserves layout and expensive effects are trace-justified;
- animations are bounded and accessibility-aware;
- every cache layer is explicitly understood;
- persistent caches have retention/privacy policy;
- private-media logout/account-switch behavior is correct;
- Web CORS/render strategy is tested;
- Web does not rely on ignored decode hints;
- native codec/package assumptions are verified;
- desktop high-DPI/resizing behavior is tested where relevant;
- no unnecessary dependency or unrelated architecture rewrite was introduced;
- measurements use equivalent profile/release-appropriate scenarios;
- image quality remains acceptable.

If a critical gate cannot be evidenced, report the blocker instead of declaring the image stack optimized.
