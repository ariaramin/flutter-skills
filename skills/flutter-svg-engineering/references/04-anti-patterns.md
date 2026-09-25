# Reference: The complete supplied SVG anti-pattern catalog with bad/better reasoning.

> Preserved from `flutter_svg Engineering Skill for Flutter.md`, source lines 2797-3249.

## Contents

- [Common Anti-Patterns](#common-anti-patterns)
  - [1. Recreating huge SVG strings in `build`](#1-recreating-huge-svg-strings-in-build)
  - [2. Remote SVG for static bundled UI asset](#2-remote-svg-for-static-bundled-ui-asset)
  - [3. No explicit dimensions in unstable layout](#3-no-explicit-dimensions-in-unstable-layout)
  - [4. Global `ColorFilter` on multicolor artwork](#4-global-colorfilter-on-multicolor-artwork)
  - [5. Deprecated color APIs](#5-deprecated-color-apis)
  - [6. Constantly changing SVG markup for theming](#6-constantly-changing-svg-markup-for-theming)
  - [7. Preloading every SVG](#7-preloading-every-svg)
  - [8. Assuming network SVG means HTTP cache](#8-assuming-network-svg-means-http-cache)
  - [9. Ignoring remote load failure](#9-ignoring-remote-load-failure)
  - [10. Complex SVG without profiling](#10-complex-svg-without-profiling)
  - [11. SVG for a standard Flutter icon](#11-svg-for-a-standard-flutter-icon)
  - [12. Giant illustration in every scrolling row](#12-giant-illustration-in-every-scrolling-row)
  - [13. Unnecessary clipping](#13-unnecessary-clipping)
  - [14. Mirroring every SVG in RTL](#14-mirroring-every-svg-in-rtl)
  - [15. Missing semantics on meaningful illustration](#15-missing-semantics-on-meaningful-illustration)
  - [16. Semantics on every decoration](#16-semantics-on-every-decoration)
  - [17. Huge embedded raster image inside SVG](#17-huge-embedded-raster-image-inside-svg)
  - [18. Depending on unsupported filters](#18-depending-on-unsupported-filters)
  - [19. `SvgPicture` inside business logic](#19-svgpicture-inside-business-logic)
  - [20. Wrapper duplicating every argument](#20-wrapper-duplicating-every-argument)
  - [21. Optimizing by file size only](#21-optimizing-by-file-size-only)
  - [22. Trusting arbitrary remote SVG](#22-trusting-arbitrary-remote-svg)
  - [23. New byte object every rebuild](#23-new-byte-object-every-rebuild)
  - [24. Changing `ColorMapper` identity unnecessarily](#24-changing-colormapper-identity-unnecessarily)
  - [25. `allowDrawingOutsideViewBox` as a universal fix](#25-allowdrawingoutsideviewbox-as-a-universal-fix)

---

# Common Anti-Patterns

## 1. Recreating huge SVG strings in `build`

**Bad**

```dart
Widget build(BuildContext context) {
  return SvgPicture.string(
    generateHugeSvg(state),
  );
}
```

**Why it is problematic**

String generation/allocation repeats, and changed source invalidates compiled cache reuse.

**Better**

Generate only when source data changes and retain the result.

---

## 2. Remote SVG for static bundled UI asset

**Bad**

```dart
SvgPicture.network(
  'https://cdn.example.com/app/search.svg',
);
```

for an icon tied to the current app release.

**Why it is problematic**

Adds network, CORS, availability, and cache failure modes.

**Better**

```dart
SvgPicture.asset(
  'assets/icons/search.svg',
);
```

---

## 3. No explicit dimensions in unstable layout

**Bad**

```dart
SvgPicture.network(url);
```

inside a layout whose size depends on loaded content.

**Why it is problematic**

The widget's geometry can change after load.

**Better**

```dart
SvgPicture.network(
  url,
  width: 64,
  height: 64,
);
```

---

## 4. Global `ColorFilter` on multicolor artwork

**Bad**

```dart
SvgPicture.asset(
  'assets/full_brand_logo.svg',
  colorFilter: ColorFilter.mode(
    theme.colorScheme.primary,
    BlendMode.srcIn,
  ),
);
```

**Why it is problematic**

Destroys all intended source colors.

**Better**

Preserve source colors or use selective `ColorMapper`.

---

## 5. Deprecated color APIs

**Bad**

```dart
SvgPicture.asset(
  asset,
  color: Colors.red,
  colorBlendMode: BlendMode.srcIn,
);
```

**Why it is problematic**

These are legacy/deprecated compatibility APIs.

**Better**

```dart
SvgPicture.asset(
  asset,
  colorFilter:
      const ColorFilter.mode(
    Colors.red,
    BlendMode.srcIn,
  ),
);
```

---

## 6. Constantly changing SVG markup for theming

**Bad**

```dart
markup.replaceAll(
  '#000000',
  themeColorHex,
);
```

on every build.

**Better**

Use `SvgTheme`, `ColorFilter`, or `ColorMapper` when the change is purely visual palette mapping.

---

## 7. Preloading every SVG

**Bad**

```text
startup:
load 300 vectors
```

**Why it is problematic**

Increases startup work and memory.

**Better**

Preload only demonstrated first-use bottlenecks.

---

## 8. Assuming network SVG means HTTP cache

**Bad**

```text
SvgPicture.network handles offline cache automatically.
```

**Why it is problematic**

Compiled-vector cache and HTTP persistence are different concerns.

**Better**

Implement explicit network/disk cache policy when required.

---

## 9. Ignoring remote load failure

**Bad**

```dart
SvgPicture.network(url);
```

for important dynamic content with no fallback.

**Better**

Use `errorBuilder` and application-level network diagnostics.

---

## 10. Complex SVG without profiling

**Bad**

A full-screen vector with thousands of paths is added to every dashboard route because "SVG is lightweight."

**Better**

Profile it and compare simplified, raster, and precompiled variants.

---

## 11. SVG for a standard Flutter icon

**Bad**

Asset SVG for a standard close/search/menu symbol.

**Better**

Use `Icon`.

---

## 12. Giant illustration in every scrolling row

**Bad**

```dart
ListView.builder(
  itemBuilder: (_, index) {
    return SvgPicture.asset(
      uniqueHugeSvg[index],
      height: 280,
    );
  },
);
```

**Better**

Use lightweight thumbnails/list representation.

---

## 13. Unnecessary clipping

**Bad**

Multiple nested:

```dart
ClipRRect(
  child: ClipRect(
    child: SvgPicture.asset(...),
  ),
);
```

without visual need.

**Better**

Keep only the clipping required by the design.

---

## 14. Mirroring every SVG in RTL

**Bad**

```dart
matchTextDirection: true
```

on every design-system SVG.

**Why it is problematic**

Logos and nondirectional symbols become incorrect.

**Better**

Opt in for directional assets only.

---

## 15. Missing semantics on meaningful illustration

**Bad**

A status illustration communicates failure but has no accessible equivalent.

**Better**

Provide semantic text through the SVG or surrounding UI.

---

## 16. Semantics on every decoration

**Bad**

```dart
semanticsLabel:
    'Purple decorative background',
```

**Better**

```dart
excludeFromSemantics: true,
```

---

## 17. Huge embedded raster image inside SVG

**Bad**

An SVG wrapper contains a multi-megabyte base64 JPEG.

**Why it is problematic**

You pay SVG pipeline complexity while content is fundamentally raster.

**Better**

Use the raster asset directly.

---

## 18. Depending on unsupported filters

**Bad**

Shipping an SVG whose appearance fundamentally relies on a current unsupported filter effect.

**Better**

Flatten/export differently or use a raster fallback.

---

## 19. `SvgPicture` inside business logic

**Bad**

```dart
final class SubscriptionCubit {
  SvgPicture get badge => ...
}
```

**Better**

Cubit emits `SubscriptionStatus`; widget chooses presentation.

---

## 20. Wrapper duplicating every argument

**Bad**

A 50-parameter `AppSvg` that adds no policy.

**Better**

Use `SvgPicture` directly or create focused design-system abstractions.

---

## 21. Optimizing by file size only

**Bad**

```text
A.svg = 12 KB
B.png = 40 KB
Therefore A is faster.
```

**Better**

Measure parse, raster, frame, and memory cost.

---

## 22. Trusting arbitrary remote SVG

**Bad**

Rendering unlimited user-uploaded SVG URLs directly with no source/size/security policy.

**Better**

Use trusted origins, controlled fetches, current parser/compiler versions, content limits, fallback handling, and product-specific validation.

---

## 23. New byte object every rebuild

**Bad**

```dart
SvgPicture.memory(
  Uint8List.fromList(cachedBytes),
);
```

every build.

**Better**

Reuse the canonical immutable byte object from state/cache.

---

## 24. Changing `ColorMapper` identity unnecessarily

**Bad**

A mapper with no value equality is recreated on every build.

**Why it is problematic**

Mapper participates in the compiled cache key.

**Better**

Use const/stable/value-equal mapper objects.

---

## 25. `allowDrawingOutsideViewBox` as a universal fix

**Bad**

```dart
allowDrawingOutsideViewBox: true,
```

on all SVGs.

**Better**

Fix asset bounds/view box and keep the safe default.

---
