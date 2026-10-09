# Production Flutter Performance Engineering

This reference details the mechanics of Flutter's rendering pipeline and provides concrete guidelines for optimizing layout passes, paint operations, compositing, rebuild boundaries, and memory consumption when implementing designs.

---

## 1. The Rendering Pipeline & Execution Phases

Every visual frame in Flutter proceeds through four distinct pipeline phases:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Build     │ ──> │ 2. Layout    │ ──> │ 3. Paint     │ ──> │ 4. Composite │
│ Widget/Elem  │     │ Constraints  │     │ DisplayList  │     │ Layer Tree & │
│ Creation     │     │ & Sizing     │     │ Recording    │     │ GPU Raster   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Build (`Widget` & `Element`)**:
   * Evaluates `Widget.build()` methods.
   * `const` constructors allow Flutter to short-circuit rebuilding identical widgets because the instance references match (`identical(oldWidget, newWidget)`).
2. **Layout (`RenderObject.performLayout`)**:
   * Constraints flow down; sizes flow up; parent sets offsets.
   * Occurs only when layout constraints change or `markNeedsLayout()` is called on a dirty RenderObject.
3. **Paint (`RenderObject.paint`)**:
   * Records canvas commands into an SkPicture / DisplayList.
   * Repaints only when visual properties change (color, shadow, border) without changing dimensions.
4. **Compositing & Rasterization**:
   * Assembles layer tree into a GPU scene.
   * Rasterizer (Impeller / Skia) executes GPU instructions.

---

## 2. Rebuild Minimization & State Boundaries

### The Helper Method Anti-Pattern
**Anti-Pattern**: Using helper methods (`Widget _buildHeader()`) inside a parent widget.
* *Why it hurts*: When the parent rebuilds (e.g., animation tick, state update), all helper methods execute unconditionally, dirtying their subtrees even if their parameters did not change.
* *Solution*: Extract into dedicated `StatelessWidget` classes with `const` constructors.

```dart
// ❌ ANTI-PATTERN: Rebuilds entire header whenever parent state updates
Widget _buildHeader(String title) {
  return Row(
    children: [Text(title), const Icon(Icons.arrow_forward)],
  );
}

// ✅ PRODUCTION: Rebuild-isolated, const-cached
class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({super.key, required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [Text(title), const Icon(Icons.arrow_forward)],
    );
  }
}
```

### Localized State Boundaries
Never update full page state for localized interactions (e.g. text field focus, checkbox toggle, button loading state). Keep state in the lowest leaf widget using `ValueNotifier`, `StatefulWidget`, or a scoped state controller.

---

## 3. Relayout & Repaint Boundaries

### Relayout Boundaries
A RenderObject becomes an `isRelayoutBoundary` when:
1. `parentUsesSize == false` (parent does not depend on child's size to lay itself out).
2. `constraints.isTight` (width and height are strictly fixed, e.g., via `SizedBox(width: 100, height: 100)`).
3. `sizedByParent == true`.

*Rule*: To prevent an animating child from triggering relayout up to the root scaffold, enclose it in a widget with tight constraints (`SizedBox(width: w, height: h)`).

### Repaint Boundaries (`RepaintBoundary`)
A `RepaintBoundary` creates an independent `OffsetLayer`. When its child repaints, the parent and sibling widgets are skipped.

*When to use*:
* Complex static subtrees adjacent to rapidly animating widgets (e.g., ticking countdowns, loading spinners).
* Heavy canvas drawings (`CustomPaint`).
* High-complexity scroll items (complex cards with multiple drop shadows).

*When NOT to use*:
* On tiny, cheap widgets (e.g., a simple `Text` or `Icon`). Creating an `OffsetLayer` consumes GPU texture memory.

```dart
RepaintBoundary(
  child: AnimatedLoadingIndicator(),
)
```

---

## 4. Eliminating Offscreen Buffers (`saveLayer`)

Calling `canvas.saveLayer` forces the GPU to allocate a temporary offscreen buffer, render into it, and copy it back to the frame buffer. This causes severe fill-rate bottlenecks and frame drops.

### Triggers of `saveLayer` and How to Avoid Them:

1. **`Opacity` Widget on Multi-Child Trees**:
   * ❌ `Opacity(opacity: 0.5, child: Row(...))` $\to$ Triggers `saveLayer`.
   * ✅ If setting opacity on colors, apply directly: `color.withValues(alpha: 0.5)`.
   * ✅ If fading a single image: use `Image.asset(..., color: Colors.white.withValues(alpha: 0.5), colorBlendMode: BlendMode.modulate)`.
2. **Aggressive Clipping**:
   * ❌ `Clip.antiAliasWithSaveLayer` forces a save layer pass on every frame.
   * ✅ Use `Clip.antiAlias` or `Clip.hardEdge`.
   * ✅ Better: avoid clipping altogether when content fits within bounds or when shape decoration can handle corner radius directly.
3. **`ShaderMask` and `ColorFiltered`**:
   * Use only when strictly necessary, and wrap in a `RepaintBoundary` so the layer is cached.

---

## 5. Preventing the Intrinsic Layout Hazard

`IntrinsicHeight` and `IntrinsicWidth` evaluate child layout constraints speculatively with **$O(N^2)$ algorithmic complexity**.

*Rule*:
* **Permitted**: Shallow, fixed horizontal rows (e.g. `Row` with 2 buttons separated by a `VerticalDivider`).
* **Strictly Prohibited**: Deep widget trees, dynamic lists, scrolling viewports, or high-cardinality components.
* *Alternative*: Use explicit constraints, flex proportions (`Expanded`), or `CustomMultiChildLayout`.

---

## 6. Image Decoding & Bitmap Memory Management

Unoptimized images cause Out-Of-Memory (OOM) crashes and frame jank during decoding.

* **The Problem**: A 4000×3000 camera asset displayed in a 100×100 avatar still decodes to $4000 \times 3000 \times 4 \text{ bytes} \approx 48 \text{ MB}$ of uncompressed RAM.
* **The Rule**: Always specify `cacheWidth` and `cacheHeight` on `Image.asset` or `ResizeImage`:

```dart
Image.asset(
  'assets/images/user_avatar.png',
  width: 48.0,
  height: 48.0,
  // Decode at exact physical display resolution (logical * DPR)
  cacheWidth: (48.0 * MediaQuery.devicePixelRatioOf(context)).round(),
  cacheHeight: (48.0 * MediaQuery.devicePixelRatioOf(context)).round(),
  fit: BoxFit.cover,
)
```

---

## 7. Lazy Scrollables & Viewports

* For dynamic or lists with $>10$ items: **Never** use `SingleChildScrollView(child: Column(children: ...))` or `ListView(children: ...)`. These instantiate every child eagerly into memory.
* **Always use**: `ListView.builder`, `GridView.builder`, or `CustomScrollView` with `SliverList.builder`.
* Specify `itemExtent` or `prototypeItem` on `ListView.builder` whenever item heights are uniform to skip item layout measurements during scrolling.

---

## 8. Profiling & DevTools Verification

Never assume an optimization improves performance without profiling in **Profile Mode**:

```bash
flutter run --profile
```

### DevTools Diagnostic Workflow:
1. **Frame Time Analysis**: Open the Flutter DevTools Performance tab. Inspect UI thread time vs. Raster thread time against the 16.6ms (60 FPS) / 8.3ms (120 FPS) budget.
2. **Track Widget Rebuilds**: Enable "Track widget rebuilds" in DevTools to identify subtrees that rebuild unnecessarily on state changes.
3. **Highlight Repaints**: Toggle `debugRepaintRainbowEnabled = true` or use DevTools "Highlight repaints" to verify that repaint boundaries isolate animating elements.
4. **Inspect Offscreen Layers**: Toggle `debugDisableClipLayers = true` or `debugDisablePhysicalShapeLayers = true` to isolate GPU raster costs.
