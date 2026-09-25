# Flutter Image Performance Research Findings

## Contents

- [Research Baseline](#research-baseline)
- [Source](#source)
- [Fetch/read](#fetchread)
- [Encoded bytes](#encoded-bytes)
- [Decode](#decode)
- [Decoded bitmap](#decoded-bitmap)
- [Cache](#cache)
- [Raster/texture](#rastertexture)
- [Display](#display)
- [Eviction/disposal](#evictiondisposal)
- [File/transfer size](#filetransfer-size)
- [Encoded dimensions](#encoded-dimensions)
- [Decoded dimensions](#decoded-dimensions)
- [Logical display size](#logical-display-size)
- [Physical display size](#physical-display-size)
- [GPU representation](#gpu-representation)
- [Cache footprint](#cache-footprint)
- [1000×1000](#10001000)
- [3840×2160](#38402160)
- [4000×4000](#40004000)
- [Important conclusion](#important-conclusion)
- [Layout](#layout)
- [Headers](#headers)
- [Decode sizing](#decode-sizing)
- [Web](#web)
- [Android permission](#android-permission)
- [Retry behavior](#retry-behavior)
- [Redirect behavior](#redirect-behavior)
- [Disk caching](#disk-caching)
- [Why a larger cache can hurt](#why-a-larger-cache-can-hurt)
- [Why a smaller cache can hurt](#why-a-smaller-cache-can-hurt)
- [Memory pressure](#memory-pressure)
- [Important implementation caveat](#important-implementation-caveat)
- [Server advantage](#server-advantage)
- [Correct collection architecture](#correct-collection-architecture)
- [Source tiering](#source-tiering)
- [Offscreen work](#offscreen-work)
- [`frameBuilder`](#framebuilder)
- [`loadingBuilder`](#loadingbuilder)
- [Skeletons](#skeletons)
- [Blur placeholders](#blur-placeholders)
- [Fade effects](#fade-effects)
- [`BoxFit`](#boxfit)
- [Clipping](#clipping)
- [Opacity](#opacity)
- [Blur/filter](#blurfilter)
- [`RepaintBoundary`](#repaintboundary)
- [JPEG](#jpeg)
- [PNG](#png)
- [WebP](#webp)
- [GIF](#gif)
- [AVIF](#avif)
- [APNG](#apng)
- [HEIC/HEIF](#heicheif)
- [When vector helps](#when-vector-helps)
- [When vector can hurt](#when-vector-can-hurt)
- [Bundle implications](#bundle-implications)
- [CORS](#cors)
- [HTML image elements](#html-image-elements)
- [Critical documentation contradiction](#critical-documentation-contradiction)
  - [Resolution](#resolution)
- [Service worker change](#service-worker-change)
- [Low-memory devices](#low-memory-devices)
- [Native API caveat](#native-api-caveat)
- [URLCache distinction](#urlcache-distinction)
- [Caveats](#caveats)
- [Why server sizing wins](#why-server-sizing-wins)
- [Versioned URLs](#versioned-urls)
- [Authorization headers](#authorization-headers)
- [Signed URLs](#signed-urls)
- [Private caching](#private-caching)
- [Correct architecture](#correct-architecture)
- [Image-picker lifecycle](#image-picker-lifecycle)
- [`cached_network_image`](#cachednetworkimage)
- [When it helps](#when-it-helps)
- [When it does not help much](#when-it-does-not-help-much)
- [Performance view](#performance-view)
- [Memory view](#memory-view)
- [Network view](#network-view)
- [CPU profiler](#cpu-profiler)
- [App-size tool](#app-size-tool)
- [1. Reproduce](#1-reproduce)
- [2. Establish baseline](#2-establish-baseline)
- [3. Use representative mode](#3-use-representative-mode)
- [4. Classify](#4-classify)
- [5. Change one thing](#5-change-one-thing)
- [6. Repeat identical test](#6-repeat-identical-test)
- [7. Compare](#7-compare)
- [Avatars](#avatars)
- [Product images](#product-images)
- [Social feeds](#social-feeds)
- [Photo galleries](#photo-galleries)
- [Chat](#chat)
- [Maps/tile-like resources](#mapstile-like-resources)
- [Background images](#background-images)
- [Image editors](#image-editors)
- ["Use `ScrollView.cacheExtent` for all image prefetch tuning"](#use-scrollviewcacheextent-for-all-image-prefetch-tuning)
- ["Flutter Web automatically gives every app a managed service worker"](#flutter-web-automatically-gives-every-app-a-managed-service-worker)
- [Old custom `ImageProvider` loading APIs](#old-custom-imageprovider-loading-apis)
- [Historical Web renderer advice](#historical-web-renderer-advice)
- [Contradiction A — Web CORS automatic fallback](#contradiction-a-web-cors-automatic-fallback)
  - [Source 1](#source-1)
  - [Source 2](#source-2)
  - [Source 3](#source-3)
  - [Resolution](#resolution)
  - [Status](#status)
- [Ambiguity B — "Decoded at specified size"](#ambiguity-b-decoded-at-specified-size)
  - [Resolution](#resolution)
- [Ambiguity C — "All network images are cached"](#ambiguity-c-all-network-images-are-cached)
  - [Resolution](#resolution)
- [Ambiguity D — Native OS networking cache](#ambiguity-d-native-os-networking-cache)
  - [Resolution](#resolution)
- [Codec-specific downsample implementation](#codec-specific-downsample-implementation)
- [GPU texture memory](#gpu-texture-memory)
- [Additional platform codecs](#additional-platform-codecs)
- [Network cancellation](#network-cancellation)
- [Web fallback documentation](#web-fallback-documentation)
- [Requirement: simple remote image](#requirement-simple-remote-image)
- [Requirement: source is too large](#requirement-source-is-too-large)
- [Requirement: repeated decoded reuse in current process](#requirement-repeated-decoded-reuse-in-current-process)
- [Requirement: persistent encoded-file reuse/offline native images](#requirement-persistent-encoded-file-reuseoffline-native-images)
- [Requirement: likely-next image needs zero-visible delay](#requirement-likely-next-image-needs-zero-visible-delay)
- [Requirement: huge gallery/zoom](#requirement-huge-galleryzoom)
- [Requirement: SVG](#requirement-svg)
- [Requirement: user camera/gallery image](#requirement-user-cameragallery-image)
- [Requirement: custom server-selected URL based on image configuration](#requirement-custom-server-selected-url-based-on-image-configuration)
- [Requirement: ImageCache tuning](#requirement-imagecache-tuning)
- [Network](#network)
- [Memory](#memory)
- [Frames](#frames)
- [CPU](#cpu)
- [Quality](#quality)


> Evidence-backed findings, contradictions, deprecated guidance, and architecture conclusions. Use this when validating a recommendation or correcting image-performance folklore.

Research date: 2026-08-09

## Research Baseline

The current Flutter documentation states that it reflects Flutter 3.44.7.

The SDK archive snapshot retrieved during the research exposed the Flutter 3.44 stable line through 3.44.6 with Dart 3.12.2, while the release schedule targets Flutter 3.47 for August 2026.

Accordingly:

- API findings are based on current 3.44.x documentation/source behavior.
- Dart context is 3.12.x.
- All version-sensitive recommendations require repository-version verification before implementation.
- Flutter 3.47 behavior must not be silently assumed until its stable APIs/source are actually present in the project.

---

# 1. Executive Findings

The highest-value image optimizations in Flutter are usually not exotic renderer tweaks.

They are:

1. Do not download grossly oversized remote images.
2. Do not retain grossly oversized decoded bitmaps.
3. Use thumbnail/detail/full-resolution tiers.
4. Keep layout dimensions stable during loading.
5. Let large collections remain lazy.
6. Bound prefetch.
7. Understand which cache layer is actually operating.
8. Do not increase `ImageCache` blindly.
9. Treat Web separately.
10. Profile image-heavy workflows on representative hardware.

Flutter's built-in image system is already sophisticated enough for a large fraction of applications.

Third-party image packages should solve a concrete missing requirement such as persistent encoded-file caching, SVG rendering, or image selection—not act as a reflexive default.

---

# 2. Complete Image Pipeline

A practical Flutter image pipeline can be modeled as:

source
→ fetch/read
→ encoded bytes
→ decode
→ optional decode/output resizing
→ `ImageStream`
→ `ImageCache`
→ raster/GPU representation
→ paint
→ display
→ eviction/disposal

## Source

Examples:

- asset bundle
- network URL
- local file
- memory bytes
- generated/custom provider

Main resources:

- storage
- origin/CDN
- application bundle

## Fetch/read

Remote:

- DNS/connection/TLS latency
- network bandwidth
- network/radio energy
- HTTP request/response processing

Local:

- storage I/O
- memory mapping/copying depending implementation

## Encoded bytes

JPEG/WebP/PNG/etc. are compressed representations.

Encoded bytes affect:

- network transfer
- disk storage
- bundle size
- temporary buffers

They do not directly determine decoded bitmap RAM.

## Decode

Decoder turns compressed representation into renderable pixels.

Costs can include:

- CPU
- native codec work
- temporary buffers
- allocation
- resampling

## Decoded bitmap

This is where pixel dimensions become critical.

Approximation:

`decodedMemory ≈ width × height × bytesPerPixel`

For common 32-bit output:

`≈ width × height × 4`

## Cache

Flutter `ImageProvider` uses the global framework `ImageCache`.

This is primarily a decoded-image reuse mechanism.

It is not Flutter's automatic persistent disk cache.

## Raster/texture

The renderer needs image data suitable for drawing.

Costs can include:

- raster-thread work
- texture/shared-memory residency
- GPU bandwidth
- fragment processing

Exact GPU-memory duplication is renderer/platform-dependent and must not be presented as a universal formula.

## Display

Painting can add:

- scaling
- clipping
- opacity
- masks
- blur
- filters
- transforms
- offscreen compositing

## Eviction/disposal

Framework-managed images are normally managed by the image pipeline.

Directly owned low-level objects such as `ui.Image`/`Codec` have explicit lifecycle obligations.

---

# 3. Image Size Is Multidimensional

The research confirms that "image size" must always be qualified.

## File/transfer size

Affects:

- download time
- storage
- application size
- bandwidth

## Encoded dimensions

A 4000×4000 JPEG can be highly compressed while still describing 16 million pixels.

## Decoded dimensions

Primary driver of bitmap memory.

## Logical display size

Flutter layout units.

Example:
200×100 logical pixels.

## Physical display size

Approximately:

logical size × DPR.

At 3× DPR:
200×100 logical pixels corresponds to an approximate physical need of 600×300 pixels.

## GPU representation

May create additional renderer-side residency.

Exact memory representation varies by platform/renderer.

## Cache footprint

Depends on decoded dimensions and cache retention—not just downloaded file size.

---

# 4. Image Memory Math

Flutter's own current `Image` documentation states that a 3840×2160 image can consume over 30 MB decoded at 32 bits/pixel.

Calculations:

## 1000×1000

`1,000 × 1,000 × 4 = 4,000,000 bytes`

Approximately 3.8 MiB.

## 3840×2160

`3,840 × 2,160 × 4 = 33,177,600 bytes`

Approximately 31.6 MiB.

## 4000×4000

`4,000 × 4,000 × 4 = 64,000,000 bytes`

Approximately 61 MiB.

Four independently retained 4000×4000 base bitmaps could therefore represent roughly 244 MiB before codec, temporary, animation, or renderer overhead.

## Important conclusion

A compressed 1 MB JPEG can become tens of megabytes of decoded memory.

Therefore these myths are false:

- "small file = small RAM"
- "large file = necessarily huge RAM"

Pixel dimensions and decoded representation matter more directly.

---

# 5. `Image`, `ImageProvider`, and Image Resolution

`ImageProvider` is responsible for identifying/resolving an image and cooperates with the global image cache.

The resolved cache key must be immutable and provide correct equality/hash semantics.

This makes cache-key stability important.

A widget rebuild by itself does not prove that:

- bytes were redownloaded
- the image was decoded again

If the effective key remains the same and the cached/live image remains available, reuse can occur.

What causes meaningful churn:

- changing URLs
- cache-busting parameters
- changing resize dimensions
- unstable custom provider keys
- eviction caused by cache pressure

---

# 6. `Image.network` and `NetworkImage`

Current `Image.network` behavior establishes several critical rules.

## Layout

Flutter recommends supplying width/height or tight constraints.

Without stable constraints, image dimensions arriving later can cause layout movement.

## Headers

Custom request headers are supported on the standard byte-fetch path.

Web HTML-element mode cannot use non-empty custom headers.

## Decode sizing

`cacheWidth`/`cacheHeight` indicate target decoded output dimensions on supported paths.

`Image.network` internally uses `ResizeImage.resizeIfNeeded`.

## Web

For network images on Web:

`cacheWidth` and `cacheHeight` are documented as ignored.

This is one of the most important reasons not to copy mobile image advice blindly to Web.

## Android permission

Network images require Android Internet permission.

---

# 7. Native Network Fetching

Inspection of the framework's native network-image implementation shows that standard Flutter native network images use Dart's HTTP client rather than automatically routing through UIKit `URLSession`/`URLCache`.

The native path:

- uses a reusable `HttpClient`
- supports request headers
- benefits from persistent HTTP connections
- obtains encoded bytes
- creates the buffer used by the codec
- treats unsuccessful HTTP loads as image-load errors
- evicts a failed image-cache key so a later resolution can try again

## Retry behavior

The framework does not implement an application-level unlimited retry loop.

Therefore retry policy belongs in application/network architecture when needed.

## Redirect behavior

Dart `HttpClient` has bounded redirect behavior.

Sensitive headers have special redirect handling.

Applications must not rely on credentials being sent safely to arbitrary redirected domains.

## Disk caching

No primary Flutter/Dart source found establishes a persistent disk image cache for standard native `NetworkImage`.

Therefore:

"Flutter automatically disk-caches `Image.network`"

is false.

---

# 8. Flutter `ImageCache`

Current `ImageCache` is a least-recently-used in-memory framework cache.

It tracks conceptually distinct groups such as:

- pending images
- ordinary cached/keep-alive images
- live images

Current documented default limits are approximately:

- 1000 entries
- 100 MB

These are defaults, not optimization recommendations.

## Why a larger cache can hurt

Increasing it can:

- retain more decoded pixels
- increase memory pressure
- increase OOM risk on constrained devices

## Why a smaller cache can hurt

Reducing it can cause:

- repeated decode
- repeated provider loading
- cache churn
- potentially repeated network retrieval when no lower cache layer supplies bytes

## Memory pressure

Current `PaintingBinding.handleMemoryPressure` explicitly calls:

`imageCache.clear()`

when the operating system reports memory pressure.

This means advice telling every application to build its own blanket "clear Flutter image cache on low memory" handler is obsolete/redundant for the standard cache unless custom resource ownership requires additional handling.

`clear()` does not mean every live image disappears. Images held live by active listeners are a distinct lifecycle category.

---

# 9. Decode-Time/Output Resizing

Current Flutter docs describe `cacheWidth`, `cacheHeight`, and `ResizeImage` as allowing images to be decoded/stored at specified dimensions rather than natural dimensions.

This can produce dramatic memory reductions.

Example from Flutter documentation:

4K original:
approximately >30 MB decoded

384×216 decoded output:
approximately hundreds of kilobytes

## Important implementation caveat

It would be too strong to say:

"`cacheWidth` always downsamples the compressed format before any full decode work on every platform and codec."

The API guarantees requested output behavior, while low-level/native codec internals vary.

Therefore the safe engineering statement is:

- use these APIs to reduce decoded/cached output dimensions where supported
- expect meaningful memory benefits
- do not rely on them as a substitute for server/CDN source resizing
- do not claim identical CPU/decode internals across formats/platforms

## Server advantage

CDN resizing before download can reduce:

- transfer bytes
- encoded source dimensions
- encoded-buffer handling
- decoder input complexity
- memory pressure

That is an end-to-end optimization that `cacheWidth` alone cannot provide.

---

# 10. Web Decode Sizing

Flutter explicitly documents that `cacheWidth` and `cacheHeight` are ignored for Web network images.

Consequences:

1. Responsive remote-source selection is particularly important.
2. A 4000-pixel remote source remains a 4000-pixel network source even if the widget is tiny.
3. Mobile decode-hint advice cannot simply be copied to Web.
4. CDN/source derivatives are the reliable cross-layer solution.

---

# 11. Precaching

`precacheImage` can improve latency when an image is highly likely to be displayed soon.

Useful:

- next gallery image
- next carousel page
- likely hero destination
- a small number of critical first-route assets

Wasteful:

- entire feed
- dozens of 4K gallery images
- all app assets at startup
- speculative routes users rarely open

The API documentation itself warns about memory implications of pinning images.

Therefore:

"precache everything"

is explicitly rejected.

---

# 12. Scrolling Performance

The largest image-list performance problems generally combine:

- oversized remote images
- large decoded bitmaps
- many concurrent loads
- cache churn
- expensive placeholders
- unstable layouts
- heavy effects
- animated media

## Correct collection architecture

Use lazy:

- `ListView.builder`
- `GridView.builder`
- sliver builders

rather than constructing every image item.

## Source tiering

Social feed:
feed-size derivative

Product grid:
thumbnail

Gallery index:
thumbnail

Full-screen detail:
larger derivative

Zoom:
larger or tiled source on demand

## Offscreen work

Offscreen cache/prefetch distance is not free.

A large scroll-cache window can mean more:

- widgets built
- images requested
- images decoded
- memory retained

Tune only with traces and actual user scroll behavior.

---

# 13. Stable Layout

A stable placeholder geometry is more important than an elaborate placeholder effect.

Good tools:

- fixed width/height
- `AspectRatio`
- server-provided media dimensions
- stable card constraints

Benefits:

- reduced visible layout movement
- predictable scroll extent
- cleaner transition
- fewer layout surprises

---

# 14. Placeholder Findings

## `frameBuilder`

Suitable for:

- frame-aware transitions
- simple fade-in

## `loadingBuilder`

Useful when load progress matters.

It can rebuild frequently while progress changes.

Therefore expensive placeholder trees should not be placed there casually.

## Skeletons

A simple static skeleton can be cheap.

A continuously animated gradient skeleton across dozens of cells is not automatically cheap.

## Blur placeholders

Can improve perceived quality but may require:

- additional asset/request
- decode
- blur/filter
- transition

Use where product value justifies measured cost.

## Fade effects

"Fade-in is free" is false.

Transitions still perform work, although Flutter provides efficient mechanisms such as image-specific fade/shader approaches.

---

# 15. Rendering Effects

Flutter's general performance guidance identifies offscreen layers and some effects as potential performance costs.

## `BoxFit`

Changes destination painting.

It does not:

- shrink download bytes
- shrink decoded bitmap by itself
- alter ImageCache memory

## Clipping

Clipping has a cost but should not be called universally "slow."

The cost depends on:

- clip type
- size
- repetition
- animation
- renderer
- whether extra layers are triggered

## Opacity

Opacity across a subtree may cause compositing work.

Narrow image-specific opacity is preferable when it expresses the same effect.

## Blur/filter

Large blur kernels and repeated image filtering can become costly.

Profile:

- `ImageFiltered`
- `ShaderMask`
- large blurs
- repeated color/effect chains

## `RepaintBoundary`

It is a conditional optimization.

Benefits:
repaint isolation when subtrees update independently.

Costs:
additional layer/raster-cache resources.

Therefore:

"`RepaintBoundary` around every image improves performance"

is false.

---

# 16. Image Formats

Flutter's guaranteed current list:

| Format | Guaranteed by Flutter `Image` API | Alpha | Animation | Notes |
|---|---:|---:|---:|---|
| JPEG | yes | no | no | strong photo default |
| PNG | yes | yes | no | lossless; good hard edges/alpha |
| GIF | yes | limited | yes | legacy animation |
| WebP | yes | yes | yes | lossy/lossless/animated |
| BMP | yes | varies | no | generally inefficient transfer |
| WBMP | yes | limited | no | legacy |
| APNG | not in guaranteed list | yes | yes | platform/browser dependent |
| AVIF | not guaranteed | yes | can support animation at format level | Flutter feature support still tracked |
| HEIF/HEIC | not guaranteed | varies | varies | native platform dependent |
| SVG | not handled by raster `Image` as SVG | yes | SVG feature dependent | package/vector tooling needed |

## JPEG

Best for many photographs.

Still decodes according to pixel dimensions.

## PNG

Lossless and supports alpha.

Large photographic PNGs can be inefficient.

## WebP

Useful and guaranteed by Flutter.

But:

"WebP is always best"

is unsupported.

Network compression efficiency, decode speed, content, animation, and platform all matter.

## GIF

Supported but can be inefficient for modern rich animation.

## AVIF

Browser and Android support do not establish universal Flutter support.

Flutter's own issue tracker still contains an open AVIF codec-support feature request.

Therefore AVIF must be feature-tested or deliberately decoded through a supported specialized path before use as a cross-platform default.

## APNG

Not present in Flutter's guaranteed format list.

Do not promise support merely because modern browsers decode APNG.

## HEIC/HEIF

Native Apple/Android APIs can support them depending OS version.

For a Flutter application targeting all six platforms, server/client conversion may be necessary.

---

# 17. Format Efficiency Is Multi-Axis

Never rank formats only by compressed bytes.

Evaluate:

- transfer size
- encode/decode CPU
- alpha
- animation
- visual quality
- platform support
- browser support
- server availability
- runtime bitmap dimensions

Regardless of format, a 4000×4000 decoded output still represents millions of pixels.

---

# 18. SVG and Vector Findings

`flutter_svg` is an ecosystem package, not core raster `Image` behavior.

Its current documentation provides picture/vector and rasterized rendering strategies.

`vector_graphics`, published by flutter.dev, can precompile vector assets.

## When vector helps

- scalable logos/icons
- modest path complexity
- one asset needed at many resolutions
- sharp shape graphics

## When vector can hurt

- huge path count
- complex masks
- gradients
- filters
- repeated parsing
- many vectors in fast-moving lists

For a complex static visual rendered at one small size, a pre-rasterized PNG/WebP can outperform dynamic vector rendering.

Therefore:

"SVG is always more efficient than PNG"

is false.

---

# 19. Animated Image Behavior

Current Flutter `Image` docs state multiframe images are paused when:

- `TickerMode` is disabled
- animations are disabled through accessibility/media-query state

`MultiFrameImageStreamCompleter` manages frames using a codec and schedules image frames according to duration/listeners.

Important findings:

- animation requires repeated frame work
- next-frame decode/codec resources matter
- frame dimensions directly affect memory
- numerous large animated images can hurt CPU/battery
- a feed should not casually run every animation at full resolution

Do not claim Flutter necessarily retains every frame of an animation simultaneously.

The actual multiframe pipeline uses codec/frame lifecycle rather than a simple "all frames decoded forever" model.

---

# 20. Local Assets

Flutter supports density-aware asset variants.

Typical organization:

- base / 1×
- 2.0x
- 3.0x
- other intentional variants

`AssetImage` uses image configuration/DPR to choose a suitable resource.

## Bundle implications

Every shipped variant contributes encoded asset bytes.

Therefore do not:

- create unnecessary density variants
- ship huge originals unused by the UI
- leave obsolete screenshots/assets in the bundle

Use the Flutter app-size tool to measure actual bundle contribution.

---

# 21. Web-Specific Findings

Flutter Web differs substantially from native.

## CORS

Canvas/WebGL/WebGPU-based image rendering can require raw bytes and therefore CORS permission for cross-origin access.

Preferred solution:
configure the image CDN/origin correctly.

## HTML image elements

HTML `<img>` can display cross-origin content under different browser rules and can use browser caching.

Flutter exposes this through `WebHtmlElementStrategy`.

But HTML-element rendering has limitations, including current documented restrictions around:

- custom headers
- screenshot capture
- some filters/effects
- platform-view overhead

## Critical documentation contradiction

Current Web guide says:

cross-origin image without CORS automatically falls back to HTML `<img>`.

Current `Image.network` API says:

default `webHtmlElementStrategy = WebHtmlElementStrategy.never`.

The enum API says `fallback` is a distinct explicit strategy.

### Resolution

Do not silently pick one narrative statement.

For real code:

1. inspect exact SDK API/source
2. treat `never` as the current constructor default
3. explicitly specify `fallback` or `prefer` if desired
4. integration-test the target browser/version
5. record this documentation inconsistency

This is an area where official documentation remains internally inconsistent.

---

# 22. Current Web Renderers

Current Flutter Web documentation describes:

- CanvasKit for default builds
- skwasm for WebAssembly builds when supported
- CanvasKit fallback where skwasm is unavailable

Consequences:

- do not rely on historical HTML-renderer-era performance advice
- do not assume a native mobile decode/render implementation
- browser/GPU/WebAssembly environment matters

---

# 23. Browser HTTP Cache and Flutter Web

Browser `<img>` can benefit from standard browser HTTP caching.

Relevant mechanisms include:

- `Cache-Control`
- ETag
- Last-Modified
- conditional requests
- immutable/versioned URLs

Flutter framework memory caching and browser HTTP caching remain separate layers.

## Service worker change

Current Flutter Web FAQ states that Flutter no longer generates/manages a service worker by default.

Therefore old advice assuming an automatically managed Flutter service worker provides application image caching is outdated.

Applications needing offline/advanced Web caching must implement/service their own strategy.

---

# 24. Android-Specific Findings

Android guidance reinforces the pixel-memory model.

A bitmap with 32-bit pixels uses approximately 4 bytes/pixel before additional overhead.

Android explicitly recommends loading image resolution appropriate to the display rather than a larger source.

## Low-memory devices

Problems become acute when:

- feed images decode simultaneously
- multiple full-camera originals are retained
- global cache is enlarged
- image processing creates copies
- GC allocation churn increases

Test low-RAM hardware.

## Native API caveat

Android's `BitmapFactory`/`ImageDecoder` support target sizing/subsampling.

However official Android behavior should not be presented as proof that every Flutter codec route invokes precisely those methods.

Flutter's API output guarantees and framework source are the source of truth for Flutter behavior.

---

# 25. Apple-Specific Findings

Apple's memory guidance strongly agrees with Flutter's:

compressed image byte size can be dramatically smaller than decoded memory.

Apple's ImageIO ecosystem supports native downsampling.

Again, that is platform capability—not permission to claim every Flutter image provider maps directly to the same native call.

## URLCache distinction

UIKit/Foundation developers commonly use `URLSession`/`URLCache`.

Standard Flutter native `NetworkImage`, however, uses Dart networking.

Therefore:

"iOS automatically disk caches Flutter `NetworkImage` through URLCache"

is not supported and should not be claimed.

---

# 26. Windows and Linux

No authoritative evidence supports inventing a special independent image-performance doctrine for Windows or Linux.

Most optimization rules are shared:

- right-size sources
- control decoded dimensions
- lazy collections
- bounded caching
- high-DPI awareness
- stable layout
- profile renderer behavior

Desktop-specific practical issues are:

- resizable windows
- large visible regions
- high-DPI monitors
- large local files
- platform-dependent extra codecs
- native plugin deployment dependencies

Use stable remote-size buckets during window resizing so every pixel of width does not become a separate URL/cache identity.

---

# 27. Responsive Source Selection

A useful planning relation is:

`source physical width ≈ displayed logical width × DPR`

Example:

240 logical px × 2.5 DPR ≈ 600 source pixels.

Then select the closest appropriate CDN bucket.

## Caveats

Adjust for:

- crop
- zoom
- transformations
- quality tolerance
- service-provided size buckets
- large-screen transitions

Do not create URLs for every fractional layout dimension.

That harms cache reuse.

---

# 28. CDN and Server Optimization

Many Flutter image-performance failures are really server problems.

High-value server capabilities:

- width/height transforms
- crop
- quality control
- format variants
- edge caching
- versioned URLs
- immutable assets
- thumbnails
- signed/private delivery

## Why server sizing wins

A client decode hint can reduce decoded memory.

A server derivative can additionally reduce:

- network bytes
- edge/origin traffic
- encoded input
- latency
- device energy

Therefore server resizing should be preferred when available.

---

# 29. HTTP Caching

HTTP cache correctness belongs to HTTP semantics, not Flutter `ImageCache`.

Useful validators:

- ETag
- Last-Modified

Useful freshness directives:

- `max-age`
- shared cache directives where safe
- immutable/versioned resource strategies

## Versioned URLs

Strong pattern:

`avatar/user123/v8/400.webp`

rather than mutating bytes behind an eternally ambiguous URL with no cache validation.

Actual URL structure is product-specific, but content version stability benefits all cache layers.

---

# 30. Authenticated and Signed Images

## Authorization headers

Appropriate where the image-fetch path supports them.

Web HTML-element strategy does not support arbitrary custom headers through `Image.network`.

Do not put a long-lived bearer token into a query parameter merely to work around this limitation.

## Signed URLs

Signed URLs can be appropriate.

But frequently regenerating signatures changes URL identity and can destroy cache reuse.

The server architecture should deliberately balance:

- authorization lifetime
- cache identity
- revocation
- CDN behavior

## Private caching

Do not allow:

- shared CDN public cache
- disk cache surviving user switch

to expose another user's sensitive images.

---

# 31. User-Generated Images

Camera images frequently have:

- very high dimensions
- EXIF orientation
- GPS metadata
- large upload cost

## Correct architecture

1. retain durable original only if product requires it
2. generate/use a lightweight preview
3. normalize orientation correctly
4. strip sensitive metadata unless needed
5. resize/compress upload where appropriate
6. generate server thumbnails
7. load thumbnails in lists
8. load larger media only when opened

## Image-picker lifecycle

Current official Flutter `image_picker` package documents Android lost-data recovery because the host activity can be killed under memory pressure.

Ignoring this is a reliability bug.

Picker camera output can also be temporary and must be moved if the product needs durable storage.

---

# 32. Untrusted Image Safety

Image safety is not only file size.

An input may have:

- small compressed bytes
- extremely large declared pixel dimensions

Potential consequences:

- huge allocation
- slow decode
- denial of service

Robust upload/processing infrastructure should cap:

- encoded bytes
- dimensions
- total pixel count

and reject corrupt/unsupported inputs cleanly.

---

# 33. Third-Party Persistent Caching

## `cached_network_image`

Current published version observed:
3.4.1.

Adds:

- convenience widget/provider
- placeholders/progress/error API
- integration with `flutter_cache_manager`
- file-cache behavior on supported platforms

Current package documentation explicitly states:

Web support is minimal and Web caching is currently not included.

This disproves a common assumption that adding this package automatically provides identical disk caching everywhere.

## When it helps

- repeat encoded-file retrieval is significant
- native/desktop cache-directory reuse is required
- existing product UX uses its placeholder/progress API

## When it does not help much

- HTTP/browser/CDN already handles repeated downloads adequately
- data changes frequently
- most images are viewed once
- application is Web-first
- the real problem is 8K decoded dimensions
- server lacks thumbnails

It does not solve an oversized decoded bitmap automatically.

---

# 34. `flutter_cache_manager`

The package manages cached files in a cache directory and supports HTTP freshness/revalidation behavior including cache-control/ETag concepts.

Its storage should be treated as:

evictable cache

not:

durable application data.

A robust implementation still needs to reason about:

- stale period
- maximum object count
- privacy
- logout
- disk use
- OS deletion

---

# 35. SVG Packages

`flutter_svg` and `vector_graphics` are justifiable when actual vector input exists.

They should not become default dependencies for raster-only applications.

Before introducing them:

- inspect current maintenance
- test target platforms
- profile complex assets
- determine whether precompiled or raster output is better

---

# 36. Rebuild Behavior

The myth:

"Flutter rebuilt my image widget, therefore it downloaded again"

is invalid.

A rebuild can reuse:

- existing live image
- ImageCache entry
- browser/disk cache depending lower layers

Repeated actual requests should be demonstrated with network tooling.

Common true causes:

- changed URL
- changed signature
- changed dimensions in cache key
- eviction
- unstable custom provider

Optimization should target those causes, not generic rebuild count.

---

# 37. Lifecycle

Normal framework `Image` usage is managed by Flutter.

Do not manually dispose resources the framework owns.

Manual lifecycle becomes relevant for:

- custom `ImageStream` listeners
- low-level `Codec`
- directly owned `ui.Image`
- custom provider/resource systems
- package-specific caches

Over-management can be as incorrect as leaking.

---

# 38. Performance Measurement

Official Flutter DevTools provides the required instrumentation.

## Performance view

Use for:

- frame jank
- UI/raster timing
- expensive build/layout/paint activity
- rendering timeline

## Memory view

Use for:

- memory growth
- allocation behavior
- retained objects
- distinguishing leak from bloat

## Network view

Use for supported native Dart network traffic.

For Web:
use browser developer tools.

## CPU profiler

Use for:

- image processing
- repeated decode-related CPU work
- custom conversion/compression

## App-size tool

Use for:

- oversized Flutter assets
- package payload
- build distribution size

---

# 39. Profiling Methodology

A rigorous image-performance experiment should be:

## 1. Reproduce

Define a deterministic workflow.

Example:

launch → open feed → scroll 100 items → open photo → return.

## 2. Establish baseline

Record:

- cold load
- warm load
- transfer bytes
- request count
- peak RAM
- frame distribution
- CPU trace where relevant

## 3. Use representative mode

Use profile/release-appropriate builds.

Debug mode is not a valid sole performance benchmark.

## 4. Classify

Choose one dominant class:

- network
- decode
- memory
- layout
- paint
- raster
- GPU
- cache

## 5. Change one thing

Example:

server width from 2400 → 600.

## 6. Repeat identical test

Same:

- device
- dataset
- route
- scroll pattern
- cache state

## 7. Compare

Keep only improvements backed by evidence.

---

# 40. Oversized Image Debugging

Current Flutter provides `debugInvertOversizedImages`.

It can detect images decoded substantially larger than display need.

Flutter's own guidance recommends:

1. resizing the source itself where possible
2. `cacheWidth`/`cacheHeight`
3. `ResizeImage`

The docs also warn against animating decode dimensions because each change can cause a new decode.

This directly rejects dynamic per-animation-frame decode sizing.

---

# 41. Quality Versus Performance

The target is not "smallest possible image."

It is:

small enough to avoid waste while sharp enough for the intended rendering.

Undersizing causes:

- blur
- visible scaling
- poor Retina quality

Oversizing causes:

- bandwidth waste
- decode memory
- cache pressure

The correct size is display/use-case dependent.

Zoomable media legitimately requires larger representations—but should usually load progressively.

---

# 42. Specialized Use-Case Findings

## Avatars

Ideal characteristics:

- tiny derivative
- stable versioned key
- heavy reuse
- simple fallback

High cache reuse makes them good memory-cache candidates.

## Product images

Architecture:

grid thumbnail
→ detail derivative
→ zoom/original when requested

## Social feeds

Priorities:

- lazy construction
- stable aspect ratios
- right-sized CDN derivatives
- bounded prefetch
- no giant automatic animation workload

## Photo galleries

Thumbnail-first.

Load current full-size page plus narrow neighbors.

## Chat

Repeated avatars benefit from stable keys.

Message-history image attachments should use thumbnails.

## Maps/tile-like resources

Request volume/cardinality can overwhelm general caches.

Use bounded tile-specific policies and respect map-provider caching terms.

## Background images

Right-size to maximum display.

A giant original behind every route is not free merely because it is static.

## Image editors

Biggest danger:
simultaneous full-resolution copies.

Prefer:

- preview proxy
- disk original
- background processing
- bounded intermediates

---

# 43. Anti-Myth Verification

| Claim | Result | Reason |
|---|---|---|
| Cached network images are always faster | False/qualified | disk/cache-manager work can be unnecessary; real bottleneck may be source/decode |
| Flutter automatically disk-caches all remote images | False | standard `ImageCache` is framework memory cache |
| WebP is always best | False | transfer, decode, quality and compatibility vary |
| SVG is always more efficient than PNG | False | vector complexity can dominate |
| Rebuilds always reload network images | False | provider/cache key and cache state control reuse |
| Large compressed files always use lots of RAM | False | decoded pixel dimensions are primary |
| Small compressed files always use little RAM | False | highly compressed huge images decode large |
| `cacheWidth` always improves performance | False | Web ignores network hints; quality/key churn trade-offs; no transfer reduction |
| Precaching everything improves UX | False | causes bandwidth/decode/RAM pressure |
| Increasing ImageCache always helps | False | increases retention |
| RepaintBoundary around every image helps | False | additional layer/cache resources can outweigh benefit |
| Fade-in effects are free | False | rendering/build work remains |
| `Image.network` provides responsive image delivery | False | it does not automatically select CDN source width from layout/DPR |
| Third-party cache packages are required | False | built-in stack may be sufficient |
| `BoxFit` reduces decoded memory | False | it is painting geometry |
| iOS `URLCache` automatically disk-caches Flutter `NetworkImage` | Unsupported/false as general rule | standard Flutter path uses Dart HttpClient |
| HTTP cache headers disable Flutter ImageCache | False | Flutter framework cache and HTTP cache layers are distinct |
| AVIF is universally supported in Flutter | False | not guaranteed; Flutter feature issue remains |
| APNG is guaranteed by Flutter `Image` | False | absent from guaranteed format list |
| `cacheWidth` reduces network transfer bytes | False | it does not change remote URL/content by itself |

---

# 44. Deprecated or Outdated Advice

## "Use `ScrollView.cacheExtent` for all image prefetch tuning"

Current SDK marks that property deprecated.

Use the repository's current `scrollCacheExtent` API when explicitly adjusting this behavior.

More importantly, avoid large arbitrary values.

## "Flutter Web automatically gives every app a managed service worker"

Outdated.

Current Flutter Web documentation says Flutter no longer generates/manages a service worker by default.

## Old custom `ImageProvider` loading APIs

Historical provider examples may use APIs that have since been replaced/deprecated.

Implement custom providers against the exact repository SDK and current `loadImage`/codec APIs rather than copying old `loadBuffer` examples.

## Historical Web renderer advice

Advice written for old Web rendering architectures can be obsolete.

Current Web work must consider CanvasKit/skwasm behavior.

---

# 45. Contradictions and Resolved Ambiguities

## Contradiction A — Web CORS automatic fallback

### Source 1

Flutter Web image guide:
states that lack of CORS automatically falls back to HTML `<img>`.

### Source 2

Current `Image.network` API:
`webHtmlElementStrategy = WebHtmlElementStrategy.never`.

### Source 3

`WebHtmlElementStrategy` API:
defines explicit `fallback`.

### Resolution

The API/source contract is more concrete for `Image.network`.

Do not depend on implicit fallback.

Select `fallback`/`prefer` explicitly and test.

### Status

Official docs remain internally inconsistent.

---

## Ambiguity B — "Decoded at specified size"

High-level Flutter docs describe `cacheWidth`/`cacheHeight` as decoding/storing at the requested size.

What should not be inferred:

every codec/platform necessarily avoids every full-resolution intermediate decode operation.

### Resolution

Guaranteed actionable rule:

- output/cache memory dimensions are controllable on supported paths
- server resizing remains the strongest way to reduce transfer/input work
- do not promise codec-internal implementation details without source verification

---

## Ambiguity C — "All network images are cached"

`Image.network` documentation says all network images are cached regardless of HTTP headers.

This phrase is often misquoted as:

"Flutter persists remote images on disk."

### Resolution

The Flutter image-provider pipeline participates in framework image caching.

That does not establish persistent disk caching.

HTTP/browser/package caches are separate layers.

---

## Ambiguity D — Native OS networking cache

Apple documents `URLCache`.

Android/native frameworks have their own networking/cache facilities.

Flutter's standard native `NetworkImage` source uses Dart `HttpClient`.

### Resolution

Do not attribute native OS HTTP-disk-cache behavior to standard Flutter `NetworkImage` without an implementation that actually uses that network stack.

---

# 46. Areas Where Official Documentation Remains Incomplete

## Codec-specific downsample implementation

Flutter APIs define target dimensions but official public documentation does not provide a stable universal guarantee describing the precise internal subsampling strategy of every codec on every target.

## GPU texture memory

Exact image residency, texture representation, duplication, and renderer memory accounting vary with:

- Impeller/renderer implementation
- Web renderer
- graphics API
- platform memory architecture

Use profiling rather than a universal "`decoded memory × 2`" rule.

## Additional platform codecs

Flutter delegates some unrecognized formats to platform APIs where possible.

This means support outside the guaranteed list is inherently platform/version dependent.

## Network cancellation

Standard `Image.network` does not expose a general application-level cancellation API for its in-flight request.

Do not claim removing the widget guarantees immediate network cancellation unless verified for the exact implementation.

## Web fallback documentation

The current CORS fallback narrative remains inconsistent with the API default as documented above.

---

# 47. Architecture Decision Framework

Use the following order.

## Requirement: simple remote image

Use:
`Image.network` / `NetworkImage`

unless another capability is required.

## Requirement: source is too large

First:
server/CDN resizing.

Then:
client decode sizing where supported.

## Requirement: repeated decoded reuse in current process

Use:
Flutter `ImageCache`.

No new dependency needed.

## Requirement: persistent encoded-file reuse/offline native images

Evaluate:
disk cache / `flutter_cache_manager` / architecture-specific cache.

## Requirement: likely-next image needs zero-visible delay

Use:
bounded `precacheImage`.

## Requirement: huge gallery/zoom

Use:
thumbnail → viewport derivative → larger/tiles.

## Requirement: SVG

Evaluate:
`flutter_svg` / compiled vector asset.

## Requirement: user camera/gallery image

Use:
maintained picker plus preview/upload processing architecture.

## Requirement: custom server-selected URL based on image configuration

Implement:
custom `ImageProvider` only when normal URL construction cannot solve it cleanly.

## Requirement: ImageCache tuning

Only after:
memory/cache-churn profiling.

---

# 48. Recommended Production Metrics

Where tooling permits, record:

## Network

- request count
- transfer bytes
- response latency
- CDN cache-hit headers if available
- original source pixel dimensions

## Memory

- process peak
- post-navigation residual memory
- ImageCache bytes/count
- allocation spikes
- full-resolution image count

## Frames

- p50 frame time
- p95
- p99
- dropped/janky frame count during representative scroll

## CPU

- decode/processing hotspots
- custom compression/resizing

## Quality

- physical target dimensions
- visible sharpness at target DPR
- zoom quality where applicable

Optimization should improve the relevant bottleneck without materially degrading the others.

---

# 49. Final Engineering Conclusions

The most production-effective Flutter image architecture is normally:

1. generate or request the right source
2. transfer only appropriate bytes
3. decode only useful pixels
4. use Flutter's memory cache deliberately
5. add a persistent cache only when it solves an actual requirement
6. keep lists lazy
7. prefetch narrowly
8. reserve layout dimensions
9. minimize unnecessary rendering effects
10. treat Web, animation, and user-generated originals as special cases
11. test constrained hardware
12. measure before and after

The central rule is:

**Do not spend network, CPU, memory, GPU, storage, or battery processing image information the user cannot see.**

At the same time:

**Do not sacrifice required image quality, security, reliability, or maintainability for unmeasured micro-optimizations.**
