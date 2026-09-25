# Reference: Format selection, source APIs, loaders, sizing, BoxFit, clipping, theming, semantics, RTL, errors, unsupported features, and asset authoring.

> Preserved from `flutter_svg Engineering Skill for Flutter.md`, source lines 1-1641.

## Contents

- [flutter_svg Engineering Skill for Flutter](#fluttersvg-engineering-skill-for-flutter)
  - [Purpose](#purpose)
- [When to Use This Skill](#when-to-use-this-skill)
- [When NOT to Use SVG](#when-not-to-use-svg)
  - [Prefer `Icon` for standard iconography](#prefer-icon-for-standard-iconography)
  - [Prefer SVG when vector properties provide real value](#prefer-svg-when-vector-properties-provide-real-value)
  - [Prefer raster when rendering complexity dominates](#prefer-raster-when-rendering-complexity-dominates)
- [Core Principles](#core-principles)
- [Mental Model](#mental-model)
  - [Important consequence](#important-consequence)
  - [Cache layers are separate](#cache-layers-are-separate)
- [API Selection Guide](#api-selection-guide)
- [Asset SVGs](#asset-svgs)
  - [Declare assets](#declare-assets)
  - [Icon](#icon)
  - [Illustration](#illustration)
  - [Package asset](#package-asset)
  - [Why assets usually beat remote SVGs for static UI](#why-assets-usually-beat-remote-svgs-for-static-ui)
- [Network SVGs](#network-svgs)
  - [Stable placeholder size](#stable-placeholder-size)
  - [Headers](#headers)
  - [Custom HTTP client](#custom-http-client)
  - [Do not use `SvgPicture.network` for advanced network policy](#do-not-use-svgpicturenetwork-for-advanced-network-policy)
  - [Status-code caveat](#status-code-caveat)
- [String and Dynamic SVGs](#string-and-dynamic-svgs)
  - [Do not construct huge markup repeatedly in `build`](#do-not-construct-huge-markup-repeatedly-in-build)
  - [Prefer color mapping to regenerating markup](#prefer-color-mapping-to-regenerating-markup)
- [SVG from Memory / Bytes](#svg-from-memory-bytes)
  - [Cache-key implication](#cache-key-implication)
- [Native File SVGs](#native-file-svgs)
  - [Web](#web)
- [Custom Loaders](#custom-loaders)
  - [Do not instantiate arbitrary loader state every build](#do-not-instantiate-arbitrary-loader-state-every-build)
  - [Custom loader is justified when](#custom-loader-is-justified-when)
- [Sizing and Layout](#sizing-and-layout)
  - [Flutter size and SVG `viewBox` are different concepts](#flutter-size-and-svg-viewbox-are-different-concepts)
  - [Icons](#icons)
  - [Toolbar/action icon](#toolbaraction-icon)
  - [Responsive illustration](#responsive-illustration)
  - [Full-width illustration](#full-width-illustration)
  - [Avoid unconstrained layout mistakes](#avoid-unconstrained-layout-mistakes)
- [BoxFit](#boxfit)
  - [Default](#default)
  - [Do not use `fill` casually](#do-not-use-fill-casually)
  - [`cover` requires crop awareness](#cover-requires-crop-awareness)
- [Alignment and Clipping](#alignment-and-clipping)
  - [Alignment](#alignment)
  - [Clipping](#clipping)
  - [`allowDrawingOutsideViewBox`](#allowdrawingoutsideviewbox)
- [Theming](#theming)
- [ColorFilter](#colorfilter)
  - [Monochrome icon](#monochrome-icon)
  - [Disabled icon](#disabled-icon)
  - [Why `srcIn`](#why-srcin)
  - [Do not wrap unnecessarily in `ColorFiltered`](#do-not-wrap-unnecessarily-in-colorfiltered)
- [Color Mapping](#color-mapping)
  - [Production mapper](#production-mapper)
  - [Why mapper equality matters](#why-mapper-equality-matters)
  - [Select by context when needed](#select-by-context-when-needed)
- [Multi-Color SVGs](#multi-color-svgs)
- [`SvgTheme`](#svgtheme)
- [Dark Mode](#dark-mode)
  - [Monochrome icon](#monochrome-icon)
  - [Multi-color illustration](#multi-color-illustration)
  - [Separate light/dark assets](#separate-lightdark-assets)
- [Semantics and Accessibility](#semantics-and-accessibility)
  - [Meaningful image](#meaningful-image)
  - [Decorative artwork](#decorative-artwork)
  - [Functional SVG inside a button](#functional-svg-inside-a-button)
  - [Do not use filename as semantics](#do-not-use-filename-as-semantics)
- [RTL / Directionality](#rtl-directionality)
  - [Good candidates](#good-candidates)
  - [Do not mirror indiscriminately](#do-not-mirror-indiscriminately)
- [Placeholders](#placeholders)
- [Error Handling](#error-handling)
  - [Asset](#asset)
  - [Remote](#remote)
  - [Dynamic input](#dynamic-input)
- [Unsupported SVG Features](#unsupported-svg-features)
  - [Do not automatically classify these as unsupported](#do-not-automatically-classify-these-as-unsupported)
  - [Static-renderer boundary](#static-renderer-boundary)
  - [When source uses unsupported functionality](#when-source-uses-unsupported-functionality)
- [SVG Authoring Guidelines](#svg-authoring-guidelines)
  - [Export presentation attributes](#export-presentation-attributes)
  - [Embed image data instead of linking](#embed-image-data-instead-of-linking)
  - [Remove unnecessary editor output](#remove-unnecessary-editor-output)
  - [Minimize path complexity](#minimize-path-complexity)
  - [Avoid huge embedded raster payloads](#avoid-huge-embedded-raster-payloads)
  - [Convert fragile font-dependent text](#convert-fragile-font-dependent-text)

---

# flutter_svg Engineering Skill for Flutter

## Purpose

Use this skill to design, implement, review, debug, test, migrate, and optimize SVG rendering in production Flutter applications using `flutter_svg`.

Apply it to make senior-level decisions about:

- whether SVG is the correct format;
- which current `SvgPicture` API or loader to use;
- bundled, network, string, memory, and file sources;
- layout, dimensions, `BoxFit`, alignment, and clipping;
- single-color and multicolor theming;
- `ColorFilter`, `ColorMapper`, and `SvgTheme`;
- accessibility and RTL behavior;
- parsed-vector caching and reuse;
- network caching boundaries;
- precompiled `.vec` assets;
- `RenderingStrategy.picture` vs `RenderingStrategy.raster`;
- complex-vector performance;
- list/grid rendering;
- error fallbacks;
- unsupported SVG features;
- dynamic/untrusted SVG input;
- widget, semantics, and golden tests;
- migration away from deprecated `flutter_svg` APIs.

This skill targets current `flutter_svg` **2.3.0** behavior. Current `flutter_svg` uses the first-party `vector_graphics` stack: SVG XML is loaded, parsed/compiled into a vector-graphics binary representation, and then decoded/rendered through `vector_graphics`. Recent releases added `colorMapper`, `renderingStrategy`, `errorBuilder`, and `imageBuilder`; older `PictureProvider`/picture-cache-era APIs should not be introduced into new code.

The scope follows the supplied production rendering requirements.

### Evidence terminology

Interpret guidance using these labels:

- **flutter_svg behavior** — behavior documented or implemented by current `flutter_svg`.
- **vector_graphics behavior** — behavior implemented/documented by its first-party rendering/compiler stack.
- **Official recommendation** — guidance explicitly stated by the package maintainers.
- **Architecture recommendation** — production guidance inferred from documented behavior.
- **General Flutter rendering practice** — Flutter UI/performance guidance that is not a `flutter_svg` guarantee.

Do not present architectural inference as a package guarantee.

---

# When to Use This Skill

Apply this skill when:

- adding an SVG asset;
- implementing vector icons;
- rendering illustrations;
- displaying remote SVGs;
- receiving SVG markup from a CMS/backend;
- rendering SVG bytes from another data layer;
- loading SVG files on native platforms;
- recoloring an SVG;
- implementing light/dark variants;
- building an icon/design system;
- adding accessibility semantics;
- supporting RTL;
- diagnosing blank or malformed SVGs;
- replacing deprecated `color`/`colorBlendMode`;
- optimizing SVG-heavy lists or grids;
- investigating raster-thread jank;
- reducing repeated SVG parsing;
- deciding whether to precompile SVGs;
- deciding whether to rasterize complex artwork;
- testing SVG-based UI;
- reviewing network SVG security;
- upgrading `flutter_svg`.

---

# When NOT to Use SVG

Do not choose SVG merely because design handed you an `.svg` file.

Use the rendering primitive that best matches the visual and runtime requirements.

| Requirement | Prefer |
|---|---|
| Standard Material icon | Flutter `Icon` / `Icons` |
| Tiny monochrome icon already available as icon glyph | `Icon` |
| Scalable static custom icon | `flutter_svg` |
| Scalable static illustration | `flutter_svg` |
| Complex illustration with expensive vector rendering and fixed display size | Profile SVG; consider raster image |
| Animated/interactive vector scene | Animation-specific solution such as Rive/Lottie/custom Flutter animation |
| Procedural vector drawing | `CustomPainter` |
| Photograph | Raster image |
| Large bitmap embedded inside an SVG shell | Raster image directly |
| Platform-specific native image pipeline requirement | Native/image-specific solution |
| Remote image whose source format does not matter to the app | General image/network abstraction may be better |
| Extremely high-frequency tiny icon repeated thousands of times | Profile `Icon`, simple vector, precompiled asset, or raster alternative |

## Prefer `Icon` for standard iconography

Bad:

```dart
SvgPicture.asset(
  'assets/icons/close.svg',
  width: 24,
  height: 24,
);
```

when Flutter already provides the exact desired icon.

Better:

```dart
const Icon(
  Icons.close,
  size: 24,
);
```

`Icon` avoids an external asset and SVG parsing/rendering pipeline.

## Prefer SVG when vector properties provide real value

Good candidates:

- custom brand icons;
- scalable line icons;
- logos;
- illustrations;
- assets requiring selective theme-color replacement;
- artwork displayed at multiple sizes.

## Prefer raster when rendering complexity dominates

A 15 KB SVG containing hundreds or thousands of complex paths may cost more to render than a 100 KB PNG.

Do not equate source-file byte size with rendering cost.

---

# Core Principles

1. **Use current APIs only.**
2. **Prefer bundled assets for stable application artwork.**
3. **Size SVG widgets intentionally.**
4. **Do not rely on asynchronous intrinsic size to stabilize layout.**
5. **Keep stable source/loaders so cache keys remain reusable.**
6. **Do not rebuild large SVG markup strings unnecessarily.**
7. **Use `colorFilter` for whole-picture tinting.**
8. **Use `ColorMapper` for selective source-aware recoloring.**
9. **Do not globally tint multicolor artwork unless that is the intended design.**
10. **Treat package vector caching and HTTP caching as separate systems.**
11. **Do not assume network SVGs have a complete persistent HTTP-cache policy.**
12. **Use `errorBuilder` for sources that can fail.**
13. **Provide meaningful semantics for meaningful images.**
14. **Explicitly exclude decorative SVGs from semantics.**
15. **Mirror only direction-sensitive artwork in RTL.**
16. **Keep clipping at the least expensive correct level.**
17. **Keep `allowDrawingOutsideViewBox` disabled unless the asset actually requires it.**
18. **Profile complex SVGs before changing rendering strategy.**
19. **Use precompiled vector assets for measured parse/startup pressure, not universally.**
20. **Do not precache every SVG in the application.**
21. **Treat arbitrary remote/user SVG markup as untrusted input.**
22. **Do not expect `flutter_svg` to sanitize arbitrary SVG.**
23. **Simplify unsupported assets instead of building fragile rendering workarounds.**
24. **Use golden tests for visual migrations that can subtly change rendering.**
25. **Keep SVG rendering in the presentation layer.**

---

# Mental Model

Use this conceptual pipeline:

```text
SVG source
    ↓
SvgLoader / BytesLoader
    ↓
source bytes / UTF-8 markup
    ↓
SVG parsing + vector compilation
    ↓
cached vector-graphics ByteData
    ↓
vector_graphics decode
    ↓
Picture / raster representation
    ↓
Flutter layout constraints
    ↓
FittedBox / fit / alignment / clipping
    ↓
paint into Flutter scene
```

Current `SvgLoader` implementations compile SVG XML into the `vector_graphics` binary representation using Flutter's `compute` path, and cache that compiled `ByteData`. Rendering then passes through `VectorGraphic`.

## Important consequence

A widget rebuild does **not** automatically mean:

```text
reload SVG
→ parse XML
→ compile everything
```

if the loader/cache key remains equivalent.

However, repeated work can occur when you continually change:

- source strings;
- bytes identity;
- theme;
- `ColorMapper`;
- asset bundle;
- package/source path;
- network URL;
- network headers;
- loader cache key.

## Cache layers are separate

Think in layers:

```text
HTTP/CDN/browser/application byte cache
                  ↓
          SVG source bytes
                  ↓
flutter_svg compiled-vector cache
                  ↓
vector_graphics live Picture reuse
                  ↓
             painted frame
```

Do not conflate them.

---

# API Selection Guide

Current `SvgPicture` supports convenience constructors for assets, network URLs, strings, bytes, and native files, plus the generic loader constructor.

| Source | Preferred API |
|---|---|
| Bundled SVG | `SvgPicture.asset` |
| HTTP/HTTPS SVG with simple fetching needs | `SvgPicture.network` |
| Raw SVG XML string | `SvgPicture.string` |
| SVG UTF-8 bytes already in memory | `SvgPicture.memory` |
| Native `dart:io File` | `SvgPicture.file` |
| Precompiled `.vec` | `SvgPicture(AssetBytesLoader(...))` |
| Custom source/cache semantics | Custom `BytesLoader` |
| Authenticated/validated network source with custom retry/cache/timeout policy | Fetch in network layer → `SvgPicture.memory` |

---

# Asset SVGs

For stable application UI artwork, bundled assets are usually the most reliable choice.

## Declare assets

```yaml
flutter:
  assets:
    - assets/icons/
    - assets/illustrations/
```

## Icon

```dart
import 'package:flutter_svg/flutter_svg.dart';

class SearchIcon extends StatelessWidget {
  const SearchIcon({
    super.key,
    required this.color,
  });

  final Color color;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/icons/search.svg',
      width: 24,
      height: 24,
      excludeFromSemantics: true,
      colorFilter: ColorFilter.mode(
        color,
        BlendMode.srcIn,
      ),
    );
  }
}
```

## Illustration

```dart
SvgPicture.asset(
  'assets/illustrations/onboarding.svg',
  width: 320,
  height: 240,
  fit: BoxFit.contain,
  semanticsLabel: 'Person organizing tasks',
);
```

## Package asset

Current asset loading supports package and bundle selection.

```dart
SvgPicture.asset(
  'assets/icons/verified.svg',
  package: 'shared_design_system',
  width: 20,
  height: 20,
);
```

## Why assets usually beat remote SVGs for static UI

Bundled artwork provides:

- deterministic versioning with the app;
- no network failure;
- no CORS;
- predictable availability offline;
- easier golden testing;
- stable cache keys.

If artwork changes only when the application version changes, remote loading usually adds failure modes without meaningful benefit.

---

# Network SVGs

Use `SvgPicture.network` only when the source genuinely needs to be remote.

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class RemoteBadge extends StatelessWidget {
  const RemoteBadge({
    super.key,
    required this.url,
  });

  final String url;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.network(
      url,
      width: 48,
      height: 48,
      fit: BoxFit.contain,
      placeholderBuilder: (context) {
        return const SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
            ),
          ),
        );
      },
      errorBuilder: (
        context,
        error,
        stackTrace,
      ) {
        return const SizedBox(
          width: 48,
          height: 48,
          child: Icon(
            Icons.broken_image_outlined,
            size: 24,
          ),
        );
      },
    );
  }
}
```

Current `SvgPicture` supports `placeholderBuilder` and `errorBuilder`; `errorBuilder` was added in the modern 2.x line.

## Stable placeholder size

Do not use a placeholder that changes the layout drastically.

Bad:

```dart
placeholderBuilder: (_) {
  return const CircularProgressIndicator();
},
```

inside an otherwise unconstrained layout.

Better:

```dart
placeholderBuilder: (_) {
  return const SizedBox(
    width: 48,
    height: 48,
    child: Center(
      child: CircularProgressIndicator(),
    ),
  );
},
```

## Headers

`SvgPicture.network` accepts request headers.

```dart
SvgPicture.network(
  url,
  headers: const {
    'Accept': 'image/svg+xml',
  },
  width: 120,
  height: 80,
);
```

## Custom HTTP client

The network loader can receive an `http.Client`. If no client is provided, current `SvgNetworkLoader` creates one internally for its request and closes that internally created client. If you inject your own client, its lifecycle remains yours.

## Do not use `SvgPicture.network` for advanced network policy

The convenience API is not a complete application network layer.

If you need:

- bearer-token refresh;
- strict HTTP status validation;
- custom timeouts;
- cancellation;
- retry policy;
- persistent HTTP caching;
- disk cache;
- content-length limits;
- SVG validation;
- offline-first behavior;
- telemetry;

fetch bytes through the application's network/repository layer, then render:

```dart
SvgPicture.memory(
  svgBytes,
  width: 96,
  height: 96,
  errorBuilder: (
    context,
    error,
    stackTrace,
  ) {
    return const Icon(
      Icons.broken_image_outlined,
    );
  },
);
```

## Status-code caveat

Current `SvgNetworkLoader` obtains the HTTP response and returns `bodyBytes`; it is not a replacement for a domain-specific HTTP status/content-type validation layer. An HTML error page returned by a backend can therefore become SVG parse input and ultimately surface as a rendering error.

For production-controlled remote SVGs, validate the response before presentation when HTTP semantics matter.

---

# String and Dynamic SVGs

Use `SvgPicture.string` when the application already owns or receives SVG XML text.

```dart
SvgPicture.string(
  svgMarkup,
  width: 180,
  height: 120,
  fit: BoxFit.contain,
  errorBuilder: (
    context,
    error,
    stackTrace,
  ) {
    return const Icon(
      Icons.broken_image_outlined,
    );
  },
);
```

Suitable for:

- generated charts or diagrams;
- CMS-provided vector snippets;
- dynamic brand artwork;
- locally generated SVG.

## Do not construct huge markup repeatedly in `build`

Bad:

```dart
Widget build(BuildContext context) {
  final svg = '''
    <svg>
      ${generateThousandsOfPaths(state)}
    </svg>
  ''';

  return SvgPicture.string(svg);
}
```

Even if equivalent strings can reuse the compiled-vector cache through value equality, regenerating a huge string still creates avoidable CPU work and allocations.

Better:

```dart
class DynamicDiagram extends StatefulWidget {
  const DynamicDiagram({
    super.key,
    required this.data,
  });

  final DiagramData data;

  @override
  State<DynamicDiagram> createState() {
    return _DynamicDiagramState();
  }
}

class _DynamicDiagramState
    extends State<DynamicDiagram> {
  late String _svg;

  @override
  void initState() {
    super.initState();
    _svg = buildDiagramSvg(
      widget.data,
    );
  }

  @override
  void didUpdateWidget(
    DynamicDiagram oldWidget,
  ) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.data != widget.data) {
      _svg = buildDiagramSvg(
        widget.data,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      _svg,
      fit: BoxFit.contain,
    );
  }
}
```

## Prefer color mapping to regenerating markup

Bad:

```text
dark mode changes
↓
string replace every SVG fill manually
↓
new SVG string
↓
new cache key
```

Better when appropriate:

```text
same source
+
theme-aware ColorMapper
```

---

# SVG from Memory / Bytes

Use `SvgPicture.memory` when SVG bytes already exist in memory.

```dart
import 'dart:typed_data';

import 'package:flutter_svg/flutter_svg.dart';

Widget buildSvgBytes(
  Uint8List bytes,
) {
  return SvgPicture.memory(
    bytes,
    width: 64,
    height: 64,
    fit: BoxFit.contain,
  );
}
```

Good uses:

- application network cache;
- database/file cache;
- user-selected SVG file converted to bytes;
- generated UTF-8 SVG data.

## Cache-key implication

`SvgBytesLoader`'s cache identity depends on its input and loader equality semantics. Continually allocating different byte objects for identical source can reduce reuse.

Prefer retaining/reusing the canonical byte value where that naturally fits the data layer.

Do not create unnecessary byte copies in every widget build.

---

# Native File SVGs

On native/IO platforms:

```dart
import 'dart:io';

import 'package:flutter_svg/flutter_svg.dart';

SvgPicture.file(
  File(filePath),
  width: 200,
  height: 200,
  fit: BoxFit.contain,
);
```

Use for:

- user-selected local SVG;
- application-generated file;
- downloaded/cached file on native platforms.

## Web

Do not design Flutter Web around `dart:io File`.

Use:

- bytes;
- network;
- asset;
- string;

depending on where the source originates.

`flutter_svg` uses conditional file handling because browser platforms do not have native `dart:io File` filesystem semantics.

---

# Custom Loaders

Use a custom loader only when source loading or cache identity cannot be expressed by the built-ins.

Current first-party loaders include:

- `SvgAssetLoader`;
- `SvgNetworkLoader`;
- `SvgStringLoader`;
- `SvgBytesLoader`;
- `SvgFileLoader`.

A custom `BytesLoader` must provide stable loading/cache-key behavior.

## Do not instantiate arbitrary loader state every build

`BytesLoader` documentation warns against creating a loader directly in `build` when doing so causes bytes to be repeatedly loaded.

Good:

```dart
class CachedVectorView extends StatefulWidget {
  const CachedVectorView({
    super.key,
    required this.loader,
  });

  final BytesLoader loader;

  @override
  State<CachedVectorView> createState() {
    return _CachedVectorViewState();
  }
}

class _CachedVectorViewState
    extends State<CachedVectorView> {
  @override
  Widget build(BuildContext context) {
    return SvgPicture(
      widget.loader,
      width: 120,
      height: 120,
    );
  }
}
```

## Custom loader is justified when

- source comes from a proprietary store;
- source bytes require custom retrieval;
- application needs a custom deterministic cache key;
- data comes from a specialized encrypted/cache layer.

Do not write a custom loader merely to wrap:

```dart
SvgPicture.asset(...)
```

with an extra abstraction.

---

# Sizing and Layout

This is one of the most important production rules.

Current `SvgPicture` documentation recommends specifying both width and height or placing the widget under tight constraints; otherwise layout can change once the SVG's intrinsic dimensions become known.

## Flutter size and SVG `viewBox` are different concepts

An SVG may contain:

```xml
<svg viewBox="0 0 100 100">
```

That defines the vector coordinate system.

Flutter may render it in:

```text
24 × 24
120 × 120
400 × 300
```

depending on layout constraints and `fit`.

Do not treat the SVG's coordinate values as Flutter logical pixels automatically.

## Icons

Always prefer explicit dimensions.

```dart
SvgPicture.asset(
  'assets/icons/settings.svg',
  width: 24,
  height: 24,
);
```

## Toolbar/action icon

```dart
SizedBox.square(
  dimension: 40,
  child: Center(
    child: SvgPicture.asset(
      'assets/icons/filter.svg',
      width: 20,
      height: 20,
    ),
  ),
);
```

Separate touch-target size from glyph size.

## Responsive illustration

```dart
AspectRatio(
  aspectRatio: 16 / 9,
  child: SvgPicture.asset(
    'assets/illustrations/dashboard.svg',
    fit: BoxFit.contain,
  ),
);
```

## Full-width illustration

```dart
SizedBox(
  width: double.infinity,
  height: 220,
  child: SvgPicture.asset(
    'assets/illustrations/header.svg',
    fit: BoxFit.cover,
  ),
);
```

## Avoid unconstrained layout mistakes

A vector widget inside unusual `Row`, `Column`, overlay, scrollable, or unconstrained environments still obeys Flutter layout rules.

If constraints can become infinite, give the vector a finite boundary:

```dart
SizedBox(
  width: 240,
  height: 160,
  child: SvgPicture.asset(
    'assets/illustrations/card.svg',
  ),
);
```

---

# BoxFit

Current rendering ultimately uses Flutter fitting/alignment semantics through the vector graphics widget.

| `BoxFit` | SVG consequence | Typical use |
|---|---|---|
| `contain` | Preserve aspect ratio; whole SVG visible | Icons, logos, illustrations |
| `cover` | Preserve aspect ratio; fill bounds; some content may crop | Hero/background artwork |
| `fill` | Stretch independently in X/Y; distorts aspect ratio | Rare, intentional deformation |
| `fitWidth` | Fill width; may overflow/crop vertically | Wide decorative art |
| `fitHeight` | Fill height; may overflow/crop horizontally | Tall decorative art |
| `none` | Do not scale to fit | Special fixed-size use |
| `scaleDown` | Keep natural size unless too large, then contain | Optional badge/content |

## Default

`SvgPicture` defaults to:

```dart
fit: BoxFit.contain
```

This is a safe default for most icons and illustrations.

## Do not use `fill` casually

Bad:

```dart
SvgPicture.asset(
  'assets/logo.svg',
  width: 200,
  height: 80,
  fit: BoxFit.fill,
);
```

if the original aspect ratio differs.

A brand logo should normally preserve geometry.

## `cover` requires crop awareness

```dart
ClipRect(
  child: SvgPicture.asset(
    'assets/background.svg',
    width: double.infinity,
    height: 240,
    fit: BoxFit.cover,
  ),
);
```

Check all responsive aspect ratios so important artwork does not get cropped.

---

# Alignment and Clipping

## Alignment

Default alignment is centered.

```dart
SvgPicture.asset(
  'assets/illustrations/cloud.svg',
  fit: BoxFit.contain,
  alignment: Alignment.topLeft,
);
```

Use `AlignmentDirectional` where alignment itself should follow text direction:

```dart
SvgPicture.asset(
  'assets/illustrations/banner.svg',
  alignment:
      AlignmentDirectional.centerStart,
);
```

## Clipping

Current default:

```dart
clipBehavior: Clip.hardEdge
```

Use the least expensive clipping behavior that provides correct visuals. `Clip.hardEdge` is generally cheaper than anti-aliased/save-layer clipping.

## `allowDrawingOutsideViewBox`

Keep:

```dart
allowDrawingOutsideViewBox: false
```

unless an asset is known to intentionally paint outside its view box.

The package source explicitly warns that enabling drawing outside the view box can have undefined visual behavior and additional memory overhead.

Do not enable it globally to "fix clipping."

Fix malformed view boxes in the source asset when possible.

---

# Theming

Choose theming according to artwork structure.

| Artwork | Preferred strategy |
|---|---|
| Monochrome icon | `ColorFilter.mode(..., BlendMode.srcIn)` |
| SVG uses `currentColor` | `SvgTheme(currentColor: ...)` |
| Several known source colors need replacement | `ColorMapper` |
| Multicolor illustration should remain exact | Preserve source colors |
| Light/dark artwork differs structurally | Separate assets |
| Disabled monochrome icon | Color filter to disabled color |
| Brand palette varies by tenant | `ColorMapper` or generated themed asset |

---

# ColorFilter

Current API recommendation uses `colorFilter`; old direct `color`/`colorBlendMode` patterns are deprecated compatibility APIs.

## Monochrome icon

```dart
SvgPicture.asset(
  'assets/icons/favorite.svg',
  width: 24,
  height: 24,
  colorFilter: ColorFilter.mode(
    Theme.of(context)
        .colorScheme
        .onSurface,
    BlendMode.srcIn,
  ),
);
```

## Disabled icon

```dart
SvgPicture.asset(
  'assets/icons/download.svg',
  width: 20,
  height: 20,
  colorFilter: ColorFilter.mode(
    Theme.of(context)
        .colorScheme
        .onSurface
        .withValues(alpha: 0.38),
    BlendMode.srcIn,
  ),
);
```

## Why `srcIn`

For typical monochrome tinting, `BlendMode.srcIn` keeps source alpha while replacing source RGB with the supplied color.

## Do not wrap unnecessarily in `ColorFiltered`

The current `vector_graphics` implementation can apply its provided color filter directly while painting, avoiding an additional composited `ColorFiltered` layer.

Prefer:

```dart
SvgPicture.asset(
  asset,
  colorFilter: filter,
);
```

over:

```dart
ColorFiltered(
  colorFilter: filter,
  child: SvgPicture.asset(asset),
);
```

when the desired effect is directly supported.

---

# Color Mapping

Use `ColorMapper` when only specific SVG colors/attributes should change.

Current `ColorMapper` receives:

```dart
Color substitute(
  String? id,
  String elementName,
  String attributeName,
  Color color,
)
```

during SVG processing.

## Production mapper

```dart
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

@immutable
final class BrandColorMapper
    extends ColorMapper {
  const BrandColorMapper({
    required this.primary,
    required this.secondary,
  });

  final Color primary;
  final Color secondary;

  @override
  Color substitute(
    String? id,
    String elementName,
    String attributeName,
    Color color,
  ) {
    const sourcePrimary =
        Color(0xFFFF0000);
    const sourceSecondary =
        Color(0xFF00FF00);

    if (color == sourcePrimary) {
      return primary;
    }

    if (color == sourceSecondary) {
      return secondary;
    }

    return color;
  }

  @override
  bool operator ==(Object other) {
    return other is BrandColorMapper &&
        other.primary == primary &&
        other.secondary == secondary;
  }

  @override
  int get hashCode {
    return Object.hash(
      primary,
      secondary,
    );
  }
}
```

Usage:

```dart
SvgPicture.asset(
  'assets/illustrations/brand_badge.svg',
  width: 120,
  height: 72,
  colorMapper: BrandColorMapper(
    primary:
        Theme.of(context)
            .colorScheme
            .primary,
    secondary:
        Theme.of(context)
            .colorScheme
            .secondary,
  ),
);
```

## Why mapper equality matters

The mapper participates in the SVG cache key.

If semantically equivalent mapper objects do not compare equal, rebuilds can generate unnecessary cache entries/compilation work.

Use:

- `const` mapper instances where possible;
- stable value equality for parameterized mappers.

## Select by context when needed

The mapper receives:

- SVG element ID;
- element name;
- attribute name;
- current color.

This enables targeted substitutions such as:

```text
only fill on #logo-mark
only stroke on path
only specific source palette entry
```

Do not rely only on raw color if the same color has different semantic meanings in the source.

---

# Multi-Color SVGs

Bad:

```dart
SvgPicture.asset(
  'assets/brand/full_logo.svg',
  colorFilter: const ColorFilter.mode(
    Colors.white,
    BlendMode.srcIn,
  ),
);
```

if the logo intentionally contains multiple colors.

This turns the entire picture into a single tint.

Better:

- preserve source colors;
- use a selective `ColorMapper`;
- provide a specifically designed monochrome asset.

Do not use rendering hacks to compensate for an asset whose design intent is ambiguous.

---

# `SvgTheme`

`SvgTheme` can provide `currentColor`, font size, and x-height information used when parsing SVG values such as `currentColor`, `em`, and `ex`.

Example:

```dart
SvgPicture.asset(
  'assets/icons/current_color_icon.svg',
  width: 24,
  height: 24,
  theme: SvgTheme(
    currentColor:
        Theme.of(context)
            .colorScheme
            .primary,
  ),
);
```

Use `SvgTheme` when the SVG itself is authored to use SVG theme-relative concepts.

Use `ColorFilter` for straightforward full-image tinting.

Use `ColorMapper` for source-aware palette mapping.

---

# Dark Mode

Choose the simplest strategy that preserves design intent.

## Monochrome icon

```dart
SvgPicture.asset(
  'assets/icons/profile.svg',
  colorFilter: ColorFilter.mode(
    Theme.of(context)
        .colorScheme
        .onSurface,
    BlendMode.srcIn,
  ),
);
```

## Multi-color illustration

Use a value-based mapper:

```dart
final mapper = BrandColorMapper(
  primary:
      theme.colorScheme.primary,
  secondary:
      theme.colorScheme.secondary,
);
```

## Separate light/dark assets

Prefer separate assets when dark mode changes:

- geometry;
- shadows;
- illustration content;
- gradient composition;
- visual hierarchy;

rather than only palette values.

```dart
final asset = theme.brightness ==
        Brightness.dark
    ? 'assets/illustrations/empty_dark.svg'
    : 'assets/illustrations/empty_light.svg';
```

Do not build a 20-condition `ColorMapper` merely to avoid exporting the correct dark artwork.

---

# Semantics and Accessibility

## Meaningful image

Provide a concise semantic label.

```dart
SvgPicture.asset(
  'assets/status/payment_success.svg',
  width: 96,
  height: 96,
  semanticsLabel: 'Payment successful',
);
```

Current `SvgPicture` exposes `semanticsLabel` specifically to identify the picture for screen readers.

## Decorative artwork

Explicitly exclude it.

```dart
SvgPicture.asset(
  'assets/decorations/confetti.svg',
  width: 200,
  height: 80,
  excludeFromSemantics: true,
);
```

Do not add noisy labels such as:

```text
"blue curved decorative background"
```

when the image contributes no information.

## Functional SVG inside a button

Prefer one accessible name.

```dart
IconButton(
  tooltip: 'Search',
  onPressed: onSearch,
  icon: SvgPicture.asset(
    'assets/icons/search.svg',
    width: 20,
    height: 20,
    excludeFromSemantics: true,
  ),
);
```

The button provides the action semantics; the SVG should not duplicate it.

## Do not use filename as semantics

Bad:

```text
"icon_search_white_24"
```

Good:

```text
"Search"
```

Accessibility describes meaning/action, not asset implementation.

---

# RTL / Directionality

Current `SvgPicture` exposes:

```dart
matchTextDirection: true
```

which horizontally mirrors the picture under RTL directionality.

## Good candidates

- back arrow;
- forward arrow;
- chevron;
- directional navigation icon.

```dart
SvgPicture.asset(
  'assets/icons/chevron_forward.svg',
  width: 20,
  height: 20,
  matchTextDirection: true,
  excludeFromSemantics: true,
);
```

## Do not mirror indiscriminately

Do not automatically mirror:

- logos;
- checkmarks;
- clocks;
- play/pause symbols unless design specifies;
- maps;
- charts;
- text-containing illustrations;
- brand marks.

The correct question is:

> Does the *meaning* of this artwork reverse with text direction?

---

# Placeholders

Use `placeholderBuilder` where loading/parsing latency may be visible.

Good placeholder characteristics:

- same final width;
- same final height;
- low rendering cost;
- visually appropriate;
- not semantically noisy.

```dart
SvgPicture.network(
  url,
  width: 80,
  height: 80,
  placeholderBuilder: (_) {
    return const SizedBox.square(
      dimension: 80,
      child: ColoredBox(
        color: Color(0xFFE8E8E8),
      ),
    );
  },
);
```

Do not show an endless spinner if network failure is possible; pair placeholder behavior with `errorBuilder`.

---

# Error Handling

Use source-appropriate fallback behavior.

## Asset

A missing bundled asset usually indicates a developer/build defect.

During development:

- surface diagnostics;
- fail tests;
- fix `pubspec.yaml`/asset path.

For a noncritical production illustration, an error fallback may still prevent a screen from becoming unusable.

## Remote

Always assume:

- request failure;
- malformed content;
- backend error page;
- unsupported SVG;
- timeout outside package convenience API;
- offline state.

```dart
SvgPicture.network(
  url,
  width: 64,
  height: 64,
  errorBuilder: (
    context,
    error,
    stackTrace,
  ) {
    logSvgFailure(
      source: url,
      error: error,
      stackTrace: stackTrace,
    );

    return const Icon(
      Icons.image_not_supported_outlined,
      size: 40,
    );
  },
);
```

Do not log:

- authentication headers;
- sensitive query strings;
- raw untrusted markup unnecessarily.

## Dynamic input

Use:

```dart
SvgPicture.string(
  markup,
  errorBuilder: (
    context,
    error,
    stackTrace,
  ) {
    return const Text(
      'Image unavailable',
    );
  },
);
```

A decorative SVG failure should not crash an entire production screen.

---

# Unsupported SVG Features

Do not assume `flutter_svg` is a full browser SVG DOM implementation.

Current `vector_graphics_compiler` publishes support for many static SVG constructs, including:

- groups;
- paths;
- common basic shapes;
- references;
- linear gradients;
- radial gradients;
- text;
- symbols;
- images;
- patterns.

Current documented limitations include unsupported SVG filters and some text-processing attributes. `flutter_svg`'s current README also advises Illustrator users to export styling as **Presentation Attributes** rather than Inline CSS because CSS support is incomplete.

## Do not automatically classify these as unsupported

Modern first-party compiler support includes functionality that older blog posts may claim is unsupported, such as:

- gradients;
- text;
- patterns;
- images;
- references.

Verify current behavior before rewriting artwork.

## Static-renderer boundary

Historical first-party package scope excluded browser-style SVG interactivity, scripting, SMIL animation, and foreign SVG runtime elements. Current compiler documentation continues to describe a static compile/render pipeline rather than an SVG browser runtime. Therefore, do not choose `flutter_svg` for an interactive or scripted SVG application without explicit current compatibility evidence.

For animated/interactive vector content, evaluate a purpose-built animation technology.

## When source uses unsupported functionality

Prefer this order:

```text
simplify source
↓
change export settings
↓
convert problematic object to supported paths/geometry
↓
precompile and verify
↓
raster fallback
↓
alternate rendering technology
```

Do not build fragile post-processing hacks around an exporter if the design pipeline can produce compatible assets.

---

# SVG Authoring Guidelines

These are production asset-pipeline recommendations derived from the rendering/compiler behavior.

## Export presentation attributes

Current official README recommends Illustrator:

```text
Styling:
Presentation Attributes
```

instead of:

```text
Inline CSS
```

because CSS support is incomplete.

## Embed image data instead of linking

The official authoring guidance recommends embedded images rather than linked image resources.

## Remove unnecessary editor output

When safe:

- hidden layers;
- editor metadata;
- redundant groups;
- unused definitions;
- unnecessary precision;
- invisible objects.

## Minimize path complexity

Rendering cost is affected by geometry, not only compressed file size.

A source can be only a few kilobytes yet contain:

- deeply complex paths;
- many overlapping operations;
- masks;
- clips;
- gradients;
- transforms.

## Avoid huge embedded raster payloads

If the dominant content is already raster, store/render it as a raster asset.

## Convert fragile font-dependent text

If visual fidelity must be identical regardless of installed fonts, consider exporting critical decorative typography to paths.

Tradeoff:

- paths preserve shape;
- paths increase geometry and remove text semantics.

Do not convert actual readable UI text into image paths when Flutter should render it accessibly.

---
