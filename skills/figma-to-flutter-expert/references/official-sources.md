# Authoritative Official Sources & Version Reference Catalog

This catalog documents the authoritative sources, documentation URLs, and version qualifications governing the Figma-to-Flutter translation rules.

---

## 1. Flutter Official Documentation & Rendering Engine

* **Flutter Box Constraints Model**:
  * URL: [https://docs.flutter.dev/ui/layout/constraints](https://docs.flutter.dev/ui/layout/constraints)
  * Governs: Constraint propagation, tight vs. loose constraints, unbounded layout rules.
* **Flutter Rendering Pipeline**:
  * URL: [https://docs.flutter.dev/resources/architectural-overview#rendering-pipeline](https://docs.flutter.dev/resources/architectural-overview#rendering-pipeline)
  * Governs: Widget, Element, and RenderObject lifecycle, layout passes, display list recording, and layer compositing.
* **Flutter Performance Best Practices**:
  * URL: [https://docs.flutter.dev/perf/best-practices](https://docs.flutter.dev/perf/best-practices)
  * Governs: Rebuild minimization, avoiding `saveLayer`, intrinsic measurement hazards, `const` constructors, image decoding bounds.
* **Flutter Adaptive & Responsive Design**:
  * URL: [https://docs.flutter.dev/ui/layout/adaptive-responsive](https://docs.flutter.dev/ui/layout/adaptive-responsive)
  * Governs: Breakpoints, input ergonomics, multi-window desktop support, `LayoutBuilder` vs. `MediaQuery`.
* **Flutter Golden Regression Testing (`matchesGoldenFile`)**:
  * URL: [https://api.flutter.dev/flutter/flutter_test/matchesGoldenFile.html](https://api.flutter.dev/flutter/flutter_test/matchesGoldenFile.html)
  * Governs: Golden assertions, pixel comparison thresholds, image file fixtures.

---

## 2. Flutter API References & Version Notes

| API / Feature | Official Reference URL | Version Introduced / Modified | Technical Note |
|---|---|---|---|
| **`Flex.spacing` / `Row.spacing` / `Column.spacing`** | [api.flutter.dev/flutter/widgets/Flex/spacing.html](https://api.flutter.dev/flutter/widgets/Flex/spacing.html) | Flutter 3.27+ | Native spacing between flex children without extra spacer widgets. |
| **`Color.withValues(alpha: ...)`** | [api.flutter.dev/flutter/dart-ui/Color/withValues.html](https://api.flutter.dev/flutter/dart-ui/Color/withValues.html) | Flutter 3.27+ | Replaces `@Deprecated` `withOpacity` to prevent precision loss across color spaces. |
| **`TextStyle.leadingDistribution`** | [api.flutter.dev/flutter/painting/TextStyle/leadingDistribution.html](https://api.flutter.dev/flutter/painting/TextStyle/leadingDistribution.html) | Flutter 2.4+ | `TextLeadingDistribution.even` enables centered vertical line leading matching Figma. |
| **`TextScaler`** | [api.flutter.dev/flutter/painting/TextScaler-class.html](https://api.flutter.dev/flutter/painting/TextScaler-class.html) | Flutter 3.16+ | Replaces `textScaleFactor` for non-linear dynamic accessibility text scaling. |
| **`PopScope`** | [api.flutter.dev/flutter/widgets/PopScope-class.html](https://api.flutter.dev/flutter/widgets/PopScope-class.html) | Flutter 3.12+ | Replaces deprecated `WillPopScope` for Android predictive back gesture support. |
| **`RepaintBoundary`** | [api.flutter.dev/flutter/widgets/RepaintBoundary-class.html](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html) | Stable Flutter Core | Isolates repaints into an independent `OffsetLayer`. |
| **`ContinuousRectangleBorder`** | [api.flutter.dev/flutter/painting/ContinuousRectangleBorder-class.html](https://api.flutter.dev/flutter/painting/ContinuousRectangleBorder-class.html) | Stable Flutter Core | Produces continuous curvature squircles matching Figma corner smoothing. |

---

## 3. Figma Developer Documentation & Auto Layout Specifications

* **Figma Auto Layout Guide**:
  * URL: [https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties)
  * Governs: Primary axis, counter axis, hug contents, fill container, min/max sizing, gap, absolute positioning.
* **Figma Dev Mode Overview**:
  * URL: [https://help.figma.com/hc/en-us/articles/15023124642207-Guide-to-Dev-Mode](https://help.figma.com/hc/en-us/articles/15023124642207-Guide-to-Dev-Mode)
  * Governs: Code inspection, token extraction, box model overlays, asset exports.
* **Figma REST API Node Specification**:
  * URL: [https://developers.figma.com/docs/api/nodes/](https://developers.figma.com/docs/api/nodes/)
  * Governs: Node properties (`layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `layoutGrow`, `layoutAlign`, `fills`, `strokes`, `effects`).

---

## 4. Material 3 & Design Token Guidelines

* **Material Design 3 Layout & Adaptive Guidelines**:
  * URL: [https://m3.material.io/foundations/layout/applying-layout/window-size-classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)
  * Governs: Standard window size classes: Compact (<600dp), Medium (600-840dp), Expanded (>840dp).
* **Material Design 3 Tokens System**:
  * URL: [https://m3.material.io/foundations/design-tokens/overview](https://m3.material.io/foundations/design-tokens/overview)
  * Governs: Separation of global reference tokens, system tokens, and component tokens.
