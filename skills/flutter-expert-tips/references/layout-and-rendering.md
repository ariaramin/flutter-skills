# Layout, Rendering, Images, Scrolling, Animation

## Constraint-first debugging

Remember: **constraints go down, sizes go up, parents set positions**.

For overflow/unbounded errors:

1. identify the first widget with incorrect constraints;
2. inspect its parent constraints;
3. decide whether the child needs a tighter constraint, flex allocation, scrolling, or a different layout primitive;
4. avoid adding arbitrary fixed pixels unless the design truly requires them.

## Fixed width vs responsive content

A source tip recommends `IntrinsicWidth` instead of fixed width so text scaling does not break layout. Preserve the intent—avoid brittle fixed widths—but modernize the rule:

### Preferred order

1. natural constraints / flexible layout;
2. `Flexible` / `Expanded` / `Wrap` / `OverflowBar` / `ConstrainedBox`;
3. component-level `LayoutBuilder` or proportional sizing where appropriate;
4. intrinsic sizing only for small bounded subtrees that genuinely need intrinsic measurement.

`IntrinsicWidth`/`IntrinsicHeight` can perform additional speculative layout and should not be repeated throughout large lists/trees without measurement.

## Row/Column spacing

When the project's Flutter SDK supports native `spacing`, prefer it for uniform gaps. On older SDKs, explicit `SizedBox`/separator patterns are fine. Do not add a third-party “gap” dependency solely for one trivial spacing case unless it is already a project convention.

## Lists and grids

### Small fixed collection

`ListView(children: [...])` is clear and fine.

### Large/unbounded collection

Use lazy builders.

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemTile(item: items[index]),
)
```

Supply stable keys when item identity matters through reorder/insert operations. Consider `findChildIndexCallback`/appropriate delegates for complex reordering/state preservation.

### State in list rows

Do not rely on an offscreen row widget's `State` as the source of truth for durable business state. Lazy lists may destroy/recreate children. Keep durable data outside the row or intentionally opt into keep-alive behavior when justified.

## Nested scrolling

Avoid `shrinkWrap: true` as a reflex. It can force expensive measurement of the scroll contents. Prefer a single scrollable/sliver composition when large lists are nested in a page.

Use `CustomScrollView` + slivers for complex coordinated scrolling (headers, lists, grids, app bars).

## Infinite scrolling / pagination

- request pages before the user reaches the hard end;
- prevent duplicate concurrent page requests;
- stop when end-of-data is known;
- surface retry for failures;
- preserve existing results during next-page loading;
- cancel/ignore obsolete requests when query/filter changes.

## Images

### Decode/display size

Oversized decoded images waste memory/raster bandwidth. Use DevTools diagnostics and request/cache appropriately sized variants where possible.

### Aspect ratio

Use `AspectRatio`, `FittedBox`, `BoxFit`, or known dimensions to avoid layout jumps and distortion.

### Network loading

Retries should be bounded and only used for retryable failures. Avoid infinite retry loops. Consider cache/error placeholders and cancellation when the owning scope disappears.

### SVG/vector assets

Preloading/compiling may remove first-use work, but measure and follow the vector package's current API. Build-time vector compilation is package/tool-version specific.

## Opacity

Fractional `Opacity` can introduce an intermediate buffer. If only one color or image needs alpha, apply alpha directly.

```dart
// Prefer for a color
ColoredBox(color: color.withValues(alpha: 0.5));
```

For animated opacity, use `AnimatedOpacity` for implicit animation or `FadeTransition` when an animation is already owned.

If opacity reaches zero and interaction must stop, add `IgnorePointer`/appropriate visibility semantics.

## Clipping, blur, shadows, gradients

These are valid visual tools, not free effects.

- avoid repeated complex clips/blur in scrolling cells without profiling;
- prefer direct rounded-rectangle painting/layout over unnecessary clip + saveLayer combinations when equivalent;
- keep shader/gradient effects bounded;
- profile raster thread/GPU when visual effects correlate with jank.

## Repaint debugging

Use:

- DevTools performance/repaint tooling;
- `debugRepaintRainbowEnabled` in debug diagnostics;
- paint/debug size visualizations.

A repaint is not automatically bad; optimize only when expensive content repaints unnecessarily.

## Animations

### Prefer implicit animations when

- one/few properties transition from old to new;
- no complex orchestration is needed.

Examples: `AnimatedContainer`, `AnimatedPositioned`, `AnimatedSwitcher`, `AnimatedOpacity`.

### Prefer explicit animation/controller when

- sequencing/reversing/flinging is needed;
- multiple animations coordinate;
- gesture-driven progress is required.

Controllers are resources: dispose them.

## Jitter when swapping widgets

Use stable constraints/`AnimatedSwitcher`/consistent sizing when alternate widgets have different dimensions and the product expects a smooth transition. Do not hide genuine content-size changes with forced dimensions that break accessibility.
