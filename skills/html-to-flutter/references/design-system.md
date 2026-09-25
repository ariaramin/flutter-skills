# Design tokens, theming, styling, and typography

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- Design Token Extraction
  - Extract
  - Token naming
- Flutter Theme Construction
  - Canonical theme pattern
  - Interaction states
- Styling Conversion
  - Backgrounds
  - Borders and radius
  - Shadows
  - Opacity
  - Clipping
  - Transforms
  - Hover/focus/disabled
- Typography
  - Mapping
  - Text scaling
  - Rich text
  - Pixel fidelity limitations

## Design Token Extraction

Before implementing components, transform repeated CSS values into a Flutter design system.

### Extract

#### Colors

From:

```
:root {
  --color-primary: #4f46e5;
  --color-surface: #ffffff;
  --color-danger: #dc2626;
}

```

Create semantic tokens, not CSS variable replicas:

```
primary
onPrimary
surface
onSurface
surfaceContainer
error
outline
success
warning

```

Material applications should map applicable semantic colors into `ColorScheme`.

#### Typography

Extract:

- font families;
- weights;
- body sizes;
- heading sizes;
- line-height relationships;
- letter spacing;
- emphasis variants.

Map application roles into `TextTheme` rather than naming styles after raw CSS selectors.

#### Spacing

Instead of:

```
5, 7, 11, 13, 17, 19, 23...

```

identify the source rhythm:

```
static const xs = 4.0;
static const sm = 8.0;
static const md = 16.0;
static const lg = 24.0;
static const xl = 32.0;

```

Only normalize values where the source system actually exhibits a repeatable scale. Preserve intentional exceptions.

#### Radius

```
small control
standard card
large surface
pill

```

#### Elevation/shadows

Convert the design intent, not CSS shadow syntax.

A web shadow may need tuning because Flutter's rendering and the target platform differ.

#### Breakpoints

Store shell-level breakpoints centrally only if multiple features intentionally share them. Component-specific responsive thresholds can remain with their component.

### Token naming

Prefer semantic names:

```
surfaceDanger
contentMuted
spacingCard
radiusControl

```

over source implementation names:

```
gray600
margin17
borderRadius6

```

when semantic naming improves maintainability.

---

## Flutter Theme Construction

Use current theme APIs and Material 3 patterns for Material applications. Material 3 has been the default Material design generation in modern Flutter, and current `ThemeData` centers styling around `ColorScheme`, `TextTheme`, and component themes.

Use `ThemeExtension` for application-specific design tokens that do not naturally belong to Material theme fields.

### Canonical theme pattern

```
import 'package:flutter/material.dart';

@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.spacingSm,
    required this.spacingMd,
    required this.spacingLg,
    required this.cardRadius,
  });

  final double spacingSm;
  final double spacingMd;
  final double spacingLg;
  final BorderRadius cardRadius;

  static const light = AppTokens(
    spacingSm: 8,
    spacingMd: 16,
    spacingLg: 24,
    cardRadius: BorderRadius.all(Radius.circular(16)),
  );

  @override
  AppTokens copyWith({
    double? spacingSm,
    double? spacingMd,
    double? spacingLg,
    BorderRadius? cardRadius,
  }) {
    return AppTokens(
      spacingSm: spacingSm ?? this.spacingSm,
      spacingMd: spacingMd ?? this.spacingMd,
      spacingLg: spacingLg ?? this.spacingLg,
      cardRadius: cardRadius ?? this.cardRadius,
    );
  }

  @override
  AppTokens lerp(covariant AppTokens? other, double t) {
    if (other == null) return this;
    return AppTokens(
      spacingSm: spacingSm + (other.spacingSm - spacingSm) * t,
      spacingMd: spacingMd + (other.spacingMd - spacingMd) * t,
      spacingLg: spacingLg + (other.spacingLg - spacingLg) * t,
      cardRadius: BorderRadius.lerp(cardRadius, other.cardRadius, t)!,
    );
  }
}

ThemeData buildLightTheme() {
  const colorScheme = ColorScheme.light(
    primary: Color(0xFF4F46E5),
    onPrimary: Colors.white,
    surface: Color(0xFFF8FAFC),
    onSurface: Color(0xFF0F172A),
    error: Color(0xFFB91C1C),
    onError: Colors.white,
  );

  final base = ThemeData.from(
    colorScheme: colorScheme,
    useMaterial3: true,
  );

  return base.copyWith(
    scaffoldBackgroundColor: colorScheme.surface,
    textTheme: base.textTheme.copyWith(
      headlineLarge: base.textTheme.headlineLarge?.copyWith(
        fontWeight: FontWeight.w700,
        height: 1.1,
      ),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(height: 1.5),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
    ),
    extensions: const <ThemeExtension<dynamic>>[
      AppTokens.light,
    ],
  );
}

```

### Interaction states

Current Flutter APIs use `WidgetState`/`WidgetStateProperty` rather than the older `MaterialState` terminology. The rename landed in modern Flutter and new code should use the current APIs.

Example:

```
final buttonStyle = ButtonStyle(
  backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
    if (states.contains(WidgetState.disabled)) {
      return Colors.grey.shade300;
    }
    if (states.contains(WidgetState.hovered)) {
      return const Color(0xFF4338CA);
    }
    return const Color(0xFF4F46E5);
  }),
);

```

Do not introduce deprecated `Color.withOpacity` in new code. Current APIs provide `withValues(alpha: ...)`.

---

## Styling Conversion

### Backgrounds

```
background: #fff;

```

→ `ColoredBox` if color is the only requirement.

```
const ColoredBox(
  color: Colors.white,
  child: Content(),
)

```

For gradients, images, borders, radius, or shadows use a `Decoration`, commonly `BoxDecoration`.

### Borders and radius

```
DecoratedBox(
  decoration: BoxDecoration(
    border: Border.all(color: const Color(0xFFE2E8F0)),
    borderRadius: BorderRadius.circular(12),
  ),
  child: const Padding(
    padding: EdgeInsets.all(16),
    child: Content(),
  ),
)

```

### Shadows

Convert visual intent, then verify against the reference. Browser and Flutter shadow rendering can differ.

Avoid creating many large, blurred, animated shadows without profiling.

### Opacity

Prefer directly encoding alpha into colors when the entire subtree does not need composited opacity:

```
color.withValues(alpha: 0.12)

```

Use `Opacity` when actual subtree opacity is required.

### Clipping

Do not clip simply because content appears inside rounded decoration. Clip only when descendants must be physically cut to the shape.

### Transforms

Map CSS transforms to Flutter `Transform` when the effect belongs to painting/interaction geometry.

If the transformation is part of layout, prefer normal layout widgets.

### Hover/focus/disabled

First ask whether a built-in control's state system already handles the requirement.

For a button, prefer:

```
FilledButton(
  style: ButtonStyle(
    overlayColor: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.hovered)) {
        return Colors.white.withValues(alpha: 0.08);
      }
      return null;
    }),
  ),
  onPressed: enabled ? onPressed : null,
  child: const Text('Continue'),
)

```

For custom non-button interactive regions use appropriate focus, hover, gesture, keyboard, and semantics APIs together.

---

## Typography

### Mapping

| CSS typographyFlutter     |                                                       |
| ------------------------- | ----------------------------------------------------- |
| `font-family`             | `TextStyle.fontFamily`, declared assets/system family |
| fallback stack            | `fontFamilyFallback` where appropriate                |
| `font-weight`             | `FontWeight`                                          |
| `font-size`               | `fontSize`                                            |
| `line-height`             | `TextStyle.height`                                    |
| `letter-spacing`          | `letterSpacing`                                       |
| `word-spacing`            | `wordSpacing`                                         |
| `text-align`              | `textAlign`                                           |
| `text-decoration`         | `decoration`                                          |
| line clamp                | `maxLines` + `overflow`                               |
| `white-space`/wrap intent | `softWrap`, `maxLines`, constraints                   |
| inline styles             | `TextSpan`/`RichText`                                 |

`TextStyle.height` is a multiplier of font size, not the browser CSS declaration copied verbatim without interpretation.

### Text scaling

Do not:

- freeze font size according to screenshot pixels;
- disable scaling;
- force text into fixed-height cards without testing larger scales.

Modern Flutter exposes `TextScaler`; new implementations should use current text-scaling APIs rather than deprecated `textScaleFactor` patterns.

### Rich text

Use `Text.rich` or `RichText` when a paragraph has multiple inline styles.

Use `SelectableText` or wrap document-like regions in `SelectionArea` when users should be able to select text, particularly on Web and desktop.

### Pixel fidelity limitations

Do not promise perfect browser-to-Flutter glyph equivalence.

Differences can arise from:

- actual installed font files;
- fallback fonts;
- font hinting;
- engine/platform rasterization;
- font version;
- browser behavior;
- text scaling;
- antialiasing;
- line-breaking metrics.

For visual validation:

1. confirm the exact font;
2. declare correct weights/styles;
3. compare line height and letter spacing;
4. compare text box width;
5. verify fallback behavior;
6. classify small glyph raster differences as platform rendering differences rather than forcing harmful layout hacks.

---
