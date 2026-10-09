# Figma Inspection Protocol & Design Token Extraction

This reference details the systematic extraction of visual parameters, constraints, and tokens from Figma designs (via Dev Mode, JSON export, Figma REST API, or visual inspection) prior to writing Flutter code.

---

## 1. Ordered Extraction Checklist

Inspect Figma nodes in this exact hierarchical sequence:

1. **Canvas & Frame Context**:
   * Frame dimensions (width × height).
   * Frame layout mode (`NONE`, `HORIZONTAL`, `VERTICAL`, `WRAP`).
   * Frame padding (`paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`).
   * Frame gap / spacing (`itemSpacing`, `counterAxisSpacing`).
   * Clipping state (`clipsContent: true/false`).
2. **Auto Layout Alignment & Sizing Modes**:
   * Primary axis alignment (`MIN`, `CENTER`, `MAX`, `SPACE_BETWEEN`).
   * Counter axis alignment (`MIN`, `CENTER`, `MAX`, `BASELINE`, `STRETCH`).
   * Frame resizing rules: Fixed vs. Hug vs. Fill.
   * Child resizing rules:
     * Primary axis: Fixed size vs. Hug contents vs. Fill container (`layoutGrow: 1`).
     * Counter axis: Fixed size vs. Hug contents vs. Fill container (`layoutAlign: STRETCH`).
   * Absolute positioned elements within Auto Layout (`layoutPositioning: ABSOLUTE`).
3. **Geometry, Constraints, & Resizing Limits**:
   * Min / Max widths and heights (`minWidth`, `maxWidth`, `minHeight`, `maxHeight`).
   * Relative constraints for non-Auto Layout nodes (Top/Bottom/Left/Right/Center/Scale).
4. **Visual Styling & Appearance**:
   * Fills: Solid colors, linear/radial/sweep gradients, image fills, fill opacity, fill blend modes.
   * Strokes: Weight, stroke alignment (`INSIDE`, `CENTER`, `OUTSIDE`), dash patterns, join and cap types.
   * Corner Radii: Uniform radius vs. independent corner radii (`topLeft`, `topRight`, `bottomRight`, `bottomLeft`).
   * Corner Smoothing: iOS squircle percentage (0% to 100%).
   * Effects: Drop shadows (X, Y, blur, spread, color, opacity), inner shadows, layer blur, background blur (frosted glass).
5. **Typography Metrics**:
   * Font family and PostScript font name.
   * Font weight (numerical 100–900 or Named: Regular, Medium, SemiBold, Bold, etc.).
   * Font size in logical pixels (`fontSize`).
   * Line height: Exact pixel value (`lineHeightPx`) or percentage (`lineHeightPercent`).
   * Leading distribution: Default centered vertical distribution.
   * Letter spacing: Exact pixels or percentage of font size.
   * Text auto-resize mode: Fixed size (`NONE`), Hug width & height (`WIDTH_AND_HEIGHT`), Hug height / auto-height (`HEIGHT`).
   * Text truncation: Ellipsis (`ENDING`) and max lines.
6. **Icons & Asset Export Formats**:
   * Pure vector icons $\to$ Export as SVG.
   * Photographic content $\to$ Export as PNG/WebP at 1x, 2x, 3x resolutions.
   * Component variants and interactive states (Default, Hover, Pressed, Focused, Disabled, Error).

---

## 2. Dev Mode & Figma API Node Property Mapping

When reading raw Figma JSON (e.g. from Figma REST API or plugin data), map properties directly to Flutter concepts:

```json
{
  "name": "PrimaryButton",
  "type": "FRAME",
  "layoutMode": "HORIZONTAL",
  "primaryAxisAlignItems": "CENTER",
  "counterAxisAlignItems": "CENTER",
  "primaryAxisSizingMode": "AUTO",
  "counterAxisSizingMode": "FIXED",
  "itemSpacing": 8.0,
  "paddingLeft": 16.0,
  "paddingRight": 16.0,
  "paddingTop": 12.0,
  "paddingBottom": 12.0,
  "cornerRadius": 12.0,
  "fills": [
    {
      "type": "SOLID",
      "visible": true,
      "opacity": 1.0,
      "color": { "r": 0.12, "g": 0.45, "b": 0.95, "a": 1.0 }
    }
  ]
}
```

* `layoutMode: HORIZONTAL` $\to$ `Row` (or `Flex(direction: Axis.horizontal)`).
* `primaryAxisAlignItems: CENTER` $\to$ `mainAxisAlignment: MainAxisAlignment.center`.
* `counterAxisAlignItems: CENTER` $\to$ `crossAxisAlignment: CrossAxisAlignment.center`.
* `primaryAxisSizingMode: AUTO` $\to$ `mainAxisSize: MainAxisSize.min` (Hug contents).
* `counterAxisSizingMode: FIXED` $\to$ Fixed cross dimension (e.g., `height: 48.0`).
* `itemSpacing: 8.0` $\to$ `spacing: 8.0` (Flutter 3.27+) or `SizedBox(width: 8.0)`.
* `paddingLeft/Right/Top/Bottom` $\to$ `EdgeInsets.fromLTRB(16, 12, 16, 12)`.
* `color: {r, g, b, a}` $\to$ `Color.from(alpha: 1.0, red: 0.12, green: 0.45, blue: 0.95)` or 32-bit hex `Color(0xFF1E73F2)`.

---

## 3. Systematic Design Token Organization

Extract reusable tokens into a structured Flutter theme extension rather than scattering raw literals across widgets.

### Structure:
1. **Color Tokens**: Surface, OnSurface, Primary, OnPrimary, Secondary, Outline, Error, Neutral variant scales.
2. **Spacing Scale**: 4dp grid standard: `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 48`.
3. **Corner Radii**: `sm: 4`, `md: 8`, `lg: 12`, `xl: 16`, `full: 9999`.
4. **Shadow Elevations**: Low (1-2dp), Medium (4-8dp), High (12-16dp).
5. **Typography Scale**: Display, Headline, Title, Body, Label (Small, Medium, Large).

### Example Token Implementation:

```dart
import 'package:flutter/material.dart';

@immutable
class AppSpacing extends ThemeExtension<AppSpacing> {
  const AppSpacing({
    this.xs = 4.0,
    this.sm = 8.0,
    this.md = 16.0,
    this.lg = 24.0,
    this.xl = 32.0,
  });

  final double xs;
  final double sm;
  final double md;
  final double lg;
  final double xl;

  @override
  AppSpacing copyWith({double? xs, double? sm, double? md, double? lg, double? xl}) {
    return AppSpacing(
      xs: xs ?? this.xs,
      sm: sm ?? this.sm,
      md: md ?? this.md,
      lg: lg ?? this.lg,
      xl: xl ?? this.xl,
    );
  }

  @override
  AppSpacing lerp(ThemeExtension<AppSpacing>? other, double t) {
    if (other is! AppSpacing) return this;
    return AppSpacing(
      xs: xs + (other.xs - xs) * t,
      sm: sm + (other.sm - sm) * t,
      md: md + (other.md - md) * t,
      lg: lg + (other.lg - lg) * t,
      xl: xl + (other.xl - xl) * t,
    );
  }
}
```

---

## 4. Handling Incomplete, Ambiguous, or Missing Specifications

When inspecting Figma files that lack explicit parameters, apply these deterministic engineering fallback rules:

| Ambiguity | Bad Practice (Guessing) | Deterministic Engineering Fallback |
|---|---|---|
| **Missing Tap/Hover State** | Omit interactive feedback or invent arbitrary colors. | Use standard design system opacity state: hover = `fill.withValues(alpha: 0.08)` overlay, pressed = `fill.withValues(alpha: 0.12)` overlay. |
| **Missing Responsive Behavior** | Fix frame to static iPhone width (390px). | Apply `LayoutBuilder`: retain fixed padding, allow primary content containers to expand up to max readable width (e.g. 600dp mobile, 1200dp desktop). |
| **Missing Text Wrap Specs** | Leave text unconstrained (causing overflow). | Check container intent: If label/header, apply `overflow: TextOverflow.ellipsis, maxLines: 1`. If body, wrap in `Expanded` or flex child to allow natural multi-line flow. |
| **Missing Dark Mode Colors** | Guess inverted colors manually. | Verify if Figma Variables define a "Dark" mode. If absent, request token mappings or maintain high-contrast semantic neutral inversions via Material 3 color roles. |
| **Non-standard Font Asset** | Substitute with system font silently. | Flag the missing font family. Use Google Fonts fallback or bundle the exact TTF/OTF asset in `pubspec.yaml` to ensure identical glyph bounding boxes. |
