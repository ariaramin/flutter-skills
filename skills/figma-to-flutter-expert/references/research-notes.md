# Research notes — Figma to Flutter

Date: 2026-10-25. These notes record what was actually read. They are not a claim that every Flutter or Figma page was reviewed.

Local framework checkout: `/Users/ariaramin/develop/flutter`. `packages/flutter/pubspec.yaml` requires Dart `^3.11.0-0`. `flutter --version` returned no stdout in this session, so no Flutter version number is pinned from that command. Widget examples were checked against that checkout's APIs. They were not executed in a Flutter test run.

## Unit conversion

| Question | Source | Finding | Rule |
|---|---|---|---|
| What is a Flutter pixel? | [FAQ](https://docs.flutter.dev/resources/faq) | Logical pixels. Flutter maps them to physical pixels with `devicePixelRatio`. | Layout uses logical pixels. |
| How is logical size computed? | `MediaQueryData` in the local SDK | `size = physicalSize / devicePixelRatio`. Padding and view insets are divided the same way. | Do not multiply a logical design size by DPR. |
| Where do resolution assets fit? | [Flutter for Android developers](https://docs.flutter.dev/flutter-for/android-devs) | `1.0x`, `2.0x`, `3.0x` asset variants. Logical pixels correspond to device-independent pixels. | Widget size stays logical. Variant folders hold export pixels. |
| What does Figma export scale change? | [Export formats](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings-for-static-designs) | Scale multiplies raster resolution. Default export DPI is 72; DPI at scale is 72 × scale. SVG and PDF export at 1x only. | Export pixels = design length × export scale. |
| Are child coordinates page coordinates? | [Plugin node properties](https://developers.figma.com/docs/plugins/api/node-properties/) | `x` and `y` are `relativeTransform` translations. `absoluteBoundingBox` is page space and excludes shadows. `size` differs from the bounding box after rotation. | Use parent-relative x/y for unrotated layout. Do not use the rotated bounding box as the widget size. |
| How is rotation defined? | [rotation](https://developers.figma.com/docs/plugins/api/properties/nodes-rotation/) | Degrees in (-180, 180], `atan2(-m10, m00)`, pivot at the top-left. | Do not assume `Transform.rotate` about the center matches. Unverified: the numeric sign versus `Matrix4.rotationZ`. |

## Layout

| Question | Source | Finding | Rule |
|---|---|---|---|
| How does Flutter layout work? | [Understanding constraints](https://docs.flutter.dev/ui/layout/constraints) | "Constraints go down. Sizes go up. Parent sets position." Unbounded flex plus `Expanded` throws. | Map fill to `Expanded` only inside a bounded flex parent. |
| Is layout one pass? | [Inside Flutter](https://docs.flutter.dev/resources/inside-flutter) | Constraints down, geometry up. Child layout cannot depend on position. | Position absolute children after size is known. |
| Responsive versus adaptive? | [Adaptive and responsive](https://docs.flutter.dev/ui/adaptive-responsive) | Responsive fits the space. Adaptive stays usable in it. | Branch on window size for structure. |
| Window or parent? | [General approach](https://docs.flutter.dev/ui/adaptive-responsive/general) | `MediaQuery.sizeOf` is the window, in logical pixels. `LayoutBuilder` is the local `BoxConstraints`. Material's own example uses 600 for a nav bar versus a rail. | Do not read the window from inside a card to size the card. |
| Safe area and keyboard? | [SafeArea & MediaQuery](https://docs.flutter.dev/ui/adaptive-responsive/safearea-mediaquery) | `SafeArea` uses `MediaQuery.padding` and clears that padding for descendants. | Nesting `SafeArea` does not stack the same inset. Keyboard is `viewInsets`, not another safe area. |
| Material widths? | [Breakpoints](https://m3.material.io/foundations/layout/breakpoints) | Compact <600, medium 600–839, expanded 840–1199, large 1200–1599, extra-large ≥1600. The previous window-size-class URL returned 404. | Use when the product follows Material. Not a Flutter API. |
| Auto layout sizing? | [Guide to auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma), [layoutSizingHorizontal](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizinghorizontal/) | Hug, fill, fixed, min, max. Fill children take leftover space. Constraints do not apply to in-flow auto-layout children. | Hug → content size. Fill → flex. Fixed → logical size. |
| REST names? | [Node types](https://developers.figma.com/docs/rest-api/file-node-types/) | `layoutMode` includes `GRID`. `layoutGrow` 0 or 1. `itemSpacing` may be negative. `strokesIncludedInLayout` matches CSS border-box when true. `cornerSmoothing` 0 is circular; 0.6 is the iOS 7 squircle. | `Flex.spacing` cannot be negative (`assert(spacing >= 0)` in local `flex.dart`). Grid has no direct widget. |

## Typography, stroke, shadow

| Question | Source | Finding | Rule |
|---|---|---|---|
| What is `TextStyle.height`? | [height](https://api.flutter.dev/flutter/painting/TextStyle/height.html), local `text.dart` | Multiplier of font size. `kTextHeightNone` is `0.0` and equivalent to null. `1.0` is the em square. | `PIXELS`: `value / fontSize`. `PERCENT`: `value / 100`. `AUTO`: null. |
| What is even leading? | [TextLeadingDistribution](https://api.flutter.dev/flutter/dart-ui/TextLeadingDistribution.html) | `even` is CSS half-leading. Ignored when height is null. | Recommendation for an explicit Figma line height. Not a documented Figma match. |
| First and last line? | [TextHeightBehavior](https://api.flutter.dev/flutter/dart-ui/TextHeightBehavior-class.html) | Defaults apply height to the first ascent and last descent. | Change only after the multiplier is correct. |
| Letter spacing? | [LetterSpacing](https://developers.figma.com/docs/plugins/api/LetterSpacing/), local `TextStyle.letterSpacing` | Figma unit is `PIXELS` or `PERCENT`. Flutter adds logical pixels between letters. | Percent → `fontSize * value / 100`. |
| Line height units? | [LineHeight](https://developers.figma.com/docs/plugins/api/LineHeight/), [text properties](https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties) | `PIXELS`, `PERCENT`, or `AUTO`. Figma can show both px and percent. | Convert the unit. Do not store a px line height in `height`. |
| Stroke alignment? | Local `borders.dart` and `box_border.dart` | Inside -1 (default), center 0, outside 1. Non-inside `Border` paint requires a uniform color. | Map Figma `INSIDE` / `CENTER` / `OUTSIDE` to those constants. Outside stroke does not enlarge the layout box. |
| Shadow blur? | Local `dart:ui` `Shadow.convertRadiusToSigma` | `radius > 0 ? radius * 0.57735 + 0.5 : 0`, citing Skia `ConvertRadiusToSigma`. The field comment also calls `blurRadius` a standard deviation. The implementation treats it as a radius and converts it. | Pass Figma blur as `BoxShadow.blurRadius`. Do not pre-convert. |
| Corner smoothing? | Figma node-type docs; local `ContinuousRectangleBorder` | Figma documents 0 and 0.6. Flutter documents a continuous corner and does not mention Figma. | Circular radius when smoothing is 0. Continuous border is a candidate near 0.6, then compare. |
| Text scaling? | [TextScaler breaking change](https://docs.flutter.dev/release/breaking-changes/deprecate-textscalefactor) | `textScaleFactor` is deprecated. Android 14 scaling is nonlinear. | Do not lock text in a fixed height to match a 1x mock. |
| Tap targets? | [UI design](https://docs.flutter.dev/ui/accessibility/ui-design-and-styling), [testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing) | Android 48×48 dp, iOS 44×44 pt, W3C 44×44 CSS px. | Test with `androidTapTargetGuideline` and `iOSTapTargetGuideline`. |

## Performance, images, tests

| Question | Source | Finding | Rule |
|---|---|---|---|
| Opacity and saveLayer? | [Best practices](https://docs.flutter.dev/perf/best-practices), local `RenderOpacity` | Offscreen buffer. Opacity widget is unnecessary when a solid color can carry the alpha and shapes do not overlap. Clip does not call `saveLayer` unless `Clip.antiAliasWithSaveLayer`. | Do not wrap a card stack in `Opacity` for a flat fade. |
| Intrinsics? | Local `RenderIntrinsicWidth` / `RenderIntrinsicHeight` | Speculative pass. Worst case O(N²) in tree depth. | Avoid in deep or scrolling trees. A shallow row can still be the right layout. |
| Image decode size? | Local `Image` docs | `cacheWidth` / `cacheHeight` change the decoded bitmap, not layout. Ignored for network images on web. A 3840×2160 image at 32 bpp is described as over 30MB. | Set decode size when the bitmap is much larger than the logical box. |
| How to measure? | [UI performance](https://docs.flutter.dev/perf/ui-performance), [DevTools](https://docs.flutter.dev/tools/devtools/performance) | Profile mode. Layer toggles for clip, opacity, and physical shape. | Debug-mode frame time is not evidence. |
| Widget-test surface? | Local `flutter_test` `binding.dart` | `_kDefaultTestViewportSize = Size(800, 600)`. | Set `physicalSize` and `devicePixelRatio` explicitly. Default DPR number was not confirmed in this pass. |
| Shadow goldens? | Local `BoxShadow.toPaint` | `debugDisableShadows` removes the mask filter. | A widget-test golden does not prove a device shadow. |
| Web renderer? | [Wasm](https://docs.flutter.dev/platform-integration/web/wasm), architectural overview | Wasm uses skwasm when the browser is allowed; otherwise CanvasKit. Text and image paths differ from mobile. | Do not promise identical pixels from one widget tree. |

## Not verified

- Figma effect-object field list (drop shadow offset, spread, radius) was not opened as its own page. Read those fields from the node.
- Numeric sign that makes `Transform.rotate` match Figma's top-left rotation.
- Default `devicePixelRatio` inside `flutter test`.
- `matchesGoldenFile` tolerance in the pinned `flutter_test`.
- A live `flutter analyze` of the examples. `Row.spacing` and `Color.withValues` exist in the checkout that was read.
- Agent compliance tests. This revision was not run through a with-skill / baseline evaluation.

## Corrections to the previous skill text

- `ContinuousRectangleBorder` does not match Figma corner smoothing by documentation.
- Intrinsic layout is worst-case O(N²) in depth, not an automatic frame drop for every call.
- `TextLeadingDistribution.even` is CSS half-leading, not a Flutter-stated Figma match.
- Material expanded width is not "everything above 840". Large and extra-large exist.
- `Wrap.spacing` is the in-run gap, not the cross-axis gap.
- `BorderSide.strokeAlignCenter` and `strokeAlignOutside` exist. Outside stroke does not grow the box.
