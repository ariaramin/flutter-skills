# Flutter Image Performance Research Sources

## Contents

- [V-01 — Flutter release notes](#v-01-flutter-release-notes)
- [V-02 — Flutter SDK archive](#v-02-flutter-sdk-archive)
- [V-03 — Flutter 3.44 release notes](#v-03-flutter-344-release-notes)
- [F-01 — `Image` widget](#f-01-image-widget)
- [F-02 — `Image.network`](#f-02-imagenetwork)
- [F-03 — `NetworkImage`](#f-03-networkimage)
- [F-04 — `NetworkImage.headers`](#f-04-networkimageheaders)
- [F-05 — Native `NetworkImage` framework source](#f-05-native-networkimage-framework-source)
- [F-06 — Web `NetworkImage` framework source](#f-06-web-networkimage-framework-source)
- [F-07 — `ImageProvider`](#f-07-imageprovider)
- [F-08 — `ImageConfiguration`](#f-08-imageconfiguration)
- [F-09 — `AssetImage`](#f-09-assetimage)
- [F-10 — `FileImage`](#f-10-fileimage)
- [F-11 — `MemoryImage`](#f-11-memoryimage)
- [F-12 — `ResizeImage`](#f-12-resizeimage)
- [F-13 — `instantiateImageCodec`](#f-13-instantiateimagecodec)
- [F-14 — `ImageDescriptor.instantiateCodec`](#f-14-imagedescriptorinstantiatecodec)
- [F-15 — `Codec`](#f-15-codec)
- [F-16 — `ImageStreamCompleter`](#f-16-imagestreamcompleter)
- [F-17 — `MultiFrameImageStreamCompleter`](#f-17-multiframeimagestreamcompleter)
- [F-18 — `dart:ui.Image`](#f-18-dartuiimage)
- [F-19 — Image assets and resolution variants](#f-19-image-assets-and-resolution-variants)
- [F-20 — Oversized-image debugging](#f-20-oversized-image-debugging)
- [C-01 — `ImageCache`](#c-01-imagecache)
- [C-02 — `ImageCache.maximumSizeBytes`](#c-02-imagecachemaximumsizebytes)
- [C-03 — `ImageCache.clear`](#c-03-imagecacheclear)
- [C-04 — Flutter memory-pressure handling](#c-04-flutter-memory-pressure-handling)
- [C-05 — `precacheImage`](#c-05-precacheimage)
- [R-01 — Flutter performance best practices](#r-01-flutter-performance-best-practices)
- [R-02 — `ScrollView.cacheExtent`](#r-02-scrollviewcacheextent)
- [R-03 — `Image.frameBuilder`](#r-03-imageframebuilder)
- [R-04 — `Image.loadingBuilder`](#r-04-imageloadingbuilder)
- [R-05 — `Image.errorBuilder`](#r-05-imageerrorbuilder)
- [R-06 — `Opacity`](#r-06-opacity)
- [R-07 — `RepaintBoundary`](#r-07-repaintboundary)
- [DVT-01 — DevTools Performance view](#dvt-01-devtools-performance-view)
- [DVT-02 — DevTools Memory view](#dvt-02-devtools-memory-view)
- [DVT-03 — DevTools Network view](#dvt-03-devtools-network-view)
- [DVT-04 — DevTools CPU profiler](#dvt-04-devtools-cpu-profiler)
- [DVT-05 — Flutter Web performance](#dvt-05-flutter-web-performance)
- [DVT-06 — App size tool](#dvt-06-app-size-tool)
- [DVT-07 — Flutter build modes](#dvt-07-flutter-build-modes)
- [W-01 — Display images on the Web](#w-01-display-images-on-the-web)
- [W-02 — `WebHtmlElementStrategy`](#w-02-webhtmlelementstrategy)
- [W-03 — Web renderers](#w-03-web-renderers)
- [W-04 — Flutter Web FAQ](#w-04-flutter-web-faq)
- [W-05 — Flutter Web support](#w-05-flutter-web-support)
- [DN-01 — `HttpClient`](#dn-01-httpclient)
- [DN-02 — `HttpClientRequest.followRedirects`](#dn-02-httpclientrequestfollowredirects)
- [DN-03 — `HttpClientRequest.maxRedirects`](#dn-03-httpclientrequestmaxredirects)
- [DN-04 — `HttpClientRequest.persistentConnection`](#dn-04-httpclientrequestpersistentconnection)
- [HTTP-01 — RFC 9111: HTTP Caching](#http-01-rfc-9111-http-caching)
- [HTTP-02 — MDN HTTP caching](#http-02-mdn-http-caching)
- [HTTP-03 — MDN CORS](#http-03-mdn-cors)
- [HTTP-04 — MDN Web image formats](#http-04-mdn-web-image-formats)
- [A-01 — Android memory management](#a-01-android-memory-management)
- [A-02 — Loading large bitmaps efficiently](#a-02-loading-large-bitmaps-efficiently)
- [A-03 — `ImageDecoder`](#a-03-imagedecoder)
- [A-04 — Android supported media/image formats](#a-04-android-supported-mediaimage-formats)
- [A-05 — Android Go / low-memory optimization](#a-05-android-go-low-memory-optimization)
- [A-06 — AndroidX `ExifInterface`](#a-06-androidx-exifinterface)
- [AP-01 — iOS Memory Deep Dive, WWDC 2018](#ap-01-ios-memory-deep-dive-wwdc-2018)
- [AP-02 — Responding to memory warnings](#ap-02-responding-to-memory-warnings)
- [AP-03 — `CGImageSource`](#ap-03-cgimagesource)
- [AP-04 — `URLCache`](#ap-04-urlcache)
- [AP-05 — `CGImagePropertyOrientation`](#ap-05-cgimagepropertyorientation)
- [AP-06 — Image I/O Programming Guide](#ap-06-image-io-programming-guide)
- [FM-01 — Flutter `Image` supported formats](#fm-01-flutter-image-supported-formats)
- [FM-02 — Flutter AVIF support issue](#fm-02-flutter-avif-support-issue)
- [FM-03 — Android formats](#fm-03-android-formats)
- [FM-04 — Browser formats](#fm-04-browser-formats)
- [TP-01 — `flutter_svg`](#tp-01-fluttersvg)
- [TP-02 — `vector_graphics`](#tp-02-vectorgraphics)
- [TP-03 — `cached_network_image`](#tp-03-cachednetworkimage)
- [TP-04 — `flutter_cache_manager`](#tp-04-fluttercachemanager)
- [TP-05 — `image_picker`](#tp-05-imagepicker)
- [Known current disagreement](#known-current-disagreement)


> Primary and package-specific sources used by the research. Use this for version-sensitive verification, source conflicts, platform distinctions, and package decisions.

Research date: 2026-08-09

Primary baseline: Flutter documentation currently states that it reflects Flutter 3.44.7. The stable archive snapshot retrieved during research showed Flutter 3.44.6 using Dart 3.12.2, with Flutter 3.47 targeted for August 2026. Version-sensitive conclusions are therefore recorded as Flutter 3.44.x / Dart 3.12.x-era behavior unless a source explicitly states otherwise.

Third-party sources are included only where the Flutter SDK does not provide the capability or where the package itself is under evaluation.

---

# Flutter Version and Release Context

## V-01 — Flutter release notes

URL:
https://docs.flutter.dev/release/release-notes

Establishes:

- current official Flutter documentation release context
- current documentation states it reflects Flutter 3.44.7
- release-note entry point for checking later changes

Context:
Retrieved 2026-08-09. Page last updated July 2026.

## V-02 — Flutter SDK archive

URL:
https://docs.flutter.dev/install/archive

Establishes:

- stable Flutter/Dart pairings
- Flutter 3.44 release line
- Dart 3.12.x pairing
- 2026 release schedule
- Flutter 3.47 target in August 2026

Context:
Retrieved 2026-08-09. The archive snapshot exposed stable builds through 3.44.6/Dart 3.12.2 even though the documentation footer reflected Flutter 3.44.7.

## V-03 — Flutter 3.44 release notes

URL:
https://docs.flutter.dev/release/release-notes/release-notes-3.44.0

Establishes:

- changes included in the 3.44 release line
- Web/engine changes relevant to the current baseline

Context:
Flutter 3.44, 2026.

---

# Flutter Image Pipeline and Core APIs

## F-01 — `Image` widget

URL:
https://api.flutter.dev/flutter/widgets/Image-class.html

Establishes:

- standard image constructors
- guaranteed format list:
  - JPEG
  - PNG
  - GIF
  - animated GIF
  - WebP
  - animated WebP
  - BMP
  - WBMP
- platform decoders may provide additional formats
- memory guidance
- large decoded image footprint
- multiframe image pausing through `TickerMode` and disabled animations
- custom provider examples

Important current guidance:

A 3840×2160 decoded image can consume over 30 MB assuming 32 bits/pixel. `cacheWidth`/`cacheHeight` can substantially reduce retained decoded-memory footprint.

Context:
Current Flutter API docs, retrieved 2026-08-09.

## F-02 — `Image.network`

URL:
https://api.flutter.dev/flutter/widgets/Image/Image.network.html

Establishes:

- network-image constructor behavior
- `headers`
- `cacheWidth`
- `cacheHeight`
- layout guidance
- Web CORS handling
- Web HTML-element strategy
- Web limitation that decode-size hints are ignored
- Android Internet permission
- implementation wrapping `NetworkImage` in `ResizeImage.resizeIfNeeded`
- statement that network images participate in Flutter image caching regardless of HTTP response caching headers

Important caveat:

The cache statement refers to Flutter's image pipeline/cache behavior and must not be interpreted as a persistent disk-cache guarantee.

Context:
Current Flutter API docs, retrieved 2026-08-09.

## F-03 — `NetworkImage`

URL:
https://api.flutter.dev/flutter/painting/NetworkImage-class.html

Establishes:

- `NetworkImage` as an `ImageProvider`
- URL/scale/header configuration
- Web rendering strategy

Context:
Current API.

## F-04 — `NetworkImage.headers`

URL:
https://api.flutter.dev/flutter/painting/NetworkImage/headers.html

Establishes:

- native request headers are supplied through the networking request
- Web behavior differs

Context:
Current API.

## F-05 — Native `NetworkImage` framework source

URL:
https://github.com/flutter/flutter/blob/3.44.7/packages/flutter/lib/src/painting/_network_image_io.dart

Establishes at source level:

- native `NetworkImage` networking path
- reusable Dart `HttpClient`
- request-header behavior
- byte accumulation / immutable-buffer creation
- HTTP failure handling
- failed-key eviction behavior

Caveat:

Always inspect the source corresponding to the repository's exact Flutter tag before relying on source-level details.

## F-06 — Web `NetworkImage` framework source

URL:
https://github.com/flutter/flutter/blob/3.44.7/packages/flutter/lib/src/painting/_network_image_web.dart

Establishes at source level:

- Web byte-fetch versus HTML-element paths
- `WebHtmlElementStrategy`
- limitations involving request headers
- Web-specific decode/render branching

Context:
Flutter 3.44.7 source baseline.

## F-07 — `ImageProvider`

URL:
https://api.flutter.dev/flutter/painting/ImageProvider-class.html

Establishes:

- `ImageProvider` resolution lifecycle
- global `imageCache` use
- importance of immutable keys
- equality/hashCode expectations
- custom image-provider architecture

Context:
Current API.

## F-08 — `ImageConfiguration`

URL:
https://api.flutter.dev/flutter/painting/ImageConfiguration-class.html

Establishes:

- DPR
- bundle
- locale
- text direction
- target size
- platform configuration available during provider resolution

Context:
Current API.

## F-09 — `AssetImage`

URL:
https://api.flutter.dev/flutter/painting/AssetImage-class.html

Establishes:

- device-pixel-ratio-aware asset selection
- 1×/2×/3×-style density variants

Context:
Current API.

## F-10 — `FileImage`

URL:
https://api.flutter.dev/flutter/painting/FileImage-class.html

Establishes:

- local native-file provider behavior
- cache participation

Related:
https://api.flutter.dev/flutter/widgets/Image/Image.file.html

Important caveat:
Normal `dart:io` file access is not a Web image strategy.

## F-11 — `MemoryImage`

URL:
https://api.flutter.dev/flutter/painting/MemoryImage-class.html

Related:
https://api.flutter.dev/flutter/widgets/Image/Image.memory.html

Establishes:

- image creation from encoded in-memory bytes
- image cache participation

Important caveat:
Passing already decoded raw pixel data is not the purpose of `Image.memory`; it expects encoded image data supported by the codec pipeline.

## F-12 — `ResizeImage`

URL:
https://api.flutter.dev/flutter/painting/ResizeImage-class.html

Establishes:

- provider wrapper for requesting target decoded dimensions
- resize key participation
- target output dimensions

Context:
Current API.

## F-13 — `instantiateImageCodec`

URL:
https://api.flutter.dev/flutter/dart-ui/instantiateImageCodec.html

Establishes:

- low-level codec creation
- target width/height semantics
- supported formats through the Flutter codec path

Important caveat:
Target dimensions describe requested output. Do not generalize every codec implementation into a claim that all source data is always subsampled before any decode work.

## F-14 — `ImageDescriptor.instantiateCodec`

URL:
https://api.flutter.dev/flutter/dart-ui/ImageDescriptor/instantiateCodec.html

Establishes:

- lower-level codec instantiation
- target dimensions
- codec lifecycle

Context:
Current API.

## F-15 — `Codec`

URL:
https://api.flutter.dev/flutter/dart-ui/Codec-class.html

Establishes:

- frame-oriented image decode API
- animated/multiframe codec behavior
- disposal responsibility for direct users

## F-16 — `ImageStreamCompleter`

URL:
https://api.flutter.dev/flutter/painting/ImageStreamCompleter-class.html

Establishes:

- image-stream completion architecture
- listeners and image lifecycle

## F-17 — `MultiFrameImageStreamCompleter`

URL:
https://api.flutter.dev/flutter/painting/MultiFrameImageStreamCompleter-class.html

Establishes:

- multiframe scheduling
- codec ownership
- frame decode scheduling
- listener-dependent behavior

Context:
Current API.

## F-18 — `dart:ui.Image`

URL:
https://api.flutter.dev/flutter/dart-ui/Image-class.html

Establishes:

- decoded image object
- cloning/ownership concepts
- explicit disposal obligations for direct resource owners

## F-19 — Image assets and resolution variants

URL:
https://docs.flutter.dev/ui/assets/assets-and-images

Establishes:

- asset declarations
- resolution-aware variants
- `AssetImage` selection
- bundle behavior

Context:
Current Flutter docs.

## F-20 — Oversized-image debugging

URL:
https://api.flutter.dev/flutter/rendering/debugInvertOversizedImages.html

Establishes:

- development detection of excessively decoded images
- recommendation to resize source assets where possible
- use of `cacheWidth`, `cacheHeight`, or `ResizeImage`
- warning against animating decode dimensions
- importance of target-device testing

Context:
Debug/assert builds only.

---

# Flutter Image Cache

## C-01 — `ImageCache`

URL:
https://api.flutter.dev/flutter/painting/ImageCache-class.html

Establishes:

- least-recently-used framework cache
- pending images
- live images
- ordinary cached/keep-alive images
- default entry and byte limits
- cache metrics and lifecycle

Current defaults documented:
approximately 1000 images and 100 MB.

These defaults are implementation defaults, not application recommendations.

## C-02 — `ImageCache.maximumSizeBytes`

URL:
https://api.flutter.dev/flutter/painting/ImageCache/maximumSizeBytes.html

Establishes:

- byte-limit tuning API

Caveat:
Tuning must be measured against application/device behavior.

## C-03 — `ImageCache.clear`

URL:
https://api.flutter.dev/flutter/painting/ImageCache/clear.html

Establishes:

- clearing behavior
- distinction between ordinary cached/pending images and live images

## C-04 — Flutter memory-pressure handling

URL:
https://api.flutter.dev/flutter/painting/PaintingBinding/handleMemoryPressure.html

Establishes:

Current `PaintingBinding.handleMemoryPressure` responds to OS memory pressure by invoking `imageCache.clear()`.

Context:
Current API docs explicitly showed this implementation in the 3.44 stable line.

## C-05 — `precacheImage`

URL:
https://api.flutter.dev/flutter/widgets/precacheImage.html

Establishes:

- image preloading lifecycle
- cache/live image behavior
- end-of-frame listener release
- OOM caution for excessive pinning/preloading

---

# Scrolling, Layout, and Rendering

## R-01 — Flutter performance best practices

URL:
https://docs.flutter.dev/perf/best-practices

Establishes:

- lazy list/grid construction
- avoiding unnecessary layout passes
- `saveLayer` costs
- opacity guidance
- clipping/effect trade-offs
- performance measurement discipline

## R-02 — `ScrollView.cacheExtent`

URL:
https://api.flutter.dev/flutter/widgets/ScrollView/cacheExtent.html

Establishes:

- historical offscreen scroll-cache extent API
- current deprecation state

Current recommendation:
Use the SDK's current `scrollCacheExtent` API where available rather than introducing deprecated `cacheExtent` usage.

## R-03 — `Image.frameBuilder`

URL:
https://api.flutter.dev/flutter/widgets/Image/frameBuilder.html

Establishes:

- image-frame builder semantics
- placeholder/transition opportunities

## R-04 — `Image.loadingBuilder`

URL:
https://api.flutter.dev/flutter/widgets/Image/loadingBuilder.html

Establishes:

- loading-progress builder behavior
- possibility of rebuilding during loading/progress

Practical implication:
Do not put unnecessary expensive effects inside loading builders.

## R-05 — `Image.errorBuilder`

URL:
https://api.flutter.dev/flutter/widgets/Image/errorBuilder.html

Establishes:

- image failure UI hook

## R-06 — `Opacity`

URL:
https://api.flutter.dev/flutter/widgets/Opacity-class.html

Establishes:

- compositing behavior and opacity cost considerations

## R-07 — `RepaintBoundary`

URL:
https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html

Establishes:

- repaint isolation semantics

Caveat:
It is not a blanket image-performance optimization.

---

# Flutter DevTools and Profiling

## DVT-01 — DevTools Performance view

URL:
https://docs.flutter.dev/tools/devtools/performance

Establishes:

- frame timeline analysis
- UI/raster work
- expensive build/layout/paint analysis
- performance tracing

## DVT-02 — DevTools Memory view

URL:
https://docs.flutter.dev/tools/devtools/memory

Establishes:

- process memory
- allocations
- snapshots
- memory growth investigation
- raster/image-related memory observation where exposed

## DVT-03 — DevTools Network view

URL:
https://docs.flutter.dev/tools/devtools/network

Establishes:

- request tracing for supported Dart networking stacks
- request timing and traffic inspection

Caveat:
Use browser network tooling for Flutter Web.

## DVT-04 — DevTools CPU profiler

URL:
https://docs.flutter.dev/tools/devtools/cpu-profiler

Establishes:

- CPU sampling/profiling
- identifying expensive decode/image-processing work

## DVT-05 — Flutter Web performance

URL:
https://docs.flutter.dev/perf/web-performance

Establishes:

- browser tooling
- Web performance methodology

## DVT-06 — App size tool

URL:
https://docs.flutter.dev/tools/devtools/app-size

Establishes:

- build-size analysis
- local asset/package contribution investigation

## DVT-07 — Flutter build modes

URL:
https://docs.flutter.dev/testing/build-modes

Establishes:

- debug/profile/release differences
- why profile/release-appropriate measurements matter

---

# Flutter Web

## W-01 — Display images on the Web

URL:
https://docs.flutter.dev/platform-integration/web/web-images

Establishes:

- browser image options
- CORS restrictions
- browser `<img>`/`<picture>` characteristics
- browser image caching
- CORS-enabled CDN recommendation
- proxy option when origin cannot be modified

Important ambiguity:

At the time of research this page states that Flutter automatically falls back to HTML `<img>` for cross-origin images lacking CORS.

This conflicts with the current concrete `Image.network` API documentation, which states that `WebHtmlElementStrategy.never` is the default.

Operational resolution:
Treat the concrete API/source behavior for the exact SDK as authoritative and select `fallback`/`prefer` explicitly if needed.

Context:
Page states Flutter 3.44.7 and was updated 2026-07-31.

## W-02 — `WebHtmlElementStrategy`

URL:
https://api.flutter.dev/flutter/painting/WebHtmlElementStrategy.html

Establishes current enum values:

- `never`
- `fallback`
- `prefer`

and behavior of each.

## W-03 — Web renderers

URL:
https://docs.flutter.dev/platform-integration/web/renderers

Establishes:

- CanvasKit
- skwasm
- default versus WebAssembly build behavior
- CanvasKit fallback

Context:
Current 2026 Flutter Web renderer architecture.

## W-04 — Flutter Web FAQ

URL:
https://docs.flutter.dev/platform-integration/web/faq

Establishes:

- current Flutter Web deployment behavior
- browser/CDN cache-header considerations
- Flutter no longer generating/managing a service worker by default
- need for explicit service-worker tooling for offline/advanced caching

## W-05 — Flutter Web support

URL:
https://docs.flutter.dev/platform-integration/web

Establishes:

- supported current Web architecture
- Wasm context
- cross-platform expectations

---

# Dart Networking

## DN-01 — `HttpClient`

URL:
https://api.dart.dev/dart-io/HttpClient-class.html

Establishes:

- Dart native HTTP client
- reusable connections
- request lifecycle

Relevant because the standard native Flutter `NetworkImage` uses Dart networking.

## DN-02 — `HttpClientRequest.followRedirects`

URL:
https://api.dart.dev/dart-io/HttpClientRequest/followRedirects.html

Establishes:

- automatic redirect behavior
- security handling for sensitive headers during redirects

## DN-03 — `HttpClientRequest.maxRedirects`

URL:
https://api.dart.dev/dart-io/HttpClientRequest/maxRedirects.html

Establishes:

- bounded redirect count

## DN-04 — `HttpClientRequest.persistentConnection`

URL:
https://api.dart.dev/dart-io/HttpClientRequest/persistentConnection.html

Establishes:

- persistent connection behavior

Important distinction:
Persistent HTTP connections are not persistent image disk caching.

---

# HTTP and Browser Standards

## HTTP-01 — RFC 9111: HTTP Caching

URL:
https://www.rfc-editor.org/rfc/rfc9111.html

Establishes:

- HTTP caching semantics
- freshness
- validation
- conditional requests
- shared/private caching principles

## HTTP-02 — MDN HTTP caching

URL:
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching

Establishes:

- practical browser caching behavior
- `Cache-Control`
- `ETag`
- `Last-Modified`
- revalidation
- immutable/versioned-resource strategies

## HTTP-03 — MDN CORS

URL:
https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

Establishes:

- browser cross-origin request rules
- origin response-header requirements

## HTTP-04 — MDN Web image formats

URL:
https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types

Establishes browser-level characteristics/support for:

- JPEG
- PNG
- GIF
- WebP
- AVIF
- APNG
- SVG

Important distinction:
Browser support does not automatically establish Flutter's cross-platform guaranteed codec set.

---

# Android

## A-01 — Android memory management

URL:
https://developer.android.com/topic/performance/memory

Establishes:

- Android process memory constraints
- GC/memory pressure
- common bitmap memory reasoning
- 4-byte-per-pixel ARGB_8888 examples

Context:
Updated Android guidance available in 2026.

## A-02 — Loading large bitmaps efficiently

URL:
https://developer.android.com/topic/performance/graphics/load-bitmap

Establishes:

- large images waste memory when UI needs a smaller result
- target-size/subsampling concept
- matching bitmap resolution to UI requirements

Important caveat:
This is native Android guidance. Do not assert that Flutter maps every codec operation directly to the exact Android API shown here.

## A-03 — `ImageDecoder`

URL:
https://developer.android.com/reference/android/graphics/ImageDecoder

Establishes:

- Android native image decoder
- target-size/sample concepts

Context:
Platform behavior reference, not a promise about every Flutter codec path.

## A-04 — Android supported media/image formats

URL:
https://developer.android.com/media/platform/supported-formats

Establishes:

- Android platform codec availability
- version-specific formats such as HEIF/AVIF

Important distinction:
Platform support is broader/different from Flutter's guaranteed cross-platform format list.

## A-05 — Android Go / low-memory optimization

URL:
https://developer.android.com/guide/topics/androidgo/optimize-memory

Establishes:

- importance of reduced memory use on low-RAM Android devices

## A-06 — AndroidX `ExifInterface`

URL:
https://developer.android.com/reference/androidx/exifinterface/media/ExifInterface

Establishes:

- EXIF metadata
- orientation
- GPS-related metadata concerns

---

# Apple Platforms

## AP-01 — iOS Memory Deep Dive, WWDC 2018

URL:
https://developer.apple.com/videos/play/wwdc2018/416/

Establishes:

- image memory is driven by pixel dimensions
- encoded file size versus decoded memory distinction
- decode/render stages
- example of compressed image expanding greatly when decoded
- native downsampling guidance

Still useful as architecture-level Apple memory guidance.

## AP-02 — Responding to memory warnings

URL:
https://developer.apple.com/documentation/uikit/responding-to-memory-warnings

Establishes:

- iOS memory pressure expectations
- releasing reloadable resources

## AP-03 — `CGImageSource`

URL:
https://developer.apple.com/documentation/imageio/cgimagesource

Establishes:

- Apple ImageIO decode/source APIs
- native image-source/downsampling architecture

Important caveat:
Do not automatically claim Flutter exposes or uses every ImageIO optimization through every image provider.

## AP-04 — `URLCache`

URL:
https://developer.apple.com/documentation/foundation/urlcache

Establishes:

- URL Loading System memory/disk HTTP caching

Important Flutter distinction:
The standard Flutter native `NetworkImage` source uses Dart `HttpClient`; therefore do not assume `URLCache` is the cache layer for normal Flutter `NetworkImage` traffic.

## AP-05 — `CGImagePropertyOrientation`

URL:
https://developer.apple.com/documentation/imageio/cgimagepropertyorientation

Establishes:

- orientation metadata considerations for camera-generated images

## AP-06 — Image I/O Programming Guide

URL:
https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/ImageIOGuide/imageio_source/ikpg_source.html

Establishes:

- source/destination image I/O concepts
- incremental/image-source processing context

Context:
Archived Apple documentation; used only for stable platform concepts and cross-checked against current APIs.

---

# Formats and Codec Support

## FM-01 — Flutter `Image` supported formats

URL:
https://api.flutter.dev/flutter/widgets/Image-class.html

Primary cross-platform Flutter source.

Guaranteed list currently includes:

- JPEG
- PNG
- GIF
- animated GIF
- WebP
- animated WebP
- BMP
- WBMP

Additional platform formats are best-effort/platform-dependent.

## FM-02 — Flutter AVIF support issue

URL:
https://github.com/flutter/flutter/issues/61229

Establishes:

- explicit Flutter engine/framework AVIF support remains tracked as a feature request
- AVIF should not be represented as universally guaranteed by Flutter

Status observed:
Open at research time.

## FM-03 — Android formats

URL:
https://developer.android.com/media/platform/supported-formats

Used to distinguish Android native capability from Flutter guarantees.

## FM-04 — Browser formats

URL:
https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types

Used to distinguish Web/browser capability from native Flutter guarantees.

---

# SVG and Vector Graphics

These are third-party/ecosystem sources because Flutter's raster `Image` widget is not itself an SVG renderer.

## TP-01 — `flutter_svg`

URL:
https://pub.dev/packages/flutter_svg

Current version observed during research:
2.3.0.

Publisher:
flutter.dev.

Establishes:

- SVG rendering capability
- platform support
- picture versus raster rendering strategy
- integration with vector-graphics compilation

Use only when SVG is genuinely required.

## TP-02 — `vector_graphics`

URL:
https://pub.dev/packages/vector_graphics

Current version observed:
1.2.2.

Publisher:
flutter.dev.

Establishes:

- compiled vector representation
- reduced runtime parsing
- optimization of vector assets

---

# Persistent Network Image Caching

## TP-03 — `cached_network_image`

URL:
https://pub.dev/packages/cached_network_image/versions/3.4.1

Version observed:
3.4.1.

Publisher:
baseflow.com.

Establishes:

- widget/provider convenience
- placeholders/progress/error handling
- dependency on `flutter_cache_manager`
- cache-directory behavior on supported platforms
- explicit statement that Web support is minimal and currently does not include caching

Important conclusion:
It is not a mandatory production dependency and is not automatically faster than Flutter's built-in image APIs.

## TP-04 — `flutter_cache_manager`

URL:
https://pub.dev/packages/flutter_cache_manager

Version observed during research:
3.4.2.

Establishes:

- cache-directory file storage
- `Cache-Control`/ETag-aware freshness
- stale-period and object-count eviction behavior
- file retrieval/revalidation
- resized cached variants

Important caveat:
A cache directory is evictable temporary storage, not durable user data.

---

# User-Generated Image Selection

## TP-05 — `image_picker`

URL:
https://pub.dev/packages/image_picker

Version observed during research:
1.2.3.

Publisher:
flutter.dev.

Establishes:

- camera/gallery selection
- Android lost-data recovery
- temporary camera-output behavior
- platform-specific limitations
- desktop file-selector behavior
- metadata-related options

Important use:
Robust handling of user-selected/captured media, not general image rendering.

---

# Source-Selection Discipline

When these sources disagree:

1. Prefer the current API documentation for a concrete API contract.
2. Inspect framework/engine source for the exact Flutter tag when API docs are ambiguous.
3. Treat high-level narrative documentation as guidance, not an override of concrete API behavior.
4. Treat native Android/Apple/browser behavior as platform context rather than automatically attributing the same implementation to Flutter.
5. Treat package documentation as authoritative only for that package.
6. Never infer cross-platform codec support from one native platform.
7. Record uncertainty instead of inventing behavior.

## Known current disagreement

The primary documented disagreement discovered during this research is:

- Flutter Web image guide: says cross-origin images without CORS automatically fall back to HTML `<img>`.
- Current `Image.network` API: default `WebHtmlElementStrategy.never`.

The operational skill therefore requires explicit strategy selection and target-version integration testing rather than depending on implicit fallback.
