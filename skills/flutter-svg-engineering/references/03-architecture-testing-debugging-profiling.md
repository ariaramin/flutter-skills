# Reference: Design-system wrappers, state management and DI boundaries, widget/semantics/network/golden tests, debugging, and evidence-based profiling workflow.

> Preserved from `flutter_svg Engineering Skill for Flutter.md`, source lines 2301-2796.

## Contents

- [Design System Integration](#design-system-integration)
  - [Good wrapper](#good-wrapper)
  - [Bad wrapper](#bad-wrapper)
  - [Separate icons and illustrations if semantics differ](#separate-icons-and-illustrations-if-semantics-differ)
- [State Management Integration](#state-management-integration)
- [Dependency Injection](#dependency-injection)
- [Testing Strategy](#testing-strategy)
  - [Asset existence](#asset-existence)
  - [Widget rendering](#widget-rendering)
  - [Semantics](#semantics)
  - [Theme](#theme)
  - [Error fallback](#error-fallback)
  - [Network](#network)
  - [Pending vector decodes](#pending-vector-decodes)
- [Golden Testing](#golden-testing)
  - [High-risk migration sequence](#high-risk-migration-sequence)
- [Debugging Workflow](#debugging-workflow)
  - [SVG does not render](#svg-does-not-render)
  - [Blank image](#blank-image)
  - [Wrong colors](#wrong-colors)
  - [Image clipped](#image-clipped)
  - [Stretched](#stretched)
  - [Layout shift](#layout-shift)
  - [Remote failure](#remote-failure)
  - [Parser error](#parser-error)
  - [Missing text](#missing-text)
  - [RTL wrong](#rtl-wrong)
  - [Slow scrolling](#slow-scrolling)
  - [High memory](#high-memory)
- [Performance Profiling Workflow](#performance-profiling-workflow)
  - [1. Reproduce in profile mode](#1-reproduce-in-profile-mode)
  - [2. Capture frame timing](#2-capture-frame-timing)
  - [3. Measure rebuilds](#3-measure-rebuilds)
  - [4. Check cache identity](#4-check-cache-identity)
  - [5. Inspect source complexity](#5-inspect-source-complexity)
  - [6. Compare alternatives](#6-compare-alternatives)
  - [7. Measure memory](#7-measure-memory)
  - [8. Keep only demonstrated improvements](#8-keep-only-demonstrated-improvements)

---

# Design System Integration

For a larger codebase, create focused wrappers that enforce conventions.

## Good wrapper

```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

final class AppSvgIcon
    extends StatelessWidget {
  const AppSvgIcon({
    super.key,
    required this.asset,
    this.size = 24,
    this.color,
    this.semanticLabel,
    this.matchTextDirection = false,
  });

  final String asset;
  final double size;
  final Color? color;
  final String? semanticLabel;
  final bool matchTextDirection;

  @override
  Widget build(BuildContext context) {
    final iconColor = color;

    return SvgPicture.asset(
      asset,
      width: size,
      height: size,
      fit: BoxFit.contain,
      matchTextDirection:
          matchTextDirection,
      semanticsLabel:
          semanticLabel,
      excludeFromSemantics:
          semanticLabel == null,
      colorFilter: iconColor == null
          ? null
          : ColorFilter.mode(
              iconColor,
              BlendMode.srcIn,
            ),
    );
  }
}
```

This wrapper creates actual policy:

- square sizing;
- semantics behavior;
- monochrome tint convention;
- directional behavior.

## Bad wrapper

```dart
class AppSvg extends StatelessWidget {
  // Re-exposes every single SvgPicture argument unchanged.
}
```

A wrapper that only mirrors the whole package API adds indirection without creating a design-system contract.

## Separate icons and illustrations if semantics differ

For example:

```text
AppSvgIcon
AppIllustration
BrandLogo
```

can encode meaningful defaults better than one universal wrapper.

---

# State Management Integration

SVG rendering belongs in presentation.

Good:

```text
Cubit state:
status = verified
↓
Widget selects:
assets/icons/verified.svg
↓
SvgPicture renders it
```

Do not do:

```dart
final class ProfileCubit {
  SvgPicture get icon => ...
}
```

Bloc/Cubit/Riverpod should provide:

- visual state;
- asset key;
- URL;
- downloaded bytes if architecture intentionally exposes them;
- theme/brand state.

It should not normally construct Flutter widgets.

---

# Dependency Injection

Do not inject `SvgPicture`.

Inject source/network abstractions only when they are genuinely dependencies.

Example:

```dart
abstract interface class BadgeAssetRepository {
  Future<Uint8List> loadBadge(
    String id,
  );
}
```

Then presentation renders:

```dart
SvgPicture.memory(bytes);
```

This is useful when:

- SVG comes from authenticated network;
- app caches source bytes;
- source policy is testable independently.

Do not introduce DI around a bundled path such as:

```text
assets/icons/search.svg
```

unless the design system already abstracts asset identity.

---

# Testing Strategy

Test behavior at several levels.

## Asset existence

A widget test that pumps the screen will catch many asset-path/configuration failures.

## Widget rendering

```dart
testWidgets(
  'renders the success illustration',
  (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SvgPicture.asset(
            'assets/status/success.svg',
            width: 96,
            height: 96,
            semanticsLabel:
                'Payment successful',
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(
      find.byType(SvgPicture),
      findsOneWidget,
    );
  },
);
```

## Semantics

Verify:

- meaningful image has expected label;
- decorative image is excluded;
- functional button does not expose duplicate labels.

## Theme

Pump light and dark variants.

## Error fallback

Use intentionally invalid string input:

```dart
testWidgets(
  'shows fallback for invalid SVG',
  (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SvgPicture.string(
          '<svg><broken>',
          errorBuilder: (
            context,
            error,
            stackTrace,
          ) {
            return const Text(
              'Fallback',
            );
          },
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(
      find.text('Fallback'),
      findsOneWidget,
    );
  },
);
```

## Network

Inject a deterministic fake/mock `http.Client` into the network loader or test the application's network-byte abstraction separately.

Do not hit live production URLs from widget tests.

## Pending vector decodes

The vector-graphics testing utilities expose waiting for pending decodes where deterministic completion is needed. Do not rely on arbitrary sleep delays.

---

# Golden Testing

Golden tests are particularly valuable for:

- SVG package upgrades;
- designer export changes;
- fit/alignment;
- color filters;
- `ColorMapper`;
- light/dark mode;
- RTL mirroring;
- precompiled vs runtime SVG output;
- rendering-strategy changes.

Use a controlled environment:

- fixed surface size;
- fixed device pixel ratio where testing tooling permits;
- known fonts;
- pinned Flutter/toolchain.

Do not assume one golden generated on macOS is automatically stable on every platform configuration.

## High-risk migration sequence

```text
capture baseline goldens
↓
update flutter_svg/vector_graphics
↓
replace deprecated APIs
↓
run goldens
↓
manually review intentional differences
```

---

# Debugging Workflow

## SVG does not render

Check:

1. Asset path correct?
2. Declared in `pubspec.yaml`?
3. Correct package asset?
4. Width/height nonzero?
5. Parent constraints finite?
6. `errorBuilder` reporting parser failure?
7. SVG markup valid?
8. Unsupported construct present?

## Blank image

Inspect:

- SVG `viewBox`;
- fill/stroke colors;
- opacity;
- current theme;
- global `ColorFilter`;
- clipping;
- width/height;
- source exported with white-on-white paths.

Try rendering the SVG without theming first.

## Wrong colors

Check:

1. source fill/stroke values;
2. `colorFilter`;
3. `ColorMapper`;
4. `SvgTheme.currentColor`;
5. dark-mode source.

Remove `ColorFilter` from multicolor assets.

## Image clipped

Check:

- `BoxFit.cover`;
- parent size;
- view box;
- clip behavior;
- source objects outside view box.

Do not enable `allowDrawingOutsideViewBox` before verifying the source view box.

## Stretched

Search for:

```dart
fit: BoxFit.fill
```

or mismatched explicit dimensions.

## Layout shift

Add explicit width and height or tight parent constraints.

## Remote failure

Check:

- URL;
- CORS on web;
- HTTP status;
- actual response bytes;
- authentication;
- content type;
- error body masquerading as SVG;
- offline state.

Use controlled byte fetching when richer network diagnostics are required.

## Parser error

Open/export the asset using supported presentation attributes.

Look for:

- unsupported filters;
- unsupported text attributes;
- malformed XML;
- incomplete CSS support.

## Missing text

Check:

- font dependencies;
- unsupported text-processing attributes;
- whether decorative text should have been converted to paths.

## RTL wrong

Check:

```dart
matchTextDirection
```

Do not mirror brand/non-directional artwork.

## Slow scrolling

Profile:

- unique SVG count;
- rendered size;
- picture vs raster time;
- source complexity;
- clipping;
- rebuild frequency;
- cache misses.

## High memory

Inspect:

- unique compiled SVG cache entries;
- huge source bytes;
- many live vectors;
- raster strategy image sizes;
- application byte cache;
- unbounded dynamic SVG sources.

---

# Performance Profiling Workflow

Do not optimize SVG based on intuition.

## 1. Reproduce in profile mode

Avoid performance conclusions from debug mode.

## 2. Capture frame timing

Use Flutter DevTools/performance tooling.

Determine whether time is spent on:

- UI thread;
- raster thread;
- loading/parsing;
- unrelated application work.

## 3. Measure rebuilds

Check whether the SVG subtree is rebuilding more often than expected.

## 4. Check cache identity

Verify whether source/theme/mapper changes are producing new compiled entries.

## 5. Inspect source complexity

Count/inspect:

- paths;
- groups;
- clips;
- gradients;
- patterns;
- masks;
- embedded images.

## 6. Compare alternatives

Test:

```text
runtime SVG
precompiled .vec
raster strategy
simplified SVG
PNG/WebP alternative
```

## 7. Measure memory

Especially after:

- precaching;
- loading many unique vectors;
- switching to raster strategy.

## 8. Keep only demonstrated improvements

Do not retain complexity that produced no measurable gain.

---
