---
name: figma-to-flutter-expert
description: >
  Use when implementing, translating, auditing, or fixing Flutter UI from a
  Figma frame, component, Auto Layout, design token, or screenshot; when
  layout, type, spacing, radius, shadows, or assets drift from the design;
  when choosing logical pixels versus device pixel ratio, export scale, or
  responsive scaling; or when checking fidelity across phone, tablet,
  foldable, desktop, and web viewports. Do not use for a DESIGN.md design
  system with no Figma layout translation, or for a frame-time investigation
  that is not tied to a design implementation.
---

# Figma to Flutter

Implement the design as Flutter constraints, text, and assets. A Figma number is not a widget size until its coordinate system is known.

Label a rule when the choice matters:

- **Documented**: stated by current Flutter or Figma documentation, or by the Flutter framework source checked for this skill.
- **Recommendation**: derived from that evidence.
- **Context-dependent**: depends on the design, viewport, platform, or a measurement.

Research scope and source URLs: [research notes](references/research-notes.md). This skill does not claim to have read all of either doc site.

## Purpose and scope

Use this skill to turn a Figma frame into maintainable Flutter that keeps the design's spacing, type, and hierarchy on the viewports the product actually ships. Phone, tablet, foldable, desktop, and web are in scope. Native look-and-feel that the design does not specify is not a reason to redraw the screen.

Reuse the repository's theme, widgets, and tests. Do not add a package, a second token system, or a screen-scale helper.

## When to activate

Activate for a Figma URL, Dev Mode inspection, exported node JSON, a frame screenshot with measurements, or a Flutter screen that should match one of those. Also activate when a previous implementation multiplied sizes by `devicePixelRatio`, scaled every dp by `screenWidth / frameWidth`, or positioned a flow layout with `Positioned`.

Stay inactive for a one-off color tweak with no layout, a pure design-system generation task from `DESIGN.md`, and a performance trace with no design fidelity question. A measured jank bug follows a profiling loop; this skill only says which design-implementation choices are expensive.

## Required engineering principles

1. Inspect the repo and the design before editing. Missing measurements stay missing. Do not invent states, fonts, or assets.
2. Five quantities stay distinct: a design measurement, a Flutter logical pixel, a physical pixel, an exported image's pixel size, and a responsive scale factor.
3. Default layout mapping is 1:1 from a logical Figma frame into logical pixels. `devicePixelRatio` is applied by Flutter during rasterization. Do not multiply layout by it.
4. **Documented.** Constraints go down. Sizes go up. The parent sets position. ([Understanding constraints](https://docs.flutter.dev/ui/layout/constraints))
5. Prefer the sizing mode the frame already has: fixed, hug, or fill. Absolute coordinates are for layers that are actually absolute.
6. Preserve fidelity without freezing the phone frame onto every window. Fill and hug adapt. Fixed component sizes stay fixed only while they still fit.
7. Change performance only to remove a documented cost or a measured problem. Do not drop a shadow, clip, or widget for an unmeasured gain.
8. Report the checks that ran. Name tools, Figma fields, and platforms that were unavailable. Do not claim pixel-perfect parity or a measured speedup without evidence.

## Technical foundations

**Documented.** Flutter lays out in logical pixels. Physical pixels = logical pixels × `devicePixelRatio`. `MediaQuery.sizeOf` returns logical size and rebuilds only when that size changes. `LayoutBuilder` returns the parent `BoxConstraints`, not the window. ([FAQ](https://docs.flutter.dev/resources/faq), [MediaQueryData.size](https://api.flutter.dev/flutter/widgets/MediaQueryData/size.html), [adaptive layout](https://docs.flutter.dev/ui/adaptive-responsive/general))

**Documented.** `TextStyle.height` is a multiple of `fontSize`. The line is `fontSize * height` logical pixels tall. `height: 1.0` is the em square, not the font's built-in line height. `kTextHeightNone` is `0.0` and is equivalent to `height: null`: both use font metrics. ([TextStyle.height](https://api.flutter.dev/flutter/painting/TextStyle/height.html))

**Documented.** With a non-null height, `TextLeadingDistribution.even` splits extra leading half above and half below (CSS half-leading). `proportional` follows the font's ascent/descent ratio. `leadingDistribution` does nothing when height is null. ([TextLeadingDistribution](https://api.flutter.dev/flutter/dart-ui/TextLeadingDistribution.html))

**Documented.** Figma `layoutSizingHorizontal` / `layoutSizingVertical` are `FIXED`, `HUG`, or `FILL`. Hug is valid on auto-layout frames and text. Fill is valid on auto-layout children. Child `x` and `y` equal the parent-relative translation (`relativeTransform[0][2]` and `[1][2]`). `absoluteBoundingBox` is page space and excludes shadows; after rotation its width and height are the axis-aligned bounds, not the unrotated layer size. `rotation` is degrees in (-180, 180], `atan2(-m10, m00)`, about the top-left. ([node properties](https://developers.figma.com/docs/plugins/api/node-properties/), [rotation](https://developers.figma.com/docs/plugins/api/properties/nodes-rotation/))

**Documented.** `BorderSide.strokeAlignInside` (-1) is the default and paints inside the box. `strokeAlignCenter` is 0. `strokeAlignOutside` is 1. A non-inside align on `Border` requires a uniform border color. ([BorderSide](https://api.flutter.dev/flutter/painting/BorderSide-class.html))

**Documented.** `Shadow.convertRadiusToSigma` maps `blurRadius` with `radius * 0.57735 + 0.5` (Skia `ConvertRadiusToSigma`). Pass the design blur through as `BoxShadow.blurRadius`. Do not apply that formula in app code.

**Documented.** `RenderOpacity` paints via an intermediate buffer when opacity is neither 0 nor 1. `saveLayer` allocates an offscreen buffer. `Clip.antiAliasWithSaveLayer` is the clip mode that also does this ([performance best practices](https://docs.flutter.dev/perf/best-practices)). `IntrinsicWidth` and `IntrinsicHeight` add a speculative layout pass and, in the worst case, a layout that is O(N²) in tree depth. That worst case is stated on the render objects in the framework source, not as a promise that every call drops frames.

## Measurement and conversion

| Quantity | Where it comes from | What consumes it |
|---|---|---|
| Design measurement | Figma width, height, x, y, padding, gap, radius, font size | Candidate logical pixels |
| Logical pixel | `MediaQuery.sizeOf`, constraints, `fontSize` | Widget layout |
| Physical pixel | logical × `devicePixelRatio` | Rasterization, screenshot pixel size |
| Exported image pixel | design size × export scale | Asset file and `2.0x` / `3.0x` folders |
| Responsive scale | target logical width ÷ reference frame width | Only a composition that must scale as a whole |

```text
physical = logical * devicePixelRatio
logical = physical / devicePixelRatio
exportPixels = designLength * exportScale
flutterLogical = designLength                         # default
flutterLogical = designLength * target / frame        # proportional mode only
```

**Recommendation.** Use the default when the frame is a device or web frame in Figma's normal pixel grid (a 390×844 phone frame, a 1440-wide desktop frame). Map padding, gap, radius, font size, and fixed child sizes straight across. Map fill and hug to constraints, not to the frame's width copied onto every parent.

**Context-dependent.** Divide by an explicit design scale only when the frame is clearly a physical-pixel export (for example a 1170×2532 frame labeled @3x). Say so. A 390-wide frame is not @3x.

**Recommendation.** Keep fractional design values as `double`s. Rounding each edge to an integer accumulates wrap and alignment error. A logical edge lands on a physical pixel boundary only when `logical * devicePixelRatio` is an integer. Snap a hairline in that situation; do not round the whole tree.

Nested frames: a child's `x` and `y` are parent-relative. Do not add them to the parent's page origin unless the parent transform is identity. For a rotated layer, lay out the unrotated width and height, then apply the transform. `absoluteBoundingBox` is the wrong size input after rotation. Figma rotation is about the top-left; `Transform.rotate` defaults to the center. Build the transform from `relativeTransform` when that matrix is available. Otherwise treat a center-pivot `Transform.rotate(angle: degrees * pi / 180)` as unverified and check it visually. The sign follows `atan2(-m10, m00)`, which is not Flutter's default `rotationZ` angle.

Auto-layout children get their position from the flow. Ignore `x` and `y` except for `layoutPositioning: ABSOLUTE`.

## Responsive and adaptive layout

**Documented.** Responsive means the UI fits the space. Adaptive means it stays usable there (navigation, input, density). Branch on window size, not on a device-class boolean. `MediaQuery.sizeOf` is the whole window, including a resized desktop window. `LayoutBuilder` is the space this subtree actually received. ([adaptive and responsive](https://docs.flutter.dev/ui/adaptive-responsive))

Material breakpoint widths are a guideline, not a Flutter API ([breakpoints](https://m3.material.io/foundations/layout/breakpoints)):

| Breakpoint | Width |
|---|---|
| Compact | < 600 dp |
| Medium | 600–839 dp |
| Expanded | 840–1199 dp |
| Large | 1200–1599 dp |
| Extra-large | ≥ 1600 dp |

Use them when the product follows Material. Otherwise break where the layout actually changes (one column to two, a rail replacing a bar). Height matters when it is compact: a landscape phone can be wide and still too short for a second pane. Android's compact height is under 480 dp; confirm the product's own rule before encoding that number.

| Design sizing | Flutter |
|---|---|
| Fixed, and it still fits | Explicit logical size |
| Hug | Omit the size; `mainAxisSize: MainAxisSize.min` on that axis |
| Fill | `Expanded` / `Flexible` in a bounded flex parent; otherwise expand within the incoming max constraint |
| Min or max | `ConstrainedBox` |
| Fill and max | Do not put `ConstrainedBox(maxWidth: …)` under `Expanded`. A tight flex slot larger than the max is unsatisfiable. Give the child loose flex and a max, then check the size |
| Proportional scale of every measurement | Last resort for a poster-like composition. Do not scale `fontSize` that must follow `TextScaler`, and do not shrink targets below the platform minimum |

`Expanded` inside a scroll view on the scroll axis throws: the flex constraint is unbounded. Give the scroll view a bounded cross axis. Scroll the content that is actually longer than the viewport.

Safe area and insets: `SafeArea` pads from `MediaQuery.padding` and removes that padding from the `MediaQuery` its child sees, so nested safe areas do not stack. `viewPadding` includes system obstructions even when a keyboard is open. `viewInsets` is the keyboard and similar overlays. `Scaffold` already offsets the body when `resizeToAvoidBottomInset` is true. An edge-to-edge background can paint behind the status bar; the text and controls still need the safe padding.

Overflow: loosen a fixed width, allow wrap, or scroll. Do not clip text to hide an overflow. Directional padding (`EdgeInsetsDirectional`, `AlignmentDirectional`) follows `Directionality`. A localized app uses start/end. A mock that is intentionally left-anchored in every locale uses left/right, and that choice should be stated.

## Auto Layout mapping

| Figma | Flutter |
|---|---|
| `HORIZONTAL` | `Row` or `Flex(direction: Axis.horizontal)` |
| `VERTICAL` | `Column` |
| `WRAP` | `Wrap`. `spacing` is between children along the main axis. `runSpacing` is between runs. `counterAxisSpacing` maps to `runSpacing` |
| `GRID` | No direct widget. A regular track can be rows of rows, `Table`, or a small custom layout. Do not call a `Column` a grid |
| `itemSpacing` ≥ 0 | `spacing` on `Row`, `Column`, or `Flex` when that parameter exists in the pinned SDK. Otherwise a `SizedBox` between children |
| `itemSpacing` < 0 | Legal in Figma. `Flex.spacing` asserts `>= 0`. Overlap needs a stack or a transform, called out as an approximation |
| Padding LTRB | `EdgeInsets.fromLTRB`, or `EdgeInsetsDirectional` when the screen is directional |
| Primary `MIN` / `CENTER` / `MAX` / `SPACE_BETWEEN` | `MainAxisAlignment.start` / `center` / `end` / `spaceBetween` |
| Counter `MIN` / `CENTER` / `MAX` / `BASELINE` | `CrossAxisAlignment.start` / `center` / `end` / `baseline` with `textBaseline` |
| Counter stretch (`layoutAlign: STRETCH` or fill on the counter axis) | `CrossAxisAlignment.stretch` |
| Child fill on the main axis (`layoutGrow` 1) | `Expanded`. Several fill siblings share leftover space equally. `layoutGrow` is documented as 0 or 1, not an arbitrary flex weight |
| Absolute child | `Stack` + `Positioned` from the parent origin. The flow siblings do not make room for it |
| `clipsContent` | Clip, or prefer `borderRadius` on the decoration when the only goal is a rounded corner |
| `strokesIncludedInLayout: true` | Figma includes the stroke in the layout size (border-box). Inside stroke already consumes inner space in Flutter |

`SPACE_BETWEEN` plus a positive gap: Flutter treats `spacing` as a minimum and distributes leftover free space in addition. Check a frame that uses both; do not assume the numbers match without looking.

Constraints on a child apply to layers outside auto layout, and to absolute layers. They do not apply to in-flow auto-layout children; those use hug, fill, fixed, and min/max. ([constraints](https://help.figma.com/hc/en-us/articles/360039957734-Apply-constraints-to-define-how-layers-resize), [auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma))

| Figma constraint | Resize behavior |
|---|---|
| Left / top | Pin to that edge |
| Right / bottom | Pin to the opposite edge |
| Left and right, or top and bottom | Stretch on that axis |
| Center | Stay centered |
| Scale | Keep the same fraction of the parent |

Scale constraints are the case for a fraction (`FractionallySizedBox` or `Align` with width/height factors). They are not a reason to scale the whole app.

## Typography and assets

Diagnose text in this order. Stop at the first mismatch.

1. The same font file, family name, and weight are loaded. A missing weight is not the same glyph.
2. `fontSize` is the design size in logical pixels, before `TextScaler`.
3. Line height unit:
   - `PIXELS`: `height = value / fontSize`
   - `PERCENT`: `height = value / 100` (Figma percent is of the font size)
   - `AUTO`: leave `height` null. Do not set `1.0`
4. For an explicit height, set `leadingDistribution: TextLeadingDistribution.even`. **Recommendation**, because that is CSS half-leading and Figma's fixed line height is a CSS-like line box. Flutter does not document Figma parity. `proportional` shifts the glyph inside the same line box.
5. Letter spacing unit ([LetterSpacing](https://developers.figma.com/docs/plugins/api/LetterSpacing/)):
   - `PIXELS`: `letterSpacing = value`
   - `PERCENT`: `letterSpacing = fontSize * value / 100`
   - Tracking in thousandths of an em: `letterSpacing = fontSize * tracking / 1000`. Do not apply this and a percent conversion to the same number.
6. The text's max width is the Figma text-box width, via the parent constraint or a `SizedBox`. A different width changes wrapping even when the style matches.
7. Fixed-box vertical alignment (top, center, bottom) is alignment of the paragraph in the box. Hug text ignores it. Use `Align`, not a padding nudge.
8. Ellipsis only when the design truncates: `maxLines` plus `TextOverflow.ellipsis`.
9. Mixed styles in one paragraph that must share one line box: `StrutStyle` with the same font size, height, and leading, and `forceStrutHeight: true`.
10. `TextHeightBehavior(applyHeightToFirstAscent: false)` or `applyHeightToLastDescent: false` only after the line box is right and the remaining error is extra leading on the first or last line. The default applies height to both.

Do not fix a metric mismatch with `Transform.translate`.

`TextScaler` can be nonlinear. A fixed-height box around text will clip at large accessibility sizes. Let the hug axis grow, or test `TextScaler.linear(1.3)` and a larger scaler on that screen.

Variable fonts: `TextStyle.fontVariations` (for example `FontVariation('wght', …)`) only when the shipped file is a variable font. A static file needs `FontWeight`.

Images: the widget's width and height are the design's logical size. A 120×120 layer exported at 3x is a 360×360 file placed in `3.0x/`, declared once in `pubspec.yaml`, and drawn at 120×120. SVG and PDF export from Figma are 1x only. `cacheWidth` and `cacheHeight` are decode dimensions, not layout size; the widget still lays out at its logical size. They are ignored for network images on web. Set them when a large bitmap is drawn much smaller, typically `logical * devicePixelRatio`, rounded, and only on platforms that honor them.

`cornerSmoothing` of 0 is a circular corner: `BorderRadius`. A value of 0.6 is Figma's iOS 7 squircle. `ContinuousRectangleBorder` is a continuous corner with no smoothing parameter and no documented equivalence to that curve. Use it only as a candidate when smoothing is near 0.6, and compare it. Do not replace every radius with it.

Drop shadow: `BoxShadow(color, offset, blurRadius, spreadRadius)` from the effect payload. Confirm the effect type on the node. Inner shadow has no `BoxShadow` equivalent. Background blur is `BackdropFilter`, clipped to the shape. Layer blur is `ImageFilter`. All three need a visual check. Flutter widget tests run with `debugDisableShadows`, which strips shadow blur in `BoxShadow.toPaint`, so a golden does not prove a device shadow.

Gradients: map linear and radial paints to `LinearGradient` and `RadialGradient` using the payload's stops. Confirm the handles. `SweepGradient` is only a candidate for an angular paint. A diamond paint has no direct widget.

## Cross-platform rules

The same widget tree does not guarantee the same pixels.

- Text uses Flutter's paragraph builder, but the available fonts, hinting, and antialiasing still differ by OS. Web renders with CanvasKit or skwasm depending on browser and build flags; that is a different raster path from a phone ([web Wasm](https://docs.flutter.dev/platform-integration/web/wasm)).
- Browser zoom and desktop DPI change `devicePixelRatio` or the logical window size. Read them. Do not cache the first `MediaQuery` size: the first frame can be `Size.zero`.
- System insets differ. A design with no status bar still needs a safe area on devices that have one, unless the design explicitly bleeds under the bar.
- Scroll physics, scrollbars, hover, and focus are platform conventions. Add a visible scrollbar and a focus state for desktop and web when the control is interactive. Do not force iOS bounce on a desktop list unless the product asks.
- Network images on web must satisfy browser CORS, or use an HTML-element image strategy. `cacheWidth` will not help there.
- Window resize is the desktop and foldable case. Drive it with constraints. A phone frame width copied into a `SizedBox` will overflow a split view and sit in a corner on a monitor.

Platform-specific design frames, when the file actually has them, are adaptive variants. Select the variant from window size and input, then share tokens.

## Performance

Separate documented cost from a decision to change the design.

Documented costs: an `Opacity` widget on a multi-child subtree; `saveLayer`; `Clip.antiAliasWithSaveLayer`; shader masks and color filters; clipping and shadows applied above a large subtree; intrinsic layout in a deep tree; decoding a large bitmap at full size. `const` widgets let the element tree reuse identical configuration. A long list should be built lazily (`ListView.builder` or slivers), not as thousands of `Column` children.

**Recommendation.** Prefer `ColoredBox`, `DecoratedBox`, `Padding`, and `SizedBox` over a `Container` that only uses one of those roles. Prefer a widget class when that subtree rebuilds on its own. Apply opacity with a transparent color when the shape does not overlap itself.

**Context-dependent.** One shallow `IntrinsicHeight` for a short row is a valid way to share a height. It is the wrong tool inside a long scrolling list. A `RepaintBoundary` helps when a static subtree is repainting next to animation; it costs memory. Add one when a trace shows the repaint, not by default.

Profile on a profile build. Debug-mode frame times include assertions and are not evidence. DevTools can checkerboard offscreen layers and disable clip, opacity, and physical-shape layers to test a hypothesis ([performance view](https://docs.flutter.dev/tools/devtools/performance)). Keep the design effect if disabling the layer does not improve the measured frame.

## Design tokens and component architecture

Look for an existing `ThemeData`, `ColorScheme`, and `ThemeExtension` before adding constants.

| Kind of value | Store it as |
|---|---|
| Brand color, type ramp, shared space, radius, elevation | Semantic theme value |
| Raw palette step needed to build those semantics | Private primitive |
| Value that changes at a breakpoint | Layout rule next to the widget that branches, not a second copy of every token |
| One screen's adjustment | Local value. Do not publish it as a token |

Map Material roles (`primary`, `surface`, `onSurface`, `outline`) into `ColorScheme`. Put app-specific tokens in one `ThemeExtension` with `copyWith` and `lerp`, registered on every theme the app can show. Light and dark are two themes, not `if (dark)` scattered through widgets.

Component variants become constructor parameters or a small enum on the existing widget. Do not generate a widget per Figma variant name when they share a layout. State (pressed, disabled, focused, error) comes from the design if present; do not invent a pressed color.

## Visual validation

Compare at the same logical size, the same `devicePixelRatio`, the same font files, and the same asset scale.

Widget-test surface defaults to 800×600 logical pixels (`_kDefaultTestViewportSize`). Set the view explicitly and reset it:

```dart
tester.view.devicePixelRatio = 1.0;
tester.view.physicalSize = const Size(390, 844);
addTearDown(tester.view.resetDevicePixelRatio);
addTearDown(tester.view.resetPhysicalSize);
```

`physicalSize` is in physical pixels, so a 390×844 logical frame at DPR 3 is `Size(1170, 2532)` with `devicePixelRatio = 3.0`. Comparing a 1x Figma PNG to a 3x golden without scaling one of them is not a layout failure.

Load the real font in the test binding or `flutter_test_config.dart`. A fallback font fails the golden and the design.

`matchesGoldenFile` is a pixel comparison. Glyph edges and antialiasing differ between Figma's exporter, Skia, Impeller, and a browser. Triage the diff:

- A shifted block, wrong gap, or early wrap is a layout bug.
- A halo on glyph edges with correct line breaks is rasterization. Do not nudge padding to eat a halo.
- A missing shadow in a widget-test golden is expected while `debugDisableShadows` is true. Check shadows on a device or a test that enables them.

Golden files do not replace a device check for safe area, keyboard, browser zoom, or a resized window. Accessibility: `androidTapTargetGuideline` is 48×48, `iOSTapTargetGuideline` is 44×44, plus labels and text contrast ([accessibility testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing)).

## Repository inspection

Before editing, read:

- `pubspec.yaml` SDK constraint, Flutter/Dart availability, and target platforms
- `analysis_options.yaml`, existing theme, shared widgets, asset and font declarations
- Tests already covering the screen
- The Figma node's layout mode, sizing, padding, gap, constraints, text style (including units), fills, strokes, effects, corner radius, and `cornerSmoothing`
- Whether each number is a logical design size, a physical pixel size, an export size, or a transformed coordinate

Then match the repository. A project that already has a card widget gets a change to that widget, not a parallel `FigmaCard`.

## Implementation workflow

### Phase 1 — Inspect

- Inputs: repo, design link or node, target platforms.
- Actions: run the inspection above. Record the frame's logical size and each child's sizing mode.
- Decision: stop and ask only if a missing font, asset, or contradictory constraint would change the structure.
- Output: a short mapping of frame → widgets and which values are tokens already.
- Failure: treating the first `MediaQuery` size or a PNG's pixel dimensions as the spec.
- Done: the coordinate system for every measurement in scope is identified.

### Phase 2 — Analyze

- Inputs: the inspected node tree.
- Actions: separate fixed, hug, fill, min/max, absolute, and text units. Note breakpoint behavior the design shows, or state that it shows one viewport only.
- Decision: one viewport in the file means implement that viewport's rules with constraints, and name the untested breakpoints.
- Output: widget tree and the conversion mode (1:1 logical, explicit ÷ scale, or proportional composition).
- Failure: a single scale factor for the whole frame.
- Done: every text style has a unit, and every absolute child is listed.

### Phase 3 — Plan

- Inputs: the mapping and the existing theme.
- Actions: choose widgets from the mapping table. Reuse tokens. Decide directional versus absolute edges.
- Decision: a new `ThemeExtension` only if the value is shared and the theme does not already have it.
- Output: the intended tree, files to touch, and checks to run.
- Failure: a new package or a screen-wide scale wrapper.
- Done: the plan names the files and the verification.

### Phase 4 — Implement

- Inputs: the plan.
- Actions: implement the tree. Keep `fontSize` and spacing in logical pixels. Wire real assets and fonts.
- Decision: follow the sizing table. Leave an unresolved visual gap as a named assumption.
- Output: compiling UI in the existing architecture.
- Failure: `Expanded` on an unbounded axis, DPR multiplied into padding, or `height: 24` used as a pixel line height.
- Done: analyzer-clean code limited to the agreed files.

### Phase 5 — Validate

- Inputs: the implementation and a way to render it.
- Actions: format, analyze, and run the focused widget or golden test. Compare at a controlled logical size. Check one narrow width and one wide width when the layout claims to adapt. Check a large `TextScaler` when text is boxed.
- Decision: fix structural diffs. Record raster diffs.
- Output: command results and the remaining visual gap.
- Failure: claiming parity from a screenshot at an unknown DPR.
- Done: every check that ran is recorded, including checks that could not run.

### Phase 6 — Optimize

- Inputs: a profile trace, or a documented cost that is obviously in the new tree (a full-screen `Opacity`, an unbounded list of children).
- Actions: change the dominant cost. Re-check the layout.
- Decision: skip this phase when there is no such cost.
- Output: either no change, or a change tied to a documented mechanism or a trace.
- Failure: deleting decoration to "make it faster" with no measurement.
- Done: fidelity constraints from phase 5 still hold.

### Phase 7 — Report

- Inputs: the diff and the verification notes.
- Actions: state conversion mode, breakpoint behavior, token reuse, checks run, and unresolved gaps.
- Done: a reader can tell what was verified and what was not.

## Decision trees

**Which conversion?**

1. Image file dimensions or an export scale → asset pixels. Widget size stays logical.
2. `devicePixelRatio` on the device → physical pixels. Leave layout numbers alone.
3. Frame is the logical design viewport → `flutterLogical = designLength` for fixed measurements. Fill and hug use constraints.
4. Frame is an explicit physical-pixel board → divide by the labeled scale, once.
5. Product requires the whole composition to grow with the window → scale that composition only.

**Which axis API?**

1. Parent size is the window → `MediaQuery.sizeOf` or a breakpoint at the page.
2. Parent size is a card, pane, or split → `LayoutBuilder`.
3. Child should be as big as the parent allows on one axis → `Expanded` in a bounded flex parent.
4. Child's size is its content → no width or height on that axis.

**Which text height?**

1. Unit `AUTO` → `height: null`.
2. Unit `PIXELS` or `PERCENT` → multiplier as above, plus `even` leading.
3. Still vertically off after the font file matches → strut or first/last-line `TextHeightBehavior`, then a visual check.

## Common failures

| Failure | Why it breaks | Correction | Check |
|---|---|---|---|
| `width: figmaWidth * devicePixelRatio` | DPR is applied again at raster time, so the widget is several times too wide | Use logical width | Logical window matches the frame; physical size is `logical * dpr` |
| `fontSize: 16 * screenWidth / 390` on every widget | Couples type to width, fights `TextScaler`, and shrinks targets | 1:1 logical sizes; adapt with fill, hug, and breakpoints | Layout at 320, 390, 834, and 1440 logical pixels |
| `Positioned` for a vertical auto-layout stack | Absolute children do not reflow when text grows | `Column` with the mapped alignment and gap | Longer string and a large text scaler |
| `SizedBox(width: 390)` as the page | Overflows below 390 and leaves empty space above it | Page takes the window; 390 was the reference viewport | Narrow window and a desktop window |
| `height: 24` with `fontSize: 16` | `height` is a multiplier, so the line becomes 384 logical pixels | `height: 24 / 16` | Line box is 24 logical pixels |
| `height: 1` to mean "default" | Forces the em square, not font metrics or a Figma AUTO line height | `height: null` for AUTO | Compare against the font's own line box |
| `IntrinsicHeight` around every row in a long list | Speculative layout, worst case O(N²) in depth | Fixed cross size, or one shallow intrinsic where the row count is tiny | No intrinsic widget in the list item |
| `Image` width set to the exported PNG pixel width | Export scale is not a layout scale | Logical size in the widget; pixels in `2.0x` / `3.0x` | Image box matches the Figma layer at DPR 1 |

## Examples

### 1. Basic unit conversion

A 390×844 Figma phone frame at device pixel ratio 3:

```text
logical layout:  390 x 844
physical pixels: 1170 x 2532
```

Padding of 16, a 24 logical-pixel icon, and a 16 logical-pixel font stay 16, 24, and 16. Flutter rasterizes them at 3×. Multiplying those numbers by 3 lays out a 1170-wide screen inside a 390-wide window.

Verify on an emulator or simulator whose logical resolution is 390×844, or in a test with `physicalSize` and `devicePixelRatio` set as in Visual validation. Read `MediaQuery.sizeOf` and confirm it is 390×844, not 1170×2532.

### 2. Responsive card

```dart
class ProductCard extends StatelessWidget {
  const ProductCard({required this.title, required this.body, super.key});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 840;
        final text = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(body, style: Theme.of(context).textTheme.bodyMedium),
          ],
        );
        final media = const SizedBox(width: 120, height: 120);
        return ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 960),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 24,
                  children: [media, Expanded(child: text)],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 12,
                  children: [media, text],
                ),
        );
      },
    );
  }
}
```

840 is the Material expanded width, used here because the card gains a second column there. Below that, the column fills the parent. The media box stays 120. `spacing` requires a `Row`/`Column` that exposes it; on an older SDK, use a `SizedBox` between children. If `constraints.maxWidth` is infinite, constrain the parent first.

### 3. Nested auto layout

Frame: vertical, fixed width, hug height, padding 16, gap 12. Child row: gap 12, counter-axis center, avatar 40 fixed, text column fill. Text column: hug, gap 4, title and subtitle hug. Button: fill width, fixed height 40.

```dart
class NoticeCard extends StatelessWidget {
  const NoticeCard({
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    super.key,
  });

  final String title;
  final String subtitle;
  final String actionLabel;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Row(
            spacing: 12,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(width: 40, height: 40),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 4,
                  children: [
                    Text(title, style: text.titleMedium),
                    Text(subtitle, style: text.bodyMedium),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(
            height: 40,
            width: double.infinity,
            child: FilledButton(onPressed: () {}, child: Text(actionLabel)),
          ),
        ],
      ),
    );
  }
}
```

The card's width comes from the parent, the way a fill-width frame does. The column hugs vertically because `mainAxisSize` is `min`.

### 4. Typography mismatch

Figma: font size 16, line height 24 px, letter spacing 0.2 px. Flutter draws the line too low and wraps one word early.

```dart
const style = TextStyle(
  fontFamily: 'Inter',
  fontSize: 16,
  height: 24 / 16,
  leadingDistribution: TextLeadingDistribution.even,
  letterSpacing: 0.2,
);
```

Then give the text the same max width as the Figma text box. If it is still low, confirm the loaded face with the Flutter font inspector or by printing `DefaultTextStyle.of(context).style.fontFamily`. Only after the face and the multiplier match, try a strut or `TextHeightBehavior`. A Figma AUTO line height skips `height` and `leadingDistribution` entirely.

### 5. Controlled visual comparison

1. Export or screenshot the Figma frame at 1x, at the frame's logical size.
2. Render Flutter at that logical size and DPR 1, with the same font files.
3. Diff. Fix layout errors.
4. Repeat at DPR 2 or 3 before calling a bitmap asset correct.
5. Repeat at the next breakpoint the layout claims to support.

A 1x golden cannot prove a 3x asset. A widget-test golden cannot prove a device shadow while shadows are disabled.

### 6. Performance

```dart
// Documented cost: Opacity composites the whole column through an offscreen buffer.
Opacity(opacity: 0.5, child: columnOfCards)

// Same fade for a solid color, without that buffer, when the pixels do not overlap.
ColoredBox(color: color.withValues(alpha: 0.5), child: columnOfCards)
```

`withValues` requires the pinned `Color` API. A list of hundreds of cards uses `ListView.builder`. Neither snippet is a measured frame-time result.

### 7. Cross-platform

Keep one `NoticeCard`. At the page, choose structure from the window:

```dart
final width = MediaQuery.sizeOf(context).width;
final horizontal = width >= 840 ? 48.0 : 16.0;
```

Put that padding in `SafeArea` on a phone so a notch does not cover it. On desktop, `SafeArea` is typically zero and the extra padding remains. Add `Scrollbar` for the scrolling page on desktop and web. Do not fork the card's padding with `Platform.isIOS`.

### 8. Conversion failures

The failure table in Common failures is the checklist for this example. The two that look most like "making it sharp" are DPR multiplication and using a 3x PNG's pixel width as the widget width. Both draw a larger box. The device pixel ratio belongs in asset selection and in `cacheWidth`, not in `Padding`.

## Verification and acceptance

Accept the work when:

- Fixed measurements match the design in logical pixels, and the conversion mode is stated.
- Fill, hug, and absolute children follow the mapping table.
- Text uses the resolved font, unit-correct height, and letter spacing.
- The narrowest supported window does not overflow, and a large text scaler does not clip primary text.
- Interactive targets meet the platform minimum the app claims, or the gap is recorded.
- `dart format` and `flutter analyze` were run on the touched code, or the report says they were not run.
- A focused test, golden, or device comparison was run when a renderer was available.
- No pixel-perfect or performance claim exceeds that evidence.

## Official references

Flutter:

- https://docs.flutter.dev/ui/layout/constraints
- https://docs.flutter.dev/resources/faq
- https://docs.flutter.dev/ui/adaptive-responsive
- https://docs.flutter.dev/ui/adaptive-responsive/general
- https://docs.flutter.dev/ui/adaptive-responsive/safearea-mediaquery
- https://docs.flutter.dev/perf/best-practices
- https://docs.flutter.dev/perf/ui-performance
- https://docs.flutter.dev/tools/devtools/performance
- https://docs.flutter.dev/ui/accessibility/ui-design-and-styling
- https://docs.flutter.dev/ui/accessibility/accessibility-testing
- https://docs.flutter.dev/release/breaking-changes/deprecate-textscalefactor
- https://docs.flutter.dev/platform-integration/web/wasm
- https://docs.flutter.dev/flutter-for/android-devs
- https://api.flutter.dev/flutter/painting/TextStyle/height.html
- https://api.flutter.dev/flutter/dart-ui/TextLeadingDistribution.html
- https://api.flutter.dev/flutter/dart-ui/TextHeightBehavior-class.html

Figma and Material:

- https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma
- https://help.figma.com/hc/en-us/articles/360039957734-Apply-constraints-to-define-how-layers-resize
- https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties
- https://help.figma.com/hc/en-us/articles/360050986854-Adjust-corner-radius-and-smoothing
- https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings-for-static-designs
- https://developers.figma.com/docs/rest-api/file-node-types/
- https://developers.figma.com/docs/plugins/api/node-properties/
- https://developers.figma.com/docs/plugins/api/LineHeight/
- https://developers.figma.com/docs/plugins/api/LetterSpacing/
- https://developers.figma.com/docs/plugins/api/properties/nodes-rotation/
- https://m3.material.io/foundations/layout/breakpoints

Framework source checked locally: `TextStyle`, `kTextHeightNone`, `Shadow.convertRadiusToSigma`, `Border` / `BorderSide`, `RenderOpacity`, `RenderIntrinsicHeight`, `RenderFlex.spacing`, `Image.cacheWidth`, `MediaQueryData`, and the test viewport constant. The effects-object schema and the widget-test default DPR were not fully read; set DPR explicitly and read effect fields from the node.

## Final checklist

- [ ] Repo theme, widgets, fonts, assets, and SDK constraint inspected
- [ ] Each measurement classified: logical design, physical, export, or transformed
- [ ] No blanket DPR multiply and no blanket `screenWidth / frameWidth` scale
- [ ] Hug, fill, fixed, min, max, and absolute children mapped
- [ ] Text height unit handled; AUTO is not `height: 1`
- [ ] Explicit line height uses a multiplier and even leading, then a visual check
- [ ] Assets use logical widget size and resolution-aware files
- [ ] `cornerSmoothing == 0` stays a circular radius
- [ ] Safe area, keyboard inset, and at least one other window size considered
- [ ] Directional insets for a localized layout
- [ ] No new package and no parallel token set
- [ ] Analyzer and a focused test or screenshot comparison recorded
- [ ] Unverified items listed, including any shadow golden taken while shadows are disabled
