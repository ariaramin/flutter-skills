# Complete Flutter Image Performance Implementation Guide

## Contents

- [Purpose](#purpose)
- [Version Gate](#version-gate)
- [When to Use](#when-to-use)
- [Optimization Priority](#optimization-priority)
- [Core Principles](#core-principles)
  - [1. Measure before optimizing](#1-measure-before-optimizing)
  - [2. "Image size" is not one quantity](#2-image-size-is-not-one-quantity)
  - [3. Request appropriately sized remote images](#3-request-appropriately-sized-remote-images)
  - [4. Decode close to required dimensions](#4-decode-close-to-required-dimensions)
  - [5. Separate all cache layers](#5-separate-all-cache-layers)
  - [6. Lazy-load large collections](#6-lazy-load-large-collections)
  - [7. Bound prefetching](#7-bound-prefetching)
  - [8. Preserve layout while loading](#8-preserve-layout-while-loading)
  - [9. Keep cache keys stable](#9-keep-cache-keys-stable)
  - [10. Optimize the server when the server is the bottleneck](#10-optimize-the-server-when-the-server-is-the-bottleneck)
  - [11. Test the weakest realistic hardware](#11-test-the-weakest-realistic-hardware)
  - [12. Treat animated images separately](#12-treat-animated-images-separately)
- [Resource Cost Model](#resource-cost-model)
  - [Fetch/read](#fetchread)
  - [Encoded bytes](#encoded-bytes)
  - [Decode/resample](#decoderesample)
  - [Decoded image](#decoded-image)
  - [Upload/raster/render](#uploadrasterrender)
- [Repository Inspection Workflow](#repository-inspection-workflow)
  - [Establish project context](#establish-project-context)
  - [Search image APIs](#search-image-apis)
  - [Inspect dependencies](#inspect-dependencies)
  - [Inspect remote URL construction](#inspect-remote-url-construction)
  - [Inspect local assets](#inspect-local-assets)
  - [Inspect rendered dimensions](#inspect-rendered-dimensions)
  - [Inspect collection behavior](#inspect-collection-behavior)
  - [Inspect Web separately](#inspect-web-separately)
  - [Inspect evidence](#inspect-evidence)
- [Diagnostic Decision Tree](#diagnostic-decision-tree)
  - [Symptom: slow first image load](#symptom-slow-first-image-load)
  - [Symptom: scrolling jank](#symptom-scrolling-jank)
  - [Symptom: memory pressure or OOM](#symptom-memory-pressure-or-oom)
  - [Symptom: repeated downloads](#symptom-repeated-downloads)
  - [Symptom: blurry images](#symptom-blurry-images)
  - [Symptom: Web-only image failure](#symptom-web-only-image-failure)
  - [Symptom: excessive application size](#symptom-excessive-application-size)
- [Built-In Flutter APIs](#built-in-flutter-apis)
  - [`Image`](#image)
  - [`Image.network`](#imagenetwork)
  - [`NetworkImage`](#networkimage)
  - [`AssetImage`](#assetimage)
  - [`FileImage`](#fileimage)
  - [`MemoryImage`](#memoryimage)
  - [`ResizeImage`](#resizeimage)
  - [`precacheImage`](#precacheimage)
  - [`ImageCache`](#imagecache)
  - [`ImageStream` / `ImageStreamCompleter`](#imagestream-imagestreamcompleter)
  - [`dart:ui.Codec` / `ImageDescriptor`](#dartuicodec-imagedescriptor)
- [Remote Image Workflow](#remote-image-workflow)
  - [Step 1 — Determine display geometry](#step-1-determine-display-geometry)
  - [Step 2 — Estimate useful physical dimensions](#step-2-estimate-useful-physical-dimensions)
  - [Step 3 — Select a stable remote derivative](#step-3-select-a-stable-remote-derivative)
  - [Step 4 — Select format and quality](#step-4-select-format-and-quality)
  - [Step 5 — Fetch](#step-5-fetch)
  - [Step 6 — Decode](#step-6-decode)
  - [Step 7 — Cache at the correct layers](#step-7-cache-at-the-correct-layers)
  - [Step 8 — Keep layout stable](#step-8-keep-layout-stable)
  - [Step 9 — Handle failure](#step-9-handle-failure)
  - [Step 10 — Measure](#step-10-measure)
- [Image Sizing Rules](#image-sizing-rules)
  - [Avatars](#avatars)
  - [Product-grid images](#product-grid-images)
  - [Feed images](#feed-images)
  - [Hero/detail images](#herodetail-images)
  - [Gallery thumbnails](#gallery-thumbnails)
  - [Full-screen gallery images](#full-screen-gallery-images)
  - [Zoomable images](#zoomable-images)
  - [Desktop/resizable windows](#desktopresizable-windows)
- [Cache Strategy](#cache-strategy)
- [Memory Cache](#memory-cache)
  - [Owner](#owner)
  - [Contains](#contains)
  - [Benefits](#benefits)
  - [Costs](#costs)
  - [Failure modes](#failure-modes)
  - [Rule](#rule)
- [HTTP Cache](#http-cache)
  - [Owner](#owner)
  - [Contains](#contains)
  - [Benefits](#benefits)
  - [Important headers](#important-headers)
  - [Rule](#rule)
- [Browser Cache](#browser-cache)
  - [Owner](#owner)
  - [Benefits](#benefits)
  - [Caveats](#caveats)
- [Disk Cache](#disk-cache)
  - [Owner](#owner)
  - [Use when](#use-when)
  - [Requirements](#requirements)
- [CDN Cache](#cdn-cache)
  - [Owner](#owner)
  - [Best use](#best-use)
- [ImageCache Tuning](#imagecache-tuning)
- [Performance Workflow](#performance-workflow)
  - [Baseline](#baseline)
  - [Profile build](#profile-build)
  - [Classify](#classify)
  - [Change one variable](#change-one-variable)
  - [Compare](#compare)
- [Memory Optimization](#memory-optimization)
  - [Estimate dangerous images early](#estimate-dangerous-images-early)
  - [Detect oversized images](#detect-oversized-images)
  - [Prefer source resizing first](#prefer-source-resizing-first)
  - [Avoid duplicate representations](#avoid-duplicate-representations)
  - [Low-memory devices](#low-memory-devices)
- [Network Optimization](#network-optimization)
  - [Cache-Control](#cache-control)
  - [Validators](#validators)
- [Rendering Optimization](#rendering-optimization)
  - [Constraints](#constraints)
  - [`BoxFit`](#boxfit)
  - [Clipping](#clipping)
  - [Opacity](#opacity)
  - [Filters and shaders](#filters-and-shaders)
  - [Transformations](#transformations)
  - [`RepaintBoundary`](#repaintboundary)
  - [Image-heavy animation](#image-heavy-animation)
- [Responsive Images](#responsive-images)
- [Local Assets](#local-assets)
  - [Resolution-aware assets](#resolution-aware-assets)
  - [Bundle size](#bundle-size)
  - [Startup](#startup)
- [Platform-Specific Guidance](#platform-specific-guidance)
- [Android](#android)
- [iOS](#ios)
- [macOS](#macos)
- [Windows](#windows)
- [Linux](#linux)
- [Web](#web)
  - [`cacheWidth` / `cacheHeight`](#cachewidth-cacheheight)
  - [CORS](#cors)
  - [HTML image strategy](#html-image-strategy)
  - [Renderer](#renderer)
  - [Browser cache](#browser-cache)
  - [Service workers](#service-workers)
- [Image Formats](#image-formats)
  - [JPEG](#jpeg)
  - [PNG](#png)
  - [WebP](#webp)
  - [GIF](#gif)
  - [APNG](#apng)
  - [AVIF](#avif)
  - [HEIF / HEIC](#heif-heic)
- [Animated Images](#animated-images)
- [SVG and Vector Images](#svg-and-vector-images)
- [User-Generated Images](#user-generated-images)
  - [Selection](#selection)
  - [Preview](#preview)
  - [Upload](#upload)
  - [Metadata](#metadata)
  - [Android picker lifecycle](#android-picker-lifecycle)
  - [Temporary files](#temporary-files)
  - [Input safety](#input-safety)
- [Placeholders and Loading UX](#placeholders-and-loading-ux)
  - [Static placeholders](#static-placeholders)
  - [`frameBuilder`](#framebuilder)
  - [`loadingBuilder`](#loadingbuilder)
  - [Blur/LQIP placeholders](#blurlqip-placeholders)
  - [Accessibility](#accessibility)
- [Error Handling and Reliability](#error-handling-and-reliability)
  - [Retryable/transient](#retryabletransient)
  - [Permanent/not-found](#permanentnot-found)
  - [Authentication](#authentication)
  - [Expired signed URL](#expired-signed-url)
  - [Codec/data failure](#codecdata-failure)
  - [Offline](#offline)
- [Security and Privacy](#security-and-privacy)
  - [Authentication headers](#authentication-headers)
  - [Signed URLs](#signed-urls)
  - [Redirects](#redirects)
  - [Sensitive image caches](#sensitive-image-caches)
  - [CORS proxies](#cors-proxies)
  - [Local paths](#local-paths)
- [Third-Party Package Decision Guide](#third-party-package-decision-guide)
  - [`cached_network_image`](#cachednetworkimage)
  - [`flutter_cache_manager`](#fluttercachemanager)
  - [`flutter_svg` / `vector_graphics`](#fluttersvg-vectorgraphics)
  - [`image_picker`](#imagepicker)
- [State Management and Rebuilds](#state-management-and-rebuilds)
- [Lifecycle Management](#lifecycle-management)
  - [Framework-managed images](#framework-managed-images)
  - [Manually owned resources](#manually-owned-resources)
  - [App backgrounding](#app-backgrounding)
- [Specialized Use Cases](#specialized-use-cases)
  - [Social feeds](#social-feeds)
  - [Product grids](#product-grids)
  - [Photo galleries](#photo-galleries)
  - [Chat applications](#chat-applications)
  - [Maps/tile-like imagery](#mapstile-like-imagery)
  - [Background images](#background-images)
  - [Image editors](#image-editors)
- [Common Anti-Patterns](#common-anti-patterns)
- [Anti-Myth Rules](#anti-myth-rules)
  - ["Cached network images are always faster."](#cached-network-images-are-always-faster)
  - ["Flutter automatically disk-caches all remote images."](#flutter-automatically-disk-caches-all-remote-images)
  - ["WebP is always the best format."](#webp-is-always-the-best-format)
  - ["SVG is always more efficient than PNG."](#svg-is-always-more-efficient-than-png)
  - ["Every rebuild reloads the image."](#every-rebuild-reloads-the-image)
  - ["Small compressed files use little memory."](#small-compressed-files-use-little-memory)
  - ["`cacheWidth` always improves performance."](#cachewidth-always-improves-performance)
  - ["Precaching everything improves UX."](#precaching-everything-improves-ux)
  - ["Increasing ImageCache always helps."](#increasing-imagecache-always-helps)
  - ["`RepaintBoundary` around every image helps."](#repaintboundary-around-every-image-helps)
  - ["Fade-in is free."](#fade-in-is-free)
  - ["`Image.network` automatically implements responsive image delivery."](#imagenetwork-automatically-implements-responsive-image-delivery)
  - ["A third-party network-image cache is mandatory for production."](#a-third-party-network-image-cache-is-mandatory-for-production)
- [Failure Recovery](#failure-recovery)
  - [HTTP 404](#http-404)
  - [Authentication failure](#authentication-failure)
  - [Web CORS](#web-cors)
  - [Corrupted image](#corrupted-image)
  - [Unsupported codec](#unsupported-codec)
  - [OOM](#oom)
  - [Scrolling jank](#scrolling-jank)
  - [Repeated requests](#repeated-requests)
  - [Cache churn](#cache-churn)
  - [Blurry output](#blurry-output)
  - [Excessive bundle size](#excessive-bundle-size)
- [Verification Checklist](#verification-checklist)
- [Production Definition of Done](#production-definition-of-done)
- [Agent Operating Rules](#agent-operating-rules)
- [Evidence and Reporting Template](#evidence-and-reporting-template)


> Preserved from the user-supplied skill draft. Use this reference for detailed API, workflow, platform, package, testing, and failure-recovery guidance. The active `SKILL.md` is the concise execution layer.

# Flutter Image Performance & Remote Image Optimization

## Purpose

Use this skill to inspect, diagnose, implement, and optimize image handling in real Flutter repositories.

Optimize for the best practical combination of:

- rendering and scrolling performance
- startup and responsiveness
- network efficiency
- decoded-memory efficiency
- CPU and GPU efficiency
- battery efficiency
- image quality
- caching effectiveness
- reliability
- cross-platform compatibility
- maintainability

Treat image optimization as a measured systems problem spanning:

source → fetch/read → encoded bytes → decode/resample → memory cache → raster/texture → paint → display → eviction/disposal

Do not optimize only the `Image` widget while ignoring the source image, CDN, cache hierarchy, decode dimensions, or actual rendered dimensions.

## Version Gate

Before using version-sensitive recommendations:

1. Read the repository's Flutter/Dart constraints and lockfiles.
2. Run or inspect `flutter --version` when repository execution is available.
3. Identify all target platforms.
4. Check APIs against the project's actual SDK rather than assuming latest behavior.
5. Prefer current APIs over copied historical examples.

Research baseline for this skill: Flutter documentation reflecting Flutter 3.44.7, Dart 3.12.x-era stable behavior, August 2026.

Version-sensitive points include:

- Flutter Web renderer behavior.
- `WebHtmlElementStrategy`.
- `cacheWidth`/`cacheHeight` behavior on Web.
- supported image codecs.
- `ImageProvider` loading APIs.
- scroll prefetch APIs.
- memory-pressure handling.
- third-party package platform support.

`ScrollView.cacheExtent` is deprecated in the current SDK line. When explicitly controlling a scroll view's offscreen cache extent, use the current `scrollCacheExtent` API when supported by the repository's Flutter version.

## When to Use

Apply this skill when:

- remote images load slowly
- a feed or grid stutters
- image-heavy pages consume excessive RAM
- image screens crash with out-of-memory failures
- fast scrolling causes frame drops
- images repeatedly download or decode
- thumbnails fetch original-resolution files
- a gallery retains too much memory
- image loading hurts startup
- avatars flicker or repeatedly reload
- placeholders cause layout jumps
- Web images fail because of CORS
- Web images behave differently from mobile
- authenticated images need caching
- local assets inflate application size
- image quality is blurry or unnecessarily high
- animated images consume excessive resources
- a caching package is being considered
- an application needs a production image architecture
- a performance claim about images needs verification

## Optimization Priority

When several problems exist, normally prioritize:

1. crashes and out-of-memory failures
2. severe frame jank
3. unnecessary giant image downloads
4. excessive decoded dimensions
5. repeated unnecessary requests
6. cache misuse
7. excessive memory retention
8. poor loading/error UX
9. bundle-size inefficiencies
10. minor rendering micro-optimizations

Never trade correctness, security, or visibly required image quality for insignificant performance gains.

## Core Principles

### 1. Measure before optimizing

Do not claim an optimization is beneficial merely because it is a common recommendation.

Establish a baseline, make one targeted change, and measure again.

### 2. "Image size" is not one quantity

Always distinguish:

| QuantityMeaningMain cost |                                             |                             |
| ------------------------ | ------------------------------------------- | --------------------------- |
| File size                | Bytes stored in an asset/file               | storage/bundle              |
| Transfer size            | Bytes sent over network                     | bandwidth, latency, battery |
| Encoded size             | Compressed JPEG/PNG/WebP/etc. bytes         | storage/network             |
| Encoded dimensions       | Pixel width × height stored in source       | potential decode cost       |
| Decoded dimensions       | Pixel width × height of decoded bitmap      | RAM                         |
| Logical display size     | Flutter logical pixels occupied by widget   | layout                      |
| Physical display size    | logical size × device pixel ratio           | useful source resolution    |
| GPU texture/storage      | Renderer-side image representation          | GPU/shared memory           |
| Cache footprint          | Decoded objects and/or encoded cached files | RAM/disk                    |
| Animated-frame footprint | Current/next/codec frame resources          | RAM/CPU                     |

A 1 MB JPEG can decode into tens of megabytes.

Compressed byte size is not a reliable predictor of runtime memory.

### 3. Request appropriately sized remote images

If a card renders an image at approximately 160 logical pixels wide on a 3× display, a roughly 480-pixel-wide derivative is a sensible starting point.

Do not routinely download a 4000-pixel original for that card.

Use server/CDN resizing whenever practical because it can reduce:

- transfer bytes
- latency
- radio/network energy
- encoded input handled by the decoder
- server-to-client waste

Client `cacheWidth` does not reduce the bytes downloaded from an unchanged remote URL.

### 4. Decode close to required dimensions

On supported non-Web paths, use `cacheWidth`, `cacheHeight`, or `ResizeImage` when a large source would otherwise produce an unnecessarily large decoded bitmap.

Treat these APIs as controls on decoded/cached output dimensions.

Do not make a cross-platform promise that every codec performs all resizing before all decoding work. Decoder implementation details vary.

For Flutter Web network images, current `Image.network` documentation explicitly says `cacheWidth` and `cacheHeight` are ignored.

### 5. Separate all cache layers

Never use "cached image" without identifying the layer.

Flutter's `ImageCache` is an in-memory framework image cache. It is not a persistent disk cache.

Possible layers are:

1. Flutter decoded-memory `ImageCache`
2. browser HTTP cache on Web
3. native/custom encoded-file disk cache
4. package-managed cache directory
5. CDN edge cache
6. origin cache

Each has different keys, eviction, privacy, and freshness behavior.

### 6. Lazy-load large collections

Use builder/sliver-based lists and grids for large image collections.

Do not instantiate an entire feed or gallery just to make images "ready."

### 7. Bound prefetching

Preload only images likely to be needed soon and only when the measured UX benefit justifies the memory/network cost.

Never "precache all images."

### 8. Preserve layout while loading

Provide stable constraints or aspect ratios before the image arrives.

Unexpected image dimensions can trigger visible layout changes.

### 9. Keep cache keys stable

Rebuilding a widget is not inherently an image reload.

Actual consequences depend on the resolved image-provider cache key and whether the relevant cache entry remains available.

Avoid:

- unnecessary cache-busting query parameters
- continuously changing CDN dimensions
- continuously changing decode dimensions
- unstable custom `ImageProvider` keys

### 10. Optimize the server when the server is the bottleneck

Do not attempt to solve:

- 8 MB thumbnails
- slow image origins
- missing HTTP cache headers
- absent derivatives
- unbounded originals

entirely in Flutter.

### 11. Test the weakest realistic hardware

Image memory and decode spikes that look acceptable on a flagship phone can cause severe problems on low-memory Android hardware or older desktops.

### 12. Treat animated images separately

Animated formats add scheduling, repeated frame decode, memory, and battery considerations.

Do not assume the cost model of a static JPEG applies to a GIF or animated WebP.

## Resource Cost Model

When diagnosing a pipeline, classify the cost by stage.

### Fetch/read

Consumes:

- network bandwidth for remote images
- radio/network energy
- TLS/connection latency
- storage I/O for local/disk-cached images
- CPU for protocol and copying

### Encoded bytes

Consume:

- transfer bytes
- asset/application bundle size
- disk-cache space
- temporary buffers

### Decode/resample

Consumes primarily:

- CPU/native decoder resources
- temporary memory
- potentially significant frame time if work overlaps critical rendering periods

### Decoded image

Consumes:

- application/native memory
- Flutter image-cache budget while cached
- additional resources for animated images

Approximate base bitmap memory:

`decodedBytes ≈ width × height × bytesPerPixel`

A common planning approximation is 4 bytes per pixel for 32-bit RGBA/ARGB output.

Examples:

- 1000 × 1000 × 4 ≈ 4 MB
- 3840 × 2160 × 4 ≈ 31.6 MiB
- 4000 × 4000 × 4 ≈ 61 MiB

Actual memory can be higher because of:

- row alignment
- codec state
- temporary decode buffers
- multiple image/frame handles
- animation
- raster/GPU storage
- mipmaps or renderer-specific representations

### Upload/raster/render

Can consume:

- GPU/shared memory
- memory bandwidth
- raster-thread time
- fragment processing
- extra render targets for some effects

Do not assume GPU memory is always exactly another copy of decoded bitmap memory. Renderer/platform implementation varies.

## Repository Inspection Workflow

Before editing image code, inspect the repository.

### Establish project context

Inspect:

- `pubspec.yaml`
- `pubspec.lock`
- SDK constraints
- target platforms
- deployment minimums
- application architecture
- existing profiling reports

### Search image APIs

Find usages of:

- `Image(`
- `Image.asset`
- `Image.network`
- `Image.file`
- `Image.memory`
- `NetworkImage`
- `AssetImage`
- `FileImage`
- `MemoryImage`
- `ResizeImage`
- `ImageProvider`
- `precacheImage`
- `PaintingBinding.instance.imageCache`
- custom `ImageStream` listeners
- custom codecs / `dart:ui.Image`
- custom `ImageProvider`s

### Inspect dependencies

Identify:

- network-image cache packages
- file-cache packages
- SVG/vector packages
- image-processing packages
- image-picker/camera packages
- HTTP clients
- CDN SDKs

Do not introduce another package before understanding the existing stack.

### Inspect remote URL construction

Determine:

- whether the backend/CDN supports resize parameters
- width/height variants
- crop modes
- quality
- format negotiation
- URL versioning
- signatures
- authorization
- whether URL parameters change unnecessarily every rebuild

### Inspect local assets

Record:

- dimensions
- encoded byte sizes
- duplicate assets
- 1×/2×/3× variants
- unused files
- very large photographs
- startup-critical assets

### Inspect rendered dimensions

For important screens determine:

- logical width/height
- DPR
- physical target dimensions
- `BoxFit`
- crop/aspect ratio
- possible desktop/tablet maximums
- whether zoom is supported

### Inspect collection behavior

For feeds/grids/galleries inspect:

- lazy builders
- slivers
- prefetch/cache extent
- concurrent image loads
- placeholder behavior
- full-resolution versus thumbnail URLs
- offscreen animation
- cache churn during fast scroll

### Inspect Web separately

Check:

- image origin
- CORS headers
- authentication headers
- `WebHtmlElementStrategy`
- browser caching headers
- service-worker behavior, if any
- CanvasKit/skwasm target behavior

### Inspect evidence

Before optimizing, collect:

- network request counts
- transfer bytes
- response dimensions
- frame timings
- memory peak
- memory after returning from image-heavy screen
- decode/CPU spikes
- ImageCache size/count where useful

## Diagnostic Decision Tree

### Symptom: slow first image load

Check in order:

1. network latency
2. DNS/TLS/connection establishment
3. transfer size
4. source dimensions
5. CDN proximity
6. backend image-processing latency
7. decode cost
8. placeholder UX
9. whether bounded next-image prefetch would help

Prefer a smaller CDN derivative over merely decoding the same giant download smaller.

### Symptom: scrolling jank

Check:

1. frame timeline
2. decoded source dimensions
3. number of simultaneous image loads
4. decode spikes
5. lazy construction
6. list/grid layout passes
7. unstable dimensions causing layout work
8. filters/clipping/opacity/saveLayer work
9. animated images
10. cache churn
11. excessive offscreen prefetch

Typical fixes:

- thumbnail derivatives
- decode-size hints
- stable aspect ratios
- lazy slivers
- bounded prefetch
- reduced effect cost
- fewer simultaneous high-resolution loads

### Symptom: memory pressure or OOM

Check:

1. decoded image dimensions, not only file sizes
2. animated images
3. full-resolution gallery images
4. global ImageCache settings
5. custom disk/decoded caches
6. manually retained `ui.Image`s/codecs/listeners
7. duplicate representations
8. image-editor buffers
9. low-memory device behavior

Do not increase cache limits in response to an OOM.

### Symptom: repeated downloads

Determine whether the repeated activity is:

- HTTP transfer
- disk-cache lookup
- decode
- ImageCache miss
- different URL
- different resize key

Check:

- URL stability
- query signatures
- CDN derivative parameters
- custom provider equality/hash semantics
- HTTP cache headers
- package disk-cache freshness
- ImageCache churn

### Symptom: blurry images

Check:

1. requested server dimensions
2. decoded dimensions
3. physical display dimensions
4. DPR
5. scaling after decode
6. incorrect asset variant
7. filter quality
8. zoom requirements

Do not blindly fetch the original. Increase the derivative only enough to satisfy actual rendering/zoom needs.

### Symptom: Web-only image failure

Check:

1. same-origin versus cross-origin URL
2. CORS response headers
3. authentication headers
4. `WebHtmlElementStrategy`
5. restrictions of HTML-element rendering
6. browser network console
7. MIME/codec support
8. CSP/site policy where applicable

Prefer fixing CORS at the image host/CDN.

### Symptom: excessive application size

Check:

- oversized local raster assets
- unused assets
- duplicate density variants
- inappropriate lossless formats
- bundled originals that are never displayed
- package assets

Use Flutter application-size analysis before and after.

## Built-In Flutter APIs

### `Image`

High-level widget for rendering an `ImageProvider`.

Use when Flutter's standard image pipeline is sufficient.

Provide final constraints whenever possible.

### `Image.network`

Use for straightforward network images.

Supports:

- request headers on supported byte-fetch paths
- loading/error builders
- `cacheWidth`/`cacheHeight`
- Web HTML-element strategies
- common image presentation properties

Important rules:

- Flutter's image-memory cache is not persistent disk caching.
- On Web, network-image `cacheWidth`/`cacheHeight` are ignored.
- HTML-element Web rendering cannot use non-empty custom headers and ignores some rendering options.
- On Android, network access requires the Internet permission.

### `NetworkImage`

Use when an `ImageProvider` is needed instead of a widget.

On native `dart:io` targets, Flutter's standard implementation uses a reusable Dart `HttpClient`, sends supplied request headers, follows the client's redirect behavior, and expects a successful final response. Failed loads are not an implicit unlimited retry mechanism.

Do not assume native `NetworkImage` automatically uses a persistent operating-system HTTP disk cache.

### `AssetImage`

Use for resolution-aware Flutter asset variants.

Organize density variants such as:

- `1.0x`
- `2.0x`
- `3.0x`

Flutter resolves the appropriate asset using `ImageConfiguration` and device pixel ratio.

### `FileImage`

Use for native local files.

Not available as a normal file-system image provider on Flutter Web.

If the underlying file contents change while the cache key remains the same, evict the stale provider entry as appropriate.

### `MemoryImage`

Use for encoded image bytes already held in memory.

Do not load huge files into `Uint8List` unnecessarily merely to display them.

### `ResizeImage`

Wrap another provider to request a target decoded/cached output size.

Use when:

- the underlying provider has no convenient `cacheWidth`/`cacheHeight`
- a custom provider needs an explicit target size
- the original is significantly larger than the rendered result

Avoid dynamically changing its size every animation frame: distinct resize values can produce distinct decodes/cache entries.

### `precacheImage`

Use for a bounded number of images with a high probability of imminent display.

Good candidates:

- the next carousel image
- the next gallery image
- an immediately upcoming route hero
- a small set of critical UI assets

Bad candidates:

- an entire infinite feed
- every full-resolution gallery item
- every image at startup

### `ImageCache`

Access through:

`PaintingBinding.instance.imageCache`

Current framework defaults are approximately:

- 1000 entries
- 100 MB maximum cached bytes

These are framework defaults, not recommended product-specific values.

Current framework memory-pressure handling invokes `imageCache.clear()` when the OS reports memory pressure. Live images retained by active listeners are distinct from ordinary keep-alive cache entries.

Only alter global cache limits when measurements demonstrate that the defaults cause a real problem.

### `ImageStream` / `ImageStreamCompleter`

Usually let the `Image` widget manage listeners.

If custom code adds listeners manually:

- remove listeners when ownership ends
- do not retain streams indefinitely without need
- understand who owns/disposes any direct `ImageInfo`/`ui.Image` handles

### `dart:ui.Codec` / `ImageDescriptor`

Use low-level APIs only when direct frame/codec control is actually required.

Direct consumers are responsible for resource lifecycle, including codec/image disposal as documented by the API.

Do not replace the framework-managed pipeline with manual codec code merely for perceived performance.

## Remote Image Workflow

For each important remote image:

### Step 1 — Determine display geometry

Record:

- logical width
- logical height
- `BoxFit`
- crop behavior
- maximum responsive size

### Step 2 — Estimate useful physical dimensions

Start with:

`targetPixels ≈ logicalPixels × devicePixelRatio`

This is a planning estimate, not an inviolable formula.

Adjust for:

- zoom
- transforms
- crop
- CDN buckets
- responsive resizing
- quality requirements

### Step 3 — Select a stable remote derivative

Prefer a stable server/CDN bucket at or modestly above useful physical dimensions.

Avoid generating a new URL for every tiny layout-width change on resizable desktop windows.

### Step 4 — Select format and quality

Choose by content and platform capability.

Do not assume one format is universally optimal.

### Step 5 — Fetch

Use:

- stable URLs
- appropriate authentication
- HTTP validators/cache headers where the HTTP caching layer supports them
- connection reuse from the HTTP stack

### Step 6 — Decode

On supported platforms, request a decoded size near the render need if the downloaded encoded image is still much larger.

### Step 7 — Cache at the correct layers

Choose separately:

- decoded-memory reuse
- HTTP/browser cache
- disk file cache
- CDN cache

### Step 8 — Keep layout stable

Reserve image dimensions/aspect ratio before content arrives.

### Step 9 — Handle failure

Classify the failure before retrying.

### Step 10 — Measure

Compare:

- transfer bytes
- request count
- memory
- frame performance
- decode activity
- perceived loading

## Image Sizing Rules

### Avatars

Request roughly the displayed physical diameter.

Prefer one stable, versioned avatar URL per user/content revision.

Do not download original camera photographs into a 32–64 logical pixel avatar.

### Product-grid images

Use dedicated thumbnail/card variants.

Full product images belong on detail/zoom surfaces.

### Feed images

Use a width bucket close to the feed cell's physical width.

Use an aspect ratio or known dimensions before loading.

### Hero/detail images

Use a larger derivative sufficient for the destination display.

Precache only when navigation is probable enough to justify it.

### Gallery thumbnails

Never use full originals as the thumbnail source unless the original itself is already appropriately small.

### Full-screen gallery images

Load viewport-appropriate images when the page becomes relevant.

For large collections, prefetch only a narrow neighbor window.

### Zoomable images

Use progressive levels:

1. thumbnail/preview
2. viewport-resolution image
3. larger resolution or tiles when the user actually zooms

Avoid decoding an enormous original at initial page entry merely because zoom is technically possible.

### Desktop/resizable windows

Use stable width/height buckets rather than exact per-pixel URL parameters to preserve cache reuse.

## Cache Strategy

## Memory Cache

### Owner

Flutter framework `ImageCache`.

### Contains

Resolved decoded image resources for reuse.

### Benefits

- avoids repeated fetch/decode while entry remains cached
- smooth reuse of frequently shown images

### Costs

- RAM retention
- possible pressure on low-memory devices

### Failure modes

- cache too large → excessive retention/OOM risk
- cache too small → decode/fetch churn
- many resize variants → cache fragmentation

### Rule

Measure before changing limits.

## HTTP Cache

### Owner

HTTP implementation/browser/proxy depending platform and architecture.

### Contains

HTTP responses/encoded representations.

### Benefits

- conditional validation
- reduced repeated transfers
- freshness semantics

### Important headers

- `Cache-Control`
- `ETag`
- `Last-Modified`
- `Vary`

### Rule

Do not confuse HTTP cache behavior with Flutter `ImageCache`.

## Browser Cache

### Owner

Browser.

Especially relevant for Flutter Web and HTML image elements.

### Benefits

- persistent HTTP caching according to browser policy/headers
- browser-managed encoded-image reuse

### Caveats

- not equivalent to Flutter decoded-memory cache
- browser eviction policy is not controlled like an application-owned database
- private images need appropriate caching policy

## Disk Cache

### Owner

Application/package/native HTTP stack if explicitly implemented.

Flutter's standard `ImageCache` does not provide this.

### Use when

- repeat remote downloads materially hurt UX/bandwidth
- offline image access is required
- image files are expensive to regenerate/fetch
- cache policy can be defined safely

### Requirements

Define:

- maximum bytes/object count
- age/freshness
- eviction
- privacy
- logout behavior
- encryption requirements if relevant
- corruption handling

Do not add disk caching without an eviction policy.

## CDN Cache

### Owner

Image CDN/edge.

### Best use

- public or correctly isolated cacheable derivatives
- resizing/cropping
- format/quality transformation
- immutable versioned asset URLs
- origin-load reduction

Server/CDN work often has greater network impact than a client-side widget tweak.

## ImageCache Tuning

Before adjusting the global cache:

1. capture current `currentSize`, `currentSizeBytes`, and behavior during the problematic workflow
2. measure memory peaks and cache churn
3. identify target device memory constraints
4. modify one limit
5. repeat the identical scenario
6. keep the change only if the data supports it

Never copy arbitrary cache settings from another application.

## Performance Workflow

Use:

baseline → profile → classify bottleneck → targeted change → profile again → compare

### Baseline

Record at least:

- cold-cache behavior
- warm-cache behavior
- frame times
- peak memory
- image transfer bytes
- request count
- approximate source and decoded dimensions

### Profile build

Do not benchmark image performance solely in debug mode.

Use:

- profile mode on representative Android/iOS/desktop hardware
- browser performance tooling for Flutter Web
- release-mode sanity checks where appropriate

Avoid treating emulator/simulator timing as representative of real GPU/device performance.

### Classify

Determine whether the primary cost is:

- network
- decode
- memory
- layout
- paint
- raster
- GPU/effects
- cache churn

### Change one variable

Examples:

- CDN width derivative
- cache decode width
- placeholder implementation
- prefetch window
- format
- filter/effect
- cache policy

### Compare

Use the same scenario and hardware.

Prefer reproducible traces over subjective impressions.

## Memory Optimization

### Estimate dangerous images early

A 4000×4000 bitmap at 4 bytes/pixel is roughly 61 MiB before extra overhead.

Several such images can exceed practical memory budgets quickly.

### Detect oversized images

Use Flutter's oversized-image debug tooling during development where applicable.

`debugInvertOversizedImages` can flag images decoded substantially larger than required for their display.

It works only with assertions enabled.

### Prefer source resizing first

Where possible:

1. resize at origin/CDN
2. then use an appropriate client decode size if still beneficial

Source resizing also reduces network and encoded-buffer costs.

### Avoid duplicate representations

Do not hold all of these without need:

- original encoded `Uint8List`
- decoded `ui.Image`
- another decoded processing buffer
- encoded transformed output
- cached full-resolution copy

### Low-memory devices

Specifically test:

- feed fast scroll
- opening/closing large galleries repeatedly
- returning from background
- image editor operations
- several animated images simultaneously

## Network Optimization

Prefer:

- derivatives near actual physical display size
- CDN edge delivery
- stable/versioned URLs
- effective HTTP caching
- bounded retries
- thumbnail/detail separation
- format/quality appropriate to content

Avoid:

- downloading originals for thumbnails
- unique random query strings every build
- repeated expiring URLs when a stable cache identity is possible
- retry storms
- authentication secrets in durable public URLs

### Cache-Control

For immutable versioned public image URLs, long-lived cacheability is often appropriate.

For mutable URLs, use deliberate freshness/revalidation policy.

For personalized/private images, apply cache directives appropriate to the security model.

### Validators

Where the HTTP layer supports standard HTTP caching:

- ETags
- Last-Modified
- conditional requests

can reduce retransfers when data has not changed.

## Rendering Optimization

### Constraints

Provide stable dimensions or `AspectRatio`.

### `BoxFit`

`BoxFit` controls how a decoded image is painted into its destination.

It does not:

- reduce network transfer
- inherently reduce decode size
- shrink ImageCache memory

### Clipping

Use clipping only when visually required.

A normal rounded clip is not automatically a performance disaster, but clipping has rendering cost and some clip/effect combinations can require more expensive compositing.

Profile repeated clipping in dense scrolling surfaces.

### Opacity

Avoid unnecessary large-tree opacity layers.

When image-specific opacity APIs can express the same result, prefer the narrowest operation.

### Filters and shaders

Potentially expensive operations include:

- large blurs
- `ImageFiltered`
- `ShaderMask`
- repeated complex `ColorFiltered` work
- effect chains
- operations that force offscreen layers

Cost depends on:

- image size
- filter radius
- renderer
- update frequency
- hardware

Never label an effect "slow" without context, but do profile it when used repeatedly or on large images.

### Transformations

Transforming an already decoded giant image to look small does not recover the decoded-memory cost.

### `RepaintBoundary`

Do not put one around every image.

Use a boundary when repaint isolation is meaningful and profiling shows it helps.

Raster caching/repaint isolation can itself consume resources.

### Image-heavy animation

Do not animate unnecessarily:

- decode dimensions
- source URLs
- large blur radii
- giant image transforms combined with expensive filters

## Responsive Images

For a displayed logical dimension `L` and device pixel ratio `D`:

`usefulPixels ≈ L × D`

Then consider:

- crop behavior
- interpolation
- available CDN buckets
- zoom
- expected maximum size
- quality tolerance

Prefer the closest suitable stable bucket.

Example:

- card width: 180 logical px
- DPR: 3
- approximate physical need: 540 px

A 600 px derivative may be appropriate.

A 4000 px original usually is not.

Do not add large arbitrary oversampling factors "for Retina."

## Local Assets

### Resolution-aware assets

Use Flutter asset variants where appropriate:

- base/1×
- 2.0x
- 3.0x
- other justified densities

`AssetImage` chooses a suitable representation based on image configuration/DPR.

### Bundle size

Remove:

- unused original photographs
- duplicate generated assets
- unnecessary resolution variants
- images that can be safely compressed or replaced

Use Flutter application-size analysis to verify impact.

### Startup

Do not precache an entire asset library during startup.

Only warm critical assets when their first-frame/early-route benefit is measurable.

## Platform-Specific Guidance

## Android

Important considerations:

- decoded images can expand far beyond encoded JPEG/WebP sizes
- low-RAM devices have little room for multiple large bitmaps
- Android documentation uses 4 bytes/pixel as a common ARGB\_8888 planning cost
- load/serve images near the UI's required resolution
- repeated allocation/GC pressure harms responsiveness and battery
- network images require Internet permission

Do not assume Android's native `BitmapFactory`/`ImageDecoder` APIs map one-to-one to every Flutter codec implementation.

Test low-end hardware.

## iOS

Important considerations:

- physical/Retina resolution affects useful source dimensions
- decoded memory is governed by pixel dimensions, not compressed file size
- memory warnings require reloadable resources to be releasable
- native ImageIO supports downsampling patterns, but do not claim a particular Flutter code path uses every native ImageIO optimization unless verified for the target SDK
- camera images can contain orientation/GPS metadata

Flutter's standard native `NetworkImage` should not be assumed to use Apple's `URLCache` simply because UIKit/Foundation applications can use it; Flutter's standard native network-image implementation uses Dart networking.

## macOS

Apply the same core Flutter image pipeline principles as other native platforms.

Account for:

- Retina DPR
- large resizable windows
- large local photographs
- potentially much larger visible regions than phones

Do not invent macOS-specific optimization rules without evidence.

## Windows

Account for:

- high-DPI displays
- window resizing
- large desktop gallery surfaces
- local-file workflows

Bucket remote derivative sizes so small window-resize changes do not create endless cache keys.

Use platform-native codecs beyond Flutter's guaranteed list only if compatibility has been tested.

## Linux

Apply the shared Flutter image/cache/decode model.

Be conservative about platform-dependent codecs not in Flutter's guaranteed support list.

For specialized native libraries, document deployment/package dependencies explicitly.

## Web

Treat Web as a distinct image platform.

### `cacheWidth` / `cacheHeight`

Current `Image.network` documentation says they are ignored for network images on Web because decoding is delegated to Web facilities that do not expose Flutter's custom decode-size behavior.

Therefore responsive source sizing is especially important.

### CORS

Prefer a CORS-enabled image host/CDN.

Current `Image.network` API exposes:

- `WebHtmlElementStrategy.never`
- `fallback`
- `prefer`

The current API default is `never`.

There is a current documentation inconsistency: Flutter's Web image guide states that cross-origin failures automatically fall back to HTML `<img>`, while the current `Image.network` API says HTML-element behavior is disabled by default unless a different strategy is selected.

For production work:

1. trust the concrete API behavior for the project's SDK
2. explicitly choose a strategy instead of depending on ambiguous fallback behavior
3. integration-test the target Flutter version/browser

### HTML image strategy

HTML-element rendering can bypass some CORS restrictions, but current Flutter documentation lists meaningful limitations including:

- platform-view overhead/suboptimal performance
- no custom request headers
- inability to be captured by screenshot widgets
- ignored image effects/options such as some filtering/blurring/color/opacity behavior

Do not use it as a universal CORS workaround.

### Renderer

Current Flutter Web supports CanvasKit and skwasm depending build mode/browser support.

Do not copy native codec/decode assumptions blindly to Web.

### Browser cache

HTML images can use browser HTTP caching.

Use correct HTTP caching headers at the image host/CDN.

### Service workers

Current Flutter Web does not generate/manage a service worker by default.

If the product requires advanced offline Web image caching, design a service-worker strategy deliberately and test update behavior.

## Image Formats

Flutter's current `Image` API guarantees support for:

- JPEG
- PNG
- GIF
- animated GIF
- WebP
- animated WebP
- BMP
- WBMP

The underlying platform may decode additional formats.

"May work through platform decoding" is not the same as "guaranteed cross-platform Flutter support."

### JPEG

Best default candidate for:

- photographic content without transparency

Trade-offs:

- lossy
- efficient transfer at practical quality
- decoded memory still depends on pixel dimensions

### PNG

Best candidate for:

- lossless graphics
- alpha
- hard-edged UI assets where lossless quality is needed

Large photographic PNGs can be wasteful.

### WebP

Flutter guarantees static and animated WebP.

Useful for:

- lossy or lossless raster content
- transparency
- animation

Do not assume it always decodes faster or uses less runtime memory than every alternative.

### GIF

Supported, including animation.

Use cautiously for large/long animations.

Its legacy format characteristics can make it inefficient compared with newer approaches.

### APNG

Do not assume APNG is part of Flutter's guaranteed codec list.

Browser/platform support can differ.

### AVIF

Do not assume universal Flutter support.

As of this research baseline, AVIF remains outside Flutter's guaranteed codec list and the Flutter repository still tracks explicit AVIF support as a feature request.

Browser/native-platform AVIF capability does not imply all Flutter targets will decode it through the same pipeline.

### HEIF / HEIC

Platform APIs may support these formats.

They are not part of Flutter's guaranteed cross-platform image-format list.

Normalize/convert when true cross-platform interoperability is required.

## Animated Images

Multi-frame images require different analysis from static images.

Consider:

- frame pixel dimensions
- frame duration
- decode work
- codec state
- current/next frame resources
- listener lifecycle
- battery use

Current Flutter `Image` documentation states multiframe images can be paused by `TickerMode` and by disabled-animation accessibility state.

Use that behavior when an animated image should not run.

For large lists:

- avoid numerous large animated images running simultaneously
- prefer static previews until an item is actively relevant
- keep dimensions modest
- profile CPU, memory, and raster behavior

Do not automatically use GIF/WebP for UI motion that is better represented by native Flutter animation, vector animation, or another controllable mechanism.

Choose based on:

- visual complexity
- synchronization needs
- file/transfer size
- decode/runtime cost
- accessibility
- battery

## SVG and Vector Images

Flutter's raster `Image` API is not a general SVG renderer.

If SVG input is required, a package such as `flutter_svg` may be justified.

For repeated or complex SVGs:

- measure parse/build/render time
- investigate precompiled vector representations
- reduce excessive paths, masks, filters, and gradients
- consider rasterizing a static fixed-size asset

Current `flutter_svg` supports a raster rendering strategy that can trade resolution flexibility for performance, and the Flutter-published `vector_graphics` tooling can precompile vector assets.

Never state:

"SVG is always faster/smaller than PNG."

A complex vector can cost more to parse/render than a pre-rasterized small icon.

## User-Generated Images

User-generated camera/gallery images are frequently very large.

### Selection

Use maintained platform-aware picker/file APIs.

### Preview

Do not decode the full camera original merely to display a thumbnail.

Use an appropriately resized provider/output.

### Upload

When product requirements allow:

- resize before upload
- compress appropriately
- stream data instead of retaining unnecessary copies
- show progress
- support cancellation where the chosen upload stack permits
- implement bounded retries

### Metadata

Camera files can contain:

- orientation
- timestamps
- device metadata
- GPS/location metadata

Preserve orientation correctly.

Strip privacy-sensitive metadata when it is not required by the product.

### Android picker lifecycle

The official Flutter `image_picker` package documents that Android can destroy the hosting activity under memory pressure and provides lost-data recovery.

Integrate the package's documented recovery mechanism when using it.

### Temporary files

Camera/picker output can be temporary.

Move files that must be durable to application-owned storage.

### Input safety

For untrusted images:

- cap encoded input size
- inspect dimensions before expensive transformations where the library permits
- cap allowed pixel count
- handle malformed/corrupt data
- do not trust filename extension alone

A highly compressed input with enormous dimensions can still become a large decoded-memory allocation.

## Placeholders and Loading UX

Primary goal:

reserve layout and communicate loading without creating more work than the image itself.

### Static placeholders

Prefer:

- stable colored surface
- simple skeleton
- local low-cost asset

when detailed progress is not useful.

### `frameBuilder`

Useful for image-frame transitions and simple fade behavior.

### `loadingBuilder`

Use when actual loading progress is valuable.

Its builder can be invoked frequently during loading, so do not put expensive widget trees or effects inside it.

### Blur/LQIP placeholders

Can improve perceived UX but add:

- another representation/request
- decode work
- blur/filter work
- transition complexity

Use them where measured product value justifies the cost.

### Accessibility

Respect:

- reduced/disabled animation settings
- semantics labels where images convey information

Decorative images should not add noisy semantics.

## Error Handling and Reliability

Classify failures before retrying.

### Retryable/transient

Examples:

- temporary connection failure
- timeout
- 408
- 429
- selected 5xx errors

Use:

- bounded attempt count
- exponential backoff
- jitter
- `Retry-After` when applicable

### Permanent/not-found

Examples:

- malformed URL
- 404 for removed media
- unsupported resource

Do not retry indefinitely.

### Authentication

For 401/403:

1. determine whether credentials are stale
2. perform the application's normal credential-refresh flow
3. retry at most as policy permits
4. stop if authorization remains denied

Do not convert an auth error into a high-frequency retry loop.

### Expired signed URL

Obtain a fresh authorized URL through the application's normal model.

Retrying the same expired signature repeatedly is useless.

### Codec/data failure

For:

- corrupt image
- unsupported codec
- invalid bytes

show a fallback and capture diagnostics.

Redownloading identical immutable corrupt bytes repeatedly is not a useful retry strategy.

### Offline

If offline support is required:

- define which cache layer supplies images
- define stale-data UX
- offer manual/automatic bounded retry on reconnection

## Security and Privacy

### Authentication headers

Use headers where the selected platform/rendering path supports them.

On Web HTML-element image rendering, current Flutter APIs require empty headers.

Do not weaken authentication merely to make a rendering strategy work.

### Signed URLs

Do not place durable credentials in query parameters.

Signed URLs should follow backend security policy and have intentional lifetimes.

Be aware that changing signatures can reduce URL-based cache reuse.

### Redirects

Do not assume authentication headers are safely propagated to arbitrary redirect targets.

Follow the actual HTTP client's redirect/security behavior.

### Sensitive image caches

If images contain private data:

- understand every memory/disk/browser/CDN cache involved
- configure server cache directives appropriately
- isolate user data
- evict package/application caches on logout where required by policy
- never put private resources in a publicly shared CDN cache accidentally

### CORS proxies

Do not deploy an unrestricted arbitrary-URL image proxy.

Protect against:

- SSRF
- open-proxy abuse
- private-network access
- oversized downloads

### Local paths

Do not concatenate untrusted input into arbitrary file paths.

## Third-Party Package Decision Guide

Start with Flutter SDK APIs.

Add a package only when it solves a concrete capability gap.

Before adding a package inspect:

- current release date
- maintainer/publisher
- Flutter/Dart compatibility
- supported platforms
- Web behavior
- issue backlog
- transitive dependencies
- cache semantics
- failure behavior
- security/privacy implications

### `cached_network_image`

What it adds:

- widget/provider convenience
- placeholders/progress/error helpers
- integration with `flutter_cache_manager`
- encoded-file cache-directory reuse on supported non-Web paths

What it does not guarantee:

- universal speed improvement
- reduced decoded bitmap memory
- automatic optimal CDN sizing
- unlimited safe persistence
- identical behavior on Web

Current published documentation for 3.4.1 explicitly says Web support is minimal and currently does not include caching.

Use it when persistent-ish cache-directory reuse and its UX API solve a real requirement.

Do not add it simply because an app has network images.

### `flutter_cache_manager`

Provides file-cache behavior with:

- cache-directory storage
- freshness policy
- HTTP cache-control/ETag behavior
- object-count/staleness eviction controls

Its storage is a cache, not durable user data.

The OS may remove cache-directory contents.

### `flutter_svg` / `vector_graphics`

Use when real vector/SVG requirements exist.

For complex repeated assets, consider compilation/raster strategies and measure.

### `image_picker`

Use for supported camera/gallery/file selection needs.

Follow its platform-specific lifecycle and metadata caveats.

## State Management and Rebuilds

Do not equate widget rebuild count with image network requests.

A rebuild can be harmless if:

- the effective provider/cache key is unchanged
- the image remains cached/live
- the source URL is stable

Investigate actual problems:

- URL regenerated with changing query parameters
- decode dimensions change repeatedly
- custom provider key equality is unstable
- image disappears/reappears because parent state changes
- package cache key changes
- authentication/content identity changes

Do not rewrite application state management just to reduce innocent rebuilds.

## Lifecycle Management

### Framework-managed images

Let the `Image` widget and framework manage normal image stream lifecycle.

Do not manually dispose framework-owned image resources.

### Manually owned resources

If you directly obtain:

- `dart:ui.Image`
- `Codec`
- `ImageDescriptor`
- custom `ImageStream` listeners

follow the respective ownership/disposal contract.

### App backgrounding

Do not automatically clear all caches whenever the app goes to background.

Current Flutter painting binding already responds to operating-system memory pressure by clearing its ordinary image cache.

Only add custom lifecycle clearing for custom caches/resources when evidence and product semantics require it.

## Specialized Use Cases

### Social feeds

- lazy builders/slivers
- server-sized feed variants
- stable aspect ratio
- narrow viewport prefetch
- no full-resolution originals
- static preview for expensive animations when practical

### Product grids

- thumbnail derivatives
- stable card dimensions
- full detail derivative on product page
- zoom/original only on demand

### Photo galleries

- thumbnail-first
- full image for current page
- prefetch only close neighbors
- staged resolution for zoom
- monitor peak memory

### Chat applications

- stable reusable avatar providers
- attachment thumbnails in history
- full media only when opened
- bounded historical media loading

### Maps/tile-like imagery

- high request volume makes cache policy critical
- keep cache bounded by tile/zoom requirements
- respect provider licensing/cache rules
- avoid polluting a global cache with uncontrolled tile cardinality

### Background images

- size to maximum real display surface
- avoid unnecessarily giant originals
- profile large blur/filter combinations
- avoid repainting static backgrounds unnecessarily

### Image editors

Use:

- smaller preview proxies
- original on disk
- bounded decoded working sets
- streaming/tiled processing where necessary
- background isolate/native/server processing when supported by the chosen operation/library

Do not keep multiple full-resolution decoded copies without a deliberate reason.

## Common Anti-Patterns

| Anti-patternWhy it hurtsPreferred solution |                                                 |                                      |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------ |
| 8K original in a small card                | transfer + decode + memory waste                | CDN thumbnail + target decode        |
| Full images used as grid thumbnails        | bandwidth/cache churn                           | thumbnail derivatives                |
| Precaching whole feed                      | bandwidth/RAM spike                             | narrow predicted window              |
| Blindly increasing ImageCache              | more retention/OOM risk                         | measure churn and memory             |
| Shrinking with `BoxFit` only               | decoded image remains large                     | source/decode resize                 |
| Assuming ImageCache is disk cache          | unexpected repeat transfer after process loss   | deliberate HTTP/disk strategy        |
| Disk cache without eviction                | uncontrolled storage/privacy risk               | bounded policy                       |
| Unique URL every rebuild                   | cache misses                                    | stable/versioned URL                 |
| Changing `cacheWidth` every frame          | repeated decode/cache variants                  | stable target sizes                  |
| No image constraints                       | layout movement                                 | known size/aspect ratio              |
| Expensive blur skeleton everywhere         | raster/GPU cost                                 | simpler placeholder unless justified |
| Dozens of simultaneous high-res loads      | decode/network/memory burst                     | lazy + bounded loading               |
| Huge unused bundled assets                 | app-size/startup distribution cost              | remove/compress                      |
| `RepaintBoundary` around every image       | extra layers/cache cost without guaranteed gain | profile first                        |
| "WebP always wins"                         | ignores decode/content/platform trade-offs      | test formats                         |
| "SVG always wins"                          | complex vectors can be expensive                | simplify/compile/rasterize           |
| Optimizing in debug mode only              | misleading performance                          | profile/release methodology          |

## Anti-Myth Rules

Reject or qualify these claims:

### "Cached network images are always faster."

False.

Disk lookup, metadata, stale checks, decode, and cache complexity can make a package unnecessary. It helps when repeat encoded-file retrieval is a real bottleneck.

### "Flutter automatically disk-caches all remote images."

False.

Flutter `ImageCache` is a memory image cache.

### "WebP is always the best format."

False.

Evaluate transfer, decode, transparency, animation, content, and compatibility.

### "SVG is always more efficient than PNG."

False.

Vector complexity matters.

### "Every rebuild reloads the image."

False.

Cache/provider key behavior determines reuse.

### "Small compressed files use little memory."

False.

Decoded dimensions matter.

### "`cacheWidth` always improves performance."

False.

It can substantially reduce decoded-memory footprint, but:

- Web network images ignore it
- poor dimensions can reduce quality
- changing dimensions creates extra variants
- it cannot reduce transfer bytes from an unchanged remote source

### "Precaching everything improves UX."

False.

It can cause network, memory, and decode spikes.

### "Increasing ImageCache always helps."

False.

It trades churn for RAM retention.

### "`RepaintBoundary` around every image helps."

False.

Use only when measured repaint isolation is beneficial.

### "Fade-in is free."

False.

Transitions still have rendering/build work.

### "`Image.network` automatically implements responsive image delivery."

False.

It does not automatically request a source derivative based on final widget width/DPR.

### "A third-party network-image cache is mandatory for production."

False.

Add one only for required capabilities.

## Failure Recovery

### HTTP 404

- verify URL/content version
- use stable fallback
- avoid immediate repeated retry
- invalidate application metadata if resource was removed

### Authentication failure

- use normal auth refresh flow
- do not expose secrets in URL just to bypass header limitations

### Web CORS

- configure image origin/CDN correctly
- choose Web HTML strategy deliberately if necessary
- understand its limitations
- never solve private-resource CORS with an insecure public proxy

### Corrupted image

- catch/report codec error
- show fallback
- avoid repeated downloads of immutable bad bytes

### Unsupported codec

- verify against Flutter's guaranteed list
- convert server-side or add a maintained capability only when required

### OOM

Immediately inspect:

- physical decoded dimensions
- active full-resolution images
- animation
- custom caches
- image editor buffers
- cache tuning
- low-RAM reproduction

### Scrolling jank

Use a frame trace before changing code.

Then inspect decode bursts, giant images, simultaneous loads, effects, layout, and cache churn.

### Repeated requests

Inspect actual URLs and cache layers.

Do not infer repeated transfer from rebuild logs alone.

### Cache churn

Compare:

- current ImageCache bytes/count
- decoded-image sizes
- number of derivative keys
- fast-scroll behavior

### Blurry output

Compare:

`source/decoded pixels` against `logical display × DPR`.

Increase only the limiting stage.

### Excessive bundle size

Use Flutter size analysis and inspect local image assets by encoded size and necessity.

## Verification Checklist

Before declaring optimization complete, verify:

- target platforms are explicitly known
- Flutter/Dart versions were checked
- actual source image dimensions were inspected
- rendered dimensions were inspected
- DPR implications were considered
- no obvious original-resolution thumbnails remain
- remote variants are appropriately sized
- decoded-memory behavior is acceptable
- fast scrolling is smooth on representative hardware
- cold and warm image behavior were tested
- caching works at the intended layers
- persistent cache has bounded eviction if present
- retry behavior is bounded
- placeholders preserve layout
- error states work
- authenticated images remain secure
- Web CORS works
- Web image strategy is intentional
- image quality remains acceptable
- animated images do not consume uncontrolled resources
- low-memory devices behave acceptably
- unused large assets were addressed
- no unnecessary dependency was introduced
- no manual listener/resource leak was introduced
- no unrelated architecture was rewritten
- measurements improved or remained neutral
- every targeted platform was smoke/integration tested

## Production Definition of Done

Image handling is production-ready when:

1. No image workflow produces known OOM behavior on supported representative devices.
2. Image-heavy scrolling meets the application's frame-performance target.
3. Thumbnail/feed/card requests do not routinely download grossly oversized originals.
4. Decoded dimensions are appropriate for actual rendering when controllable.
5. Cache responsibilities are documented and bounded.
6. Flutter memory caching is not confused with HTTP/disk caching.
7. Remote URLs and derivative keys are stable.
8. Retry/error behavior is finite and observable.
9. Loading states preserve layout.
10. Private media remains private across URL, HTTP, disk, browser, and CDN layers.
11. Web CORS and rendering-strategy behavior is tested.
12. Local assets do not contain obvious unused/oversized payloads.
13. Animated media has been separately assessed.
14. Performance conclusions were obtained from profile/release-appropriate measurements.
15. No performance gain is claimed without evidence when measurement is available.

## Agent Operating Rules

When applying this skill inside a repository:

1. Inspect before editing.
2. Preserve existing architecture unless the image problem requires a change.
3. State the target platforms and SDK version.
4. Identify the bottleneck before writing optimization code.
5. Prefer the smallest targeted fix.
6. Prefer source/CDN resizing over client waste.
7. Do not add a dependency for functionality Flutter already provides adequately.
8. Do not set arbitrary global cache constants.
9. Do not build broad preload systems without evidence.
10. Do not use undocumented engine hacks.
11. Do not change state-management architecture just to reduce harmless rebuilds.
12. When direct image resources are manually owned, follow documented disposal semantics.
13. Profile after the change.
14. Report what metric changed.
15. If measurement does not improve, revert or reconsider the optimization.
16. Record any platform-specific limitation or unresolved framework behavior explicitly.

## Evidence and Reporting Template

For each performance change report:

**Symptom**

- What the user observes.

**Evidence**

- Frame, memory, network, dimensions, cache, or CPU evidence.

**Root cause**

- Network / decode / memory / layout / paint / raster / GPU / cache / server.

**Change**

- Exact targeted modification.

**Trade-off**

- Quality, storage, complexity, latency, privacy, compatibility, or maintainability impact.

**Verification**

- Before/after measurements on representative target platforms.

**Residual risk**

- Any untested device/platform/version or documented framework ambiguity.

Use `research_sources.md` and `research_findings.md` accompanying this skill as the evidence base.
