# Figma Design to Flutter Widget Mapping Matrix & Decision Rules

This reference defines the deterministic mapping from Figma design elements, Auto Layout configurations, and visual styling properties to Flutter widgets and layout trees.

---

## 1. Auto Layout to Flutter Layout Mapping

### Axis & Flow

| Figma Auto Layout Property | Figma Value | Flutter Equivalent | Implementation Notes |
|---|---|---|---|
| **Layout Direction** | `HORIZONTAL` | `Row(...)` | Main axis: X, Cross axis: Y. If direction dynamic: `Flex(direction: Axis.horizontal)`. |
| | `VERTICAL` | `Column(...)` | Main axis: Y, Cross axis: X. If direction dynamic: `Flex(direction: Axis.vertical)`. |
| | `WRAP` | `Wrap(...)` | Flows children over multiple runs using `spacing` and `runSpacing`. |
| **Primary Axis Alignment** | `MIN` (Start / Top / Left) | `mainAxisAlignment: MainAxisAlignment.start` | Default for `Row` and `Column`. |
| | `CENTER` | `mainAxisAlignment: MainAxisAlignment.center` | Centers children along the layout axis. |
| | `MAX` (End / Bottom / Right) | `mainAxisAlignment: MainAxisAlignment.end` | Packs children at the end of the layout axis. |
| | `SPACE_BETWEEN` | `mainAxisAlignment: MainAxisAlignment.spaceBetween` | Spaces children evenly without end spacing. |
| **Counter Axis Alignment** | `MIN` (Start) | `crossAxisAlignment: CrossAxisAlignment.start` | Aligns children to top (Row) or left (Column). |
| | `CENTER` | `crossAxisAlignment: CrossAxisAlignment.center` | Default. Centers children across layout axis. |
| | `MAX` (End) | `crossAxisAlignment: CrossAxisAlignment.end` | Aligns children to bottom (Row) or right (Column). |
| | `BASELINE` | `crossAxisAlignment: CrossAxisAlignment.baseline`, `textBaseline: TextBaseline.alphabetic` | Requires explicit `textBaseline`. |
| | `STRETCH` | `crossAxisAlignment: CrossAxisAlignment.stretch` | Forces children to match parent cross-axis extent. |

---

## 2. Sizing Modes & Constraint Translation

### Parent Sizing Modes
* **Fixed Width / Height**: Wrap parent in `SizedBox(width: w, height: h)` or assign tight constraints via parent.
* **Hug Contents**:
  * Primary axis: Set `mainAxisSize: MainAxisSize.min` on `Row` or `Column`.
  * Counter axis: Flex automatically sizes to the largest child on the counter axis unless `CrossAxisAlignment.stretch` is specified.
* **Fill Container**:
  * In flex parent: Wrap child in `Expanded` or `Flexible(fit: FlexFit.tight)`.
  * Outside flex parent: Use `width: double.infinity` or `SizedBox.expand()`.

### Child Resizing inside Auto Layout
* **Child Primary Axis**:
  * `FIXED`: Set explicit width (in Row) or height (in Column) via `SizedBox(width: w)` or `SizedBox(height: h)`.
  * `HUG`: Allow child to size itself based on intrinsic content.
  * `FILL` (`layoutGrow: 1`): Wrap child in `Expanded(child: ...)`. If proportional sizing needed (e.g. 2x space): `Expanded(flex: 2, child: ...)`.
* **Child Counter Axis**:
  * `FIXED`: Child specifies explicit cross dimension.
  * `HUG`: Child sizes itself intrinsically.
  * `FILL` (`layoutAlign: STRETCH`): Parent uses `crossAxisAlignment: CrossAxisAlignment.stretch` or child uses `FractionallySizedBox(widthFactor: 1.0)`.

### Min / Max Constraints
* Figma `minWidth`, `maxWidth`, `minHeight`, `maxHeight`:
  ```dart
  ConstrainedBox(
    constraints: BoxConstraints(
      minWidth: 120.0,
      maxWidth: 360.0,
      minHeight: 48.0,
      maxHeight: 72.0,
    ),
    child: child,
  )
  ```

---

## 3. Gap & Item Spacing

* **Flutter 3.27+ (Recommended)**: Use native `spacing` on `Row`, `Column`, and `Flex`:
  ```dart
  Row(
    spacing: 12.0, // Native gap between all direct children
    children: [
      WidgetA(),
      WidgetB(),
      WidgetC(),
    ],
  )
  ```
* **Pre-3.27 Fallback**: Explicit `SizedBox(width: gap)` or `SizedBox(height: gap)` between items.
* **Wrap Spacing**: In `Wrap`, `spacing` is the gap along the main axis inside a run. `runSpacing` is the gap between runs. Figma `counterAxisSpacing` maps to `runSpacing`.

---

## 4. Absolute Positioning in Auto Layout

When a Figma layer inside Auto Layout has `layoutPositioning: ABSOLUTE`:
* Wrap the Auto Layout container in a `Stack`.
* Place the regular Auto Layout children in the base flow.
* Overlay the absolute element using `Positioned`:
  ```dart
  Stack(
    clipBehavior: Clip.none,
    children: [
      // Auto Layout Base Frame
      Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          spacing: 8.0,
          children: [...],
        ),
      ),
      // Absolute positioned badge or action
      Positioned(
        top: -4.0,
        right: -4.0,
        child: NotificationBadge(),
      ),
    ],
  )
  ```

---

## 5. Visual Styling Translation

### Strokes & Borders
* **Inside Stroke (`INSIDE`)**:
  Default in Flutter's `Border.all`. Border drawn inside the bounding box:
  ```dart
  DecoratedBox(
    decoration: BoxDecoration(
      border: Border.all(color: AppColors.outline, width: 1.5),
      borderRadius: BorderRadius.circular(12.0),
    ),
    child: child,
  )
  ```
* **Center Stroke (`CENTER`)**:
  `Border.all(strokeAlign: BorderSide.strokeAlignCenter)` when the border color is uniform. The stroke straddles the edge and can be clipped by a parent.
* **Outside Stroke (`OUTSIDE`)**:
  `Border.all(strokeAlign: BorderSide.strokeAlignOutside)` when the border color is uniform. Flutter does not grow the layout box to contain it. A parent clip will cut it off. Figma `strokesIncludedInLayout` decides whether the design size already includes that stroke.

### Corner Radius & Smoothing (Squircle)
* **Standard Uniform Radius**: `BorderRadius.circular(16.0)`
* **Independent Corner Radii**:
  `BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(4), ...)`
* **Corner Smoothing**:
  `cornerSmoothing` of 0 is a circular corner: `BorderRadius.circular`. A value of 0.6 is Figma's iOS 7 squircle. `ContinuousRectangleBorder` has no smoothing parameter and Flutter does not document it as that curve. Try it only when smoothing is near 0.6, and compare. Do not replace circular radii with it.

### Shadows & Visual Effects
* **Drop Shadow**:
  Figma parameters `(X, Y, Blur, Spread, Color, Opacity)` map directly:
  ```dart
  BoxDecoration(
    boxShadow: [
      BoxShadow(
        offset: const Offset(0.0, 4.0), // X = 0, Y = 4
        blurRadius: 12.0,               // Blur
        spreadRadius: -2.0,             // Spread
        color: const Color(0xFF000000).withValues(alpha: 0.08), // Color + Opacity
      ),
    ],
  )
  ```
* **Inner Shadow**:
  Not supported directly in `BoxDecoration`. Implement via custom `CustomPainter` or a specialized clipped inner shadow.
* **Background Blur (Frosted Glass / Glassmorphism)**:
  Requires `ClipRRect` and `BackdropFilter`:
  ```dart
  ClipRRect(
    borderRadius: BorderRadius.circular(16.0),
    child: BackdropFilter(
      filter: ui.ImageFilter.blur(sigmaX: 10.0, sigmaY: 10.0),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
        ),
        child: child,
      ),
    ),
  )
  ```

### Gradients
Map Figma gradient handle coordinates `(x, y)` from 0.0–1.0 to Flutter `Alignment(x * 2 - 1, y * 2 - 1)`:
* Top-to-Bottom: `begin: Alignment.topCenter, end: Alignment.bottomCenter`
* Left-to-Right: `begin: Alignment.centerLeft, end: Alignment.centerRight`
* Diagonal (45°): `begin: Alignment.topLeft, end: Alignment.bottomRight`

---

## 6. Widget Selection Decision Ladder

Follow the senior engineering optimization ladder (from lightest specialized widget to full container):

```
                        What visual property is needed?
                                       │
     ┌───────────────────┬─────────────┼─────────────┬──────────────────┐
     ▼                   ▼             ▼             ▼                  ▼
Solid Color Only    Insets Only   Size Bounds   Decoration Only   Combined Styling
     │                   │             │             │                  │
ColoredBox            Padding       SizedBox     DecoratedBox       Container
(Zero paint overhead)               (Tight)      (Border/Shadow/    (Combines padding,
                                 ConstrainedBox   Radius/Gradient)   margins, decorations)
                                    (Min/Max)
```

1. **`ColoredBox` vs. `Container`**: If a widget only renders a solid background color, use `ColoredBox`. It bypasses `BoxPainter` entirely and uses `RenderColoredBox`.
2. **`DecoratedBox` vs. `Container`**: If a widget needs borders, border radius, shadows, or gradients without insetting, use `DecoratedBox`.
3. **`Padding` vs. `Container`**: If an element only adds layout spacing around a child, use `Padding`.
4. **`SizedBox` vs. `Container`**: If an element only enforces width/height, use `SizedBox`.
5. **`Container`**: Use when combining 2 or more of: margin, padding, decoration, and constraints.
