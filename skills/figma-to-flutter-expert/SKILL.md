---
name: figma-to-flutter-expert
description: "Use when converting Figma designs, frames, components, or design systems into production-ready Flutter/Dart code; translating Figma Auto Layout, constraints, tokens, typography, colors, shadows, and vector assets; resolving visual discrepancies, overflow, or layout drift between Figma and Flutter; auditing or refactoring existing Flutter UI for pixel fidelity and rendering performance; implementing responsive multi-platform Flutter layouts (iOS, Android, Web, macOS, Windows, Linux) from design specs; or establishing automated golden and visual regression test suites for Flutter widgets."
compatibility: "Flutter 3.24+ (native flex spacing in Flutter 3.27+; Color.withValues in Flutter 3.27+; TextScaler in Flutter 3.16+; Material 3 default)."
---

# Figma → Flutter Production Engineering

Transform Figma designs into high-fidelity, high-performance, accessible, and responsive Flutter applications across mobile, desktop, and web.

## 1. Operating Model & Non-Negotiable Invariants

Treat Figma as the visual and behavioral contract. Adhere strictly to Flutter's box-layout model:

> **Constraints go down. Sizes go up. Parents set positions.**

1. **Translate intent and constraints, never naive syntax**: Do not map frames blindly to `Container` or CSS positioning to `Positioned`. Reconstruct the layout using Flutter's constraint tree.
2. **Zero magic numbers**: Extract all colors, typography, spacing, radii, and elevations into centralized design tokens (`ThemeData`, `ThemeExtension`).
3. **No guessing**: Never silently invent missing design values, interactive states, or assets. Follow the deterministic inspection protocol.
4. **Ponytail widget ladder**: Use the smallest, most specialized widget that satisfies the visual requirement (`ColoredBox` < `DecoratedBox` < `Padding` < `SizedBox` < `Container`).
5. **Isolate rebuild boundaries**: Extract stateful or heavy subtrees into dedicated `StatelessWidget` classes with `const` constructors. Never use widget-returning helper methods.
6. **Eliminate offscreen buffers**: Avoid `Opacity` on multi-child subtrees and avoid `Clip.antiAliasWithSaveLayer`. Use `Color.withValues(alpha: ...)` for color transparency.
7. **Accessibility & Dynamic Type**: Preserve dynamic font scaling via `TextScaler`. Never trap text in unconstrained fixed-height boxes. Touch targets must be $\ge 48\times 48\text{ dp}$.
8. **Measurable visual verification**: Verify fidelity under controlled conditions (matching DPR, logical dimensions, and loaded true fonts) using automated golden tests.

---

## 2. Progressive Disclosure: Supporting References

Read supporting guides as needed for specialized requirements:

| Need | Reference |
|---|---|
| Detailed Figma Dev Mode node properties, JSON extraction, and token schemas | [`references/figma-inspection.md`](references/figma-inspection.md) |
| Complete Auto Layout mapping matrix, squircle curves, strokes, and effects | [`references/design-to-widget-mapping.md`](references/design-to-widget-mapping.md) |
| Render pipeline internals, relayout/repaint boundaries, `saveLayer`, and DevTools profiling | [`references/flutter-performance.md`](references/flutter-performance.md) |
| Golden test harness, font loading, pixel diffing, and discrepancy diagnostics | [`references/pixel-perfect-validation.md`](references/pixel-perfect-validation.md) |
| Responsive breakpoints, `LayoutBuilder` vs `MediaQuery`, desktop/web ergonomics, RTL | [`references/responsive-cross-platform.md`](references/responsive-cross-platform.md) |
| Curated official Flutter, Dart, and Figma documentation URLs | [`references/official-sources.md`](references/official-sources.md) |
| Production code examples: before/after conversion and tokenized Figma Card | [`examples/optimized-widgets.md`](examples/optimized-widgets.md) |
| Executable visual regression test suite and golden troubleshooting | [`examples/visual-regression-workflow.md`](examples/visual-regression-workflow.md) |

---

## 3. Systematic Translation Workflow

Execute these phases in strict order:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Phase 1:        │ ──> │ Phase 2:        │ ──> │ Phase 3:        │
│ Inspect & Audit │     │ Tokenize System │     │ Map Hierarchy   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Phase 6:        │ <── │ Phase 5:        │ <── │ Phase 4:        │
│ Verify Goldens  │     │ Implement Code  │     │ Select Widgets  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 1: Inspect Figma Frame & Extract Inventory
* Extract layout mode (`HORIZONTAL`, `VERTICAL`, `WRAP`, or `NONE`).
* Extract primary and counter axis alignments (`MIN`, `CENTER`, `MAX`, `SPACE_BETWEEN`, `BASELINE`, `STRETCH`).
* Extract sizing modes: Parent (Fixed vs Hug vs Fill) and Children (`layoutGrow: 1`, `layoutAlign: STRETCH`).
* Extract item spacing (`itemSpacing`), padding (LTRB), stroke alignments (`INSIDE`, `CENTER`, `OUTSIDE`), corner radii, and shadow effects.
* Extract typography: PostScript font name, weight, `fontSize`, exact `lineHeightPx`, and `letterSpacing`.
* Identify absolute positioned layers within Auto Layout (`layoutPositioning: ABSOLUTE`).

### Phase 2: Establish Design Tokens
* Map colors into `ColorScheme` or custom `ThemeExtension`.
* Map spacing to a 4dp/8dp grid (`xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`).
* Map typography to `TextTheme` using `leadingDistribution: TextLeadingDistribution.even` and calculated line-height ratios:
  $$\text{TextStyle.height} = \frac{\text{lineHeightPx}}{\text{fontSize}}$$

### Phase 3: Map Layout Hierarchy
* `HORIZONTAL` Auto Layout $\to$ `Row`.
* `VERTICAL` Auto Layout $\to$ `Column`.
* `WRAP` Auto Layout $\to$ `Wrap(spacing: ..., runSpacing: ...)`.
* Absolute positioned children $\to$ Wrap frame content in `Stack` with `Positioned` overlays.
* Scrollable content $\to$ Use `ListView.builder` or `CustomScrollView` with slivers. Never place unbounded flex widgets inside scrolling viewports.

### Phase 4: Widget Selection Decision System
Apply the widget ladder to choose the simplest, highest-performance widget:
* **Background color only**: `ColoredBox` (bypasses `BoxPainter`).
* **Decoration only (border/radius/shadow/gradient)**: `DecoratedBox`.
* **Insets only**: `Padding`.
* **Fixed dimension / constraints**: `SizedBox` (tight) or `ConstrainedBox` (min/max).
* **Alignment only**: `Align` or `Center`.
* **Combined properties (margin + padding + decoration + constraints)**: `Container`.

### Phase 5: Implement with Performance & Platform Guards
* Use `spacing: double` on `Row`, `Column`, and `Flex` (Flutter 3.27+).
* Use `Color.withValues(alpha: ...)` instead of deprecated `withOpacity`.
* Use `ShapeDecoration` with `ContinuousRectangleBorder` for Figma squircle corner smoothing.
* Use `LayoutBuilder` for component-level adaptability.
* Use `Directional` primitives (`EdgeInsetsDirectional`, `AlignmentDirectional`) for RTL readiness.
* Provide hover effects (`MouseRegion`) and visible scrollbars on desktop/web targets.

### Phase 6: Verify Fidelity via Golden Tests
* Run golden tests with fixed physical dimensions, DPR, and loaded true fonts.
* Inspect pixel diffs; resolve root causes (text metrics, stroke insets, shadow spreads); never apply arbitrary transform offset hacks.

---

## 4. Typography & Visual Styling Rules

| Figma Property | Flutter Implementation | Critical Engineering Rule |
|---|---|---|
| **Line Height (px)** | `height: lineHeightPx / fontSize` | Flutter `height` is a proportional factor, not a pixel value. |
| **Leading Distribution** | `leadingDistribution: TextLeadingDistribution.even` | Matches Figma's centered vertical leading; prevents 1–3px baseline drift. |
| **Letter Spacing** | `letterSpacing: letterSpacingPx` | If percentage: `(percent / 100) * fontSize`. |
| **Color Alpha** | `color.withValues(alpha: a)` | Avoids precision loss; replaces `@Deprecated` `withOpacity`. |
| **Inside Stroke** | `Border.all(color: c, width: w)` | Flutter borders paint inside bounding box, matching Figma `INSIDE`. |
| **Outside Stroke** | Outset container or outer `Padding` | Prevent stroke clipping when border extends beyond frame. |
| **Corner Smoothing** | `ContinuousRectangleBorder(borderRadius: ...)` | Matches Figma squircle curvature; do not use standard circular radius. |
| **Drop Shadow** | `BoxShadow(offset: Offset(x, y), blurRadius: b, spreadRadius: s, color: c)` | Directly maps Figma `(x, y, blur, spread, color)`. |
| **Frosted Glass Blur** | `ClipRRect(child: BackdropFilter(filter: ImageFilter.blur(...)))` | Always clip backdrop filter to widget bounds. |

---

## 5. Performance Engineering Rules

1. **`const` Constructors**: Mark every immutable widget and constructor call `const` to allow element reuse and eliminate redundant rebuilds.
2. **Widget Class Extraction**: Extract visual components into dedicated classes. Helper methods (`Widget _buildRow()`) force unconditional rebuilds of the entire parent subtree.
3. **Relayout Boundaries**: Pass tight constraints (`SizedBox(width: w, height: h)`) around rapidly updating children so layout recalculations do not propagate up to the parent.
4. **Repaint Boundaries**: Wrap complex, static, or canvas-painted subtrees in `RepaintBoundary` when placed adjacent to animating widgets.
5. **Zero `saveLayer` in Hot Paths**: Never apply `Opacity` to complex subtrees during animation or scrolling; use `Color.withValues(alpha: ...)` or custom tinting. Avoid `Clip.antiAliasWithSaveLayer`.
6. **No Intrinsic Height in Scrolling Lists**: Strictly forbid `IntrinsicHeight` and `IntrinsicWidth` inside dynamic lists or deep trees ($O(N^2)$ layout hazard).
7. **Bounded Image Decoding**: Always specify `cacheWidth` and `cacheHeight` on `Image.asset` or `ResizeImage` to avoid allocating massive uncompressed bitmaps in RAM.

---

## 6. Responsive & Cross-Platform Rules

* **Breakpoints**: Derive from content thresholds: Compact ($<600\text{dp}$), Medium ($600\text{–}840\text{dp}$), Expanded ($>840\text{dp}$).
* **Component Responsiveness**: Use `LayoutBuilder` inside reusable components so they adapt to parent constraints across split-screens, drawers, and modal sheets.
* **Max-Width Anchoring**: Wrap desktop and web page content in `Center(child: ConstrainedBox(constraints: BoxConstraints(maxWidth: 1200), child: ...)))` to preserve readability on wide monitors.
* **Desktop Input**: Attach `ScrollController` to `Scrollbar(thumbVisibility: true)` on desktop viewports. Add `MouseRegion(cursor: SystemMouseCursors.click)` for interactive cards.
* **Mobile Insets**: Wrap screens in `SafeArea` to handle device notches and home indicators. Use `PopScope` for Android predictive back gestures.

---

## 7. Anti-Patterns & Prohibited Shortcuts

Do not commit any of the following anti-patterns:

1. ❌ **Blindly wrapping everything in `Container`**: Use specialized primitives (`ColoredBox`, `DecoratedBox`, `Padding`, `SizedBox`).
2. ❌ **Using arbitrary `Positioned` coordinates for flow layouts**: Use `Row`, `Column`, or `Wrap`. Reserve `Positioned` solely for floating overlays inside `Stack`.
3. ❌ **Hardcoding pixel line height**: Setting `height: 24` instead of `height: 24 / 16` creates a 384px line height.
4. ❌ **Omitting `leadingDistribution: TextLeadingDistribution.even`**: Causes vertical text alignment drift between Figma and Flutter.
5. ❌ **Hardcoded magic numbers**: Scattering raw colors, radii, or spacing without referencing design tokens.
6. ❌ **Using `IntrinsicHeight` on scrolling lists**: Causes severe frame drops due to $O(N^2)$ layout passes.
7. ❌ **Eager list construction**: Using `Column(children: ...)` or `ListView(children: ...)` for unbounded or dynamic items instead of `ListView.builder`.
8. ❌ **Helper methods returning widgets**: Dirtying the parent build tree instead of extracting `StatelessWidget` classes.
9. ❌ **Applying `Opacity` widget on multi-child trees**: Triggers expensive GPU `saveLayer` passes.
10. ❌ **Unbounded flex inside scrollable**: Placing `Expanded` inside `SingleChildScrollView` throws fatal runtime errors.
11. ❌ **Decoding raw 4K images without `cacheWidth`/`cacheHeight`**: Causes high memory spikes and OOM crashes.
12. ❌ **Substituting custom icons with generic Material icons**: Export and use exact SVGs via `flutter_svg`.
13. ❌ **Subpixel positioning hacks**: Using `Transform.translate(offset: Offset(0, 1.5))` to fudge misalignments instead of fixing the root typographic or padding cause.
14. ❌ **Hardcoding Left/Right in directional UI**: Breaks RTL locales; use `EdgeInsetsDirectional` and `AlignmentDirectional`.
15. ❌ **Claiming visual perfection without golden verification**: Never claim pixel parity without running golden tests under controlled viewport conditions.

---

## 8. Final Quality-Assurance Checklist

Before finalizing any Figma-to-Flutter implementation, verify every item:

- [ ] **Constraint Safety**: No unconstrained flex widgets inside scrollables; no unbounded height errors.
- [ ] **Tokenization**: Zero hardcoded color literals, font family names, or spacing magic numbers.
- [ ] **Typography Parity**: Font size, weight, line-height factor (`height = lh / fs`), and `leadingDistribution: TextLeadingDistribution.even` verified.
- [ ] **Auto Layout Parity**: Spacing, padding (LTRB), primary alignment, and cross alignment match Figma Dev Mode values.
- [ ] **Stroke & Shape Fidelity**: Inside borders match `Border.all`; squircles use `ContinuousRectangleBorder`; shadows match offset, blur, and spread.
- [ ] **Performance Floor**: `const` constructors on all immutable nodes; state isolated to leaf widgets; zero `saveLayer` triggers; images use `cacheWidth`/`cacheHeight`.
- [ ] **Responsive Adaptation**: Layout adapts gracefully from 360dp mobile to 1920dp desktop; content max-width clamped.
- [ ] **Accessibility & Input**: Dynamic text scaling does not clip; touch targets $\ge 48\times 48\text{dp}$; desktop hover cursors and scrollbars verified.
- [ ] **Static Analysis**: `flutter analyze` passes with zero warnings or errors.
- [ ] **Visual Golden Test**: Golden test passes under controlled viewport dimensions and loaded true fonts.
