# Reference: Compiled/live/source/network cache layers, precaching, rendering strategy, repeated vectors, precompiled .vec assets, memory/startup/scroll performance, dynamic SVG security, Web, mobile, and desktop.

> Preserved from `flutter_svg Engineering Skill for Flutter.md`, source lines 1642-2300.

## Contents

- [Caching](#caching)
  - [Layer 1: compiled SVG cache](#layer-1-compiled-svg-cache)
  - [Layer 2: live Picture reuse](#layer-2-live-picture-reuse)
  - [Layer 3: source-byte caching](#layer-3-source-byte-caching)
  - [Network HTTP cache](#network-http-cache)
  - [Cache key influences](#cache-key-influences)
- [Precaching](#precaching)
  - [Important](#important)
  - [Precache only when](#precache-only-when)
  - [Do not precache](#do-not-precache)
- [Rendering and Parsing Performance](#rendering-and-parsing-performance)
  - [Parsing](#parsing)
  - [Painting](#painting)
  - [File size is not enough](#file-size-is-not-enough)
- [Rendering Strategy](#rendering-strategy)
  - [`picture`](#picture)
  - [`raster`](#raster)
  - [Decision rule](#decision-rule)
- [Large Lists and Repeated Icons](#large-lists-and-repeated-icons)
  - [Same small icon repeated](#same-small-icon-repeated)
  - [Prefer `Icon` when equivalent](#prefer-icon-when-equivalent)
  - [Avoid giant illustrations per row](#avoid-giant-illustrations-per-row)
  - [Keep dimensions bounded](#keep-dimensions-bounded)
  - [Rebuild only what changes](#rebuild-only-what-changes)
- [Complex Illustrations](#complex-illustrations)
- [Vector Graphics / Precompiled Assets](#vector-graphics-precompiled-assets)
  - [Use precompiled vectors when](#use-precompiled-vectors-when)
  - [Do not precompile automatically when](#do-not-precompile-automatically-when)
  - [Binary format compatibility](#binary-format-compatibility)
- [Memory Optimization](#memory-optimization)
  - [Compiled cache count](#compiled-cache-count)
  - [Raster strategy memory](#raster-strategy-memory)
  - [Network bytes](#network-bytes)
  - [Dynamic unique SVGs](#dynamic-unique-svgs)
- [Startup Optimization](#startup-optimization)
  - [Startup-critical](#startup-critical)
  - [Noncritical](#noncritical)
  - [Measure](#measure)
- [Scrolling Optimization](#scrolling-optimization)
- [Network Performance](#network-performance)
  - [1. HTTP transport cache](#1-http-transport-cache)
  - [2. Persistent byte cache](#2-persistent-byte-cache)
  - [3. flutter_svg compiled cache](#3-fluttersvg-compiled-cache)
  - [4. live rendered representation](#4-live-rendered-representation)
  - [Static remote artwork](#static-remote-artwork)
  - [Frequently changing remote artwork](#frequently-changing-remote-artwork)
- [Security of Dynamic SVG](#security-of-dynamic-svg)
  - [flutter_svg is not a sanitizer](#fluttersvg-is-not-a-sanitizer)
  - [Parser/compiler denial-of-service considerations](#parsercompiler-denial-of-service-considerations)
  - [Authentication](#authentication)
  - [Do not execute arbitrary SVG as an interactive document](#do-not-execute-arbitrary-svg-as-an-interactive-document)
- [Flutter Web](#flutter-web)
  - [Assets](#assets)
  - [Remote sources](#remote-sources)
  - [`File`](#file)
  - [Performance](#performance)
  - [WASM](#wasm)
- [Mobile and Desktop](#mobile-and-desktop)

---

# Caching

This section must be understood precisely.

## Layer 1: compiled SVG cache

`flutter_svg` has an in-memory cache of compiled vector `ByteData`.

Current behavior:

- loader cache keys identify sources/configuration;
- pending identical loads can share a Future;
- completed compiled data is retained in an LRU-style cache;
- default maximum size is **100 entries**;
- cache size is count-based, not byte-size-based;
- cache can be cleared or individual entries evicted.

Relevant global access:

```dart
svg.cache.maximumSize
svg.cache.clear()
svg.cache.evict(...)
```

Do not mutate cache settings without a measured reason.

## Layer 2: live Picture reuse

`vector_graphics` maintains a live picture cache/reference count so concurrently active widgets using the same picture can reuse it. When the last live user releases that picture, it is removed and disposed.

This is different from the persistent compiled `ByteData` cache.

## Layer 3: source-byte caching

Not every source loader promises that raw source bytes themselves remain cached.

For precompiled assets, first-party `AssetBytesLoader` documentation notes that source binary asset bytes are not inherently cached by that loader and Flutter asset-bundle behavior matters.

## Network HTTP cache

Do not say:

```text
flutter_svg cache == HTTP cache
```

`SvgNetworkLoader` performs HTTP loading and `flutter_svg` can cache its compiled output by loader key, but that does not create a standards-complete persistent HTTP cache, CDN cache, ETag policy, disk cache, or offline strategy.

## Cache key influences

Expect distinct cache entries when relevant input differs, including:

- SVG source;
- URL;
- headers;
- asset path/package;
- asset bundle;
- theme;
- `ColorMapper`.

Design stable values where reuse matters.

---

# Precaching

Old `precachePicture`-style APIs from the pre-2.0 package should not be reintroduced.

Current first-party vector-graphics tooling exposes manual loading through `vg.loadPicture(...)`.

Example targeted warm-up:

```dart
import 'package:flutter_svg/flutter_svg.dart';
import 'package:vector_graphics/vector_graphics.dart'
    as vg;

Future<void> warmCriticalSvg(
  BuildContext context,
) async {
  final pictureInfo =
      await vg.loadPicture(
    const SvgAssetLoader(
      'assets/illustrations/hero.svg',
    ),
    context,
  );

  pictureInfo.picture.dispose();
}
```

## Important

Manual loading can warm relevant loader/compiled data paths, but it does not mean every resulting rendering object should remain permanently retained.

Dispose manually loaded `Picture` objects that you own.

## Precache only when

- first-use latency is visible;
- asset is highly likely to be used soon;
- profiling shows parsing/decoding contributes materially;
- startup memory cost is acceptable.

Good candidates:

- splash-to-home hero vector;
- immediately opening first-route illustration;
- highly visible transition artwork.

## Do not precache

- every SVG in the application;
- deep feature assets;
- thousands of remote icons;
- huge illustrations "just in case."

Preloading moves work and memory earlier; it does not eliminate cost.

---

# Rendering and Parsing Performance

## Parsing

Current SVG loaders parse/compile SVG into `vector_graphics` binary data, with parsing work moved through `compute`. The compiled representation is cached.

## Painting

Once decoded, vector painting still has a per-frame cost that depends on the actual drawing operations.

Expensive SVG characteristics can include:

- many paths;
- complex paths;
- gradients;
- masks/clips;
- many overlapping layers;
- large transforms;
- embedded images;
- large render area.

## File size is not enough

Do not review performance with:

```text
SVG is only 8 KB, therefore cheap.
```

A heavily optimized text file can encode very expensive geometry.

Profile runtime work.

---

# Rendering Strategy

Current `SvgPicture` exposes:

```dart
renderingStrategy:
```

with default:

```dart
RenderingStrategy.picture
```

`RenderingStrategy.raster` is available through the `vector_graphics` rendering stack. `flutter_svg` exposed this setting in its current 2.x release line.

If code references the enum directly, make `vector_graphics` an explicit project dependency rather than relying on a transitive import.

```dart
import 'package:flutter_svg/flutter_svg.dart';
import 'package:vector_graphics/vector_graphics_compat.dart'
    show RenderingStrategy;

SvgPicture.asset(
  'assets/illustrations/complex_background.svg',
  width: 800,
  height: 500,
  fit: BoxFit.cover,
  renderingStrategy:
      RenderingStrategy.raster,
);
```

## `picture`

Prefer for:

- icons;
- logos;
- small illustrations;
- graphics that scale dynamically;
- graphics affected by arbitrary parent transforms;
- highest vector scaling flexibility.

## `raster`

Consider after profiling for:

- very complex vectors;
- large static backdrops;
- vectors repeatedly painted at a stable scale.

The first-party rendering implementation explains that raster mode can reuse a raster image frame-to-frame and significantly improve complicated-vector performance, but it can become pixelated when later parent transforms/scaling differ from the scale used to rasterize.

## Decision rule

```text
Complex vector?
↓
Profile picture mode
↓
Raster thread expensive?
↓
Display scale stable?
↓
Test raster strategy
↓
Compare visual quality + memory + frame time
```

Do not set raster mode globally.

---

# Large Lists and Repeated Icons

SVG-heavy scrolling UI requires special care.

## Same small icon repeated

Good:

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(
      leading: SvgPicture.asset(
        'assets/icons/document.svg',
        width: 20,
        height: 20,
        excludeFromSemantics: true,
      ),
      title: Text(
        items[index].title,
      ),
    );
  },
);
```

Stable asset identity allows compiled-cache reuse.

## Prefer `Icon` when equivalent

If a standard icon is repeated 5,000 times, use `Icon`.

## Avoid giant illustrations per row

Bad:

```dart
ListView.builder(
  itemBuilder: (context, index) {
    return SvgPicture.asset(
      uniqueComplexIllustrations[index],
      height: 300,
    );
  },
);
```

Potential issues:

- many unique compiled cache entries;
- many live pictures;
- high raster cost;
- heavy memory use.

Alternatives:

- thumbnails;
- raster versions;
- simplified list representation;
- show full vector only on detail screen.

## Keep dimensions bounded

A 20×20 icon should not accidentally receive full-screen bounds.

## Rebuild only what changes

State management should avoid rebuilding an entire SVG-heavy list when one unrelated counter changes.

This is a general Flutter architecture issue, not an SVG-cache issue.

---

# Complex Illustrations

When an SVG is expensive:

1. Inspect source geometry.
2. Remove unsupported/unnecessary constructs.
3. Profile current runtime.
4. Try precompiled `.vec`.
5. Try `RenderingStrategy.raster` if scale is stable.
6. Compare with raster export.
7. Choose the simplest approach meeting visual requirements.

Do not spend days micro-optimizing vector rendering when a fixed 2×/3× raster illustration is visually identical and dramatically cheaper.

---

# Vector Graphics / Precompiled Assets

`flutter_svg` officially supports loading assets precompiled by `vector_graphics_compiler`.

Build:

```bash
dart run vector_graphics_compiler \
  -i assets/illustrations/hero.svg \
  -o assets/illustrations/hero.svg.vec
```

Render:

```dart
import 'package:flutter_svg/flutter_svg.dart';
import 'package:vector_graphics/vector_graphics.dart'
    show AssetBytesLoader;

const hero = SvgPicture(
  AssetBytesLoader(
    'assets/illustrations/hero.svg.vec',
  ),
  width: 320,
  height: 200,
);
```

The first-party README describes precompilation as avoiding runtime SVG parsing and enabling compile-time vector optimizations such as clipping/masking/overdraw optimizations.

## Use precompiled vectors when

- complex bundled SVG parsing is measurable;
- many critical vectors are shown immediately;
- startup/transition profile shows parsing work;
- build-pipeline complexity is acceptable.

## Do not precompile automatically when

- there are only a few tiny icons;
- runtime parsing is negligible;
- development pipeline would become significantly harder;
- artwork changes dynamically at runtime.

## Binary format compatibility

Important: `vector_graphics_codec` does **not** promise the binary `.vec` format is stable across arbitrary package versions. The compiler and runtime are tightly coupled.

Therefore:

- generate `.vec` files using a compiler version compatible with the runtime dependencies;
- regenerate them after relevant vector-graphics upgrades;
- treat SVG source as the maintainable source of truth;
- do not treat `.vec` as a permanent archival interchange format.

---

# Memory Optimization

Think about all retained representations:

```text
source strings/bytes
compiled ByteData cache
live Picture objects
optional rasterized image
widget tree
application-level byte cache
```

## Compiled cache count

Current SVG cache defaults to 100 compiled entries.

One entry can still be large.

Do not assume:

```text
100 entries == low memory
```

## Raster strategy memory

Rasterization trades draw work for an image allocation approximately tied to rendered pixel dimensions.

A huge 2000×2000 rasterized backdrop can consume meaningful image/GPU memory even if vector painting becomes cheaper.

## Network bytes

If your application caches remote SVG bytes in memory **and** `flutter_svg` caches compiled representations, both can remain resident.

Have an explicit cache budget.

## Dynamic unique SVGs

Avoid feeding an unbounded stream of unique SVG strings into a long-running application.

Example risk:

```text
user-generated chart every second
→ unique source
→ many compiled cache entries
```

Bound application-level history and review `svg.cache.maximumSize` only after profiling.

---

# Startup Optimization

Do not front-load every vector operation.

## Startup-critical

Candidates:

- splash transition logo;
- hero art on initial route;
- first-screen icon set if parsing is measurably visible.

Options:

- bundle asset;
- precompile;
- targeted warm-up.

## Noncritical

Let deep-route assets load lazily.

Bad:

```text
main()
↓
preload 300 SVGs
↓
runApp()
```

This trades runtime responsiveness for startup latency and memory.

## Measure

Capture:

- time to first frame;
- time to interactive;
- first frame containing critical artwork;
- memory after startup.

---

# Scrolling Optimization

When SVGs correlate with scroll jank:

1. Confirm jank in profile mode.
2. Inspect UI-thread and raster-thread frame timing.
3. Determine whether the vector is reparsing or only repainting.
4. Check source/cache-key stability.
5. Count unique SVG assets.
6. Inspect path/gradient/clip complexity.
7. Check rendered dimensions.
8. Remove unnecessary clipping/layers.
9. Try simpler artwork.
10. Test precompiled `.vec`.
11. Test `RenderingStrategy.raster` for stable-scale complex art.
12. Compare with raster thumbnails.
13. Reprofile.

Do not infer the cause from a code review alone.

---

# Network Performance

Separate four concerns.

## 1. HTTP transport cache

Owned by:

- HTTP client;
- browser;
- proxy/CDN;
- application networking layer.

## 2. Persistent byte cache

Owned by application if implemented:

```text
URL
↓
disk/memory cache
↓
SVG bytes
```

## 3. flutter_svg compiled cache

Caches the compiled representation by loader key.

## 4. live rendered representation

Managed by `vector_graphics`.

Do not make a statement such as:

> `SvgPicture.network` means the server SVG is cached offline.

That is not a complete guarantee.

## Static remote artwork

If a remote SVG changes only with app releases, bundle it.

## Frequently changing remote artwork

Use versioned URLs or application cache invalidation policy.

Avoid indefinitely serving an old compiled representation when the URL remains unchanged but server content changes unexpectedly.

---

# Security of Dynamic SVG

Treat remote or user-controlled SVG as untrusted content.

## flutter_svg is not a sanitizer

Do not assume arbitrary SVG is safe merely because it is parsed rather than displayed in a browser DOM.

Implement source controls according to the threat model:

- trusted origins;
- response size limit;
- request timeout;
- MIME/content validation where appropriate;
- maximum accepted complexity if your product processes arbitrary user SVGs;
- application-level rejection/fallback;
- current package versions.

## Parser/compiler denial-of-service considerations

Recent `vector_graphics_compiler` releases added protections against circular references and exponential reference expansion/"Billion Laughs SVG"-style resource exhaustion.

If your application processes untrusted SVG:

- inspect the lockfile;
- stay on a current security-fixed compatible compiler;
- set network/content-size limits outside the renderer;
- profile/restrict pathological artwork;
- do not rely on parser fixes as the only resource-control layer.

## Authentication

Avoid putting secrets into image URLs.

If remote SVG needs auth, prefer a controlled networking layer when:

- token refresh;
- secure header handling;
- retries;
- telemetry;
- disk caching;

are important.

Then pass validated bytes to `SvgPicture.memory`.

## Do not execute arbitrary SVG as an interactive document

`flutter_svg` is intended to render static SVG artwork, not provide a general browser-style scripting/interactivity environment.

---

# Flutter Web

## Assets

Bundled assets work through Flutter's web asset system.

## Remote sources

Browser CORS rules apply.

`flutter_svg` does not bypass:

- CORS;
- browser network policy;
- HTTPS/mixed-content restrictions.

If a remote server does not permit your web origin, fix:

- server CORS;
- CDN;
- trusted backend proxy;

rather than attempting to disable browser security.

## `File`

Do not rely on native `dart:io File`.

Use browser-selected bytes with `SvgPicture.memory`.

## Performance

Test in target browsers.

Do not extrapolate mobile rendering numbers to web.

## WASM

Current `flutter_svg` release history includes modern WASM support fixes. Keep the package current if targeting current Flutter Web/WASM configurations.

---

# Mobile and Desktop

The core vector pipeline is shared, but platform differences can still affect:

- filesystem access;
- network implementation;
- font availability;
- GPU/raster behavior;
- device pixel ratio;
- memory budget.

Do not add platform-specific SVG logic unless a measured or functional difference requires it.

---
