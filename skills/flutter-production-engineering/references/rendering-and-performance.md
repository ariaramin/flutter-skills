# Rendering, Profiling, and Performance Playbook

This guide covers painting, image optimization, animation pipelines, DevTools profiling, startup acceleration, and release binary tuning for production Flutter applications.

---

## 1. Painting and Rendering Performance

### Rebuild, Repaint, and Raster Are Distinct Costs
- **Rebuild (Dart/UI isolate)**: Dirty elements invoke widget `build()` methods to construct new widget trees.
- **Layout (Render tree)**: Render objects compute sizing and positioning based on constraints.
- **Paint (Render tree)**: Render objects record drawing instructions into `PictureLayer` / display lists.
- **Compositing**: Layer trees are assembled into scenes.
- **Rasterization (Engine/GPU)**: The Flutter engine converts display lists and scenes into physical GPU pixels.

If widget builds are cheap (e.g., 1–2 ms) but raster time is slow (e.g., 25 ms), optimizing widget rebuilding or adding state selectors will not fix the frame drops. You must investigate visual drawing operations.

### Isolating Repaint Frequencies with `RepaintBoundary`
A `RepaintBoundary` instructs the framework to create a separate `OffsetLayer` and record drawing commands into an isolated display list.

**When it helps:**
- A complex, expensive-to-paint subtree is visually static while its parent or sibling repaints frequently (e.g., a static background behind a spinning progress indicator or scrolling feed).
- When scrolling, isolating items prevents repainting the entire viewport.

**When it hurts or does nothing:**
- The bounded subtree repaints at the same frequency as its surroundings.
- Placed indiscriminately around tiny, cheap widgets (e.g., wrapping simple `Text` or `Icon` widgets), which creates unnecessary layer allocation, compositing overhead, and GPU memory consumption.
- Use DevTools Repaint Rainbow / Repaint Visualization to confirm repaint boundaries actually prevent paints.

### Custom Painting (`CustomPainter`)
- **Deterministic paint**: `paint(Canvas canvas, Size size)` must produce identical output for identical inputs.
- **Accurate `shouldRepaint`**: Never return `true` unconditionally. Compare old and new painter delegates using visual property equality.
- **Bypass widget build/layout with Listenable**: Pass a `Listenable` (e.g., `AnimationController` or `ValueNotifier`) directly to `super(repaint: controller)`. When the controller ticks, Flutter repaints the `CustomPainter` directly without rebuilding the enclosing widget or re-running layout.
- **Provide semantics**: Implement `semanticsBuilder` or wrap custom graphics with `CustomPaint(child: Semantics(...))` so screen readers can announce visual content.

### Avoiding Unnecessary Save-Layer Effects (`saveLayer`)
`Canvas.saveLayer` and widgets that invoke it (such as certain opacity modes, complex clipping, and blend modes) allocate an offscreen texture buffer, redirect rendering to it, and composite it back. This causes GPU render-target switching and memory bandwidth pressure.

**High-cost triggers:**
- `Clip.antiAliasWithSaveLayer`: Never use unless antialiasing artifacts without it are visually intolerable. Prefer `Clip.antiAlias` or `Clip.hardEdge`.
- Deeply nested or chained `BackdropFilter` widgets.
- Complex shader masks or blend modes applied over dynamically scrolling surfaces.
- Verify `saveLayer` counts using the DevTools Performance overlay or raster timeline events (`SaveLayer` markers).

### Opacity Strategies
- **Animating opacity**: Never rebuild an ordinary `Opacity` widget with a new value every tick in `AnimatedBuilder`.
- **Implicit transition**: Use `AnimatedOpacity`.
- **Explicit controller**: Use `FadeTransition` (which manipulates layer opacity directly without widget tree rebuilding).
- **Direct color/alpha**: When fading a single container, icon, or text, apply alpha directly to the `Color` (e.g., `color.withValues(alpha: 0.5)`) or image decoration instead of wrapping with an `Opacity` widget.
- **When true Opacity is needed**: Keep `Opacity` only when multiple overlapping children must blend together as a group before blending into the background.

### Transforms
- A `Transform` widget or `TransformLayer` alters painting coordinates without causing the child or parent to re-layout.
- Use paint transforms for visual movement, scale, or rotation animations when layout dimensions should remain unchanged.
- Do not use transforms when the surrounding layout is expected to reflow around the transformed boundaries.

---

## 2. Image and Asset Optimization

### Decoded Memory Cost vs. File Size
A compressed image file (e.g., 200 KB WebP/JPEG) does not represent its in-memory footprint. Once decoded, uncompressed RGBA pixel buffers consume:
$$\text{Memory} = \text{Width} \times \text{Height} \times 4\text{ bytes}$$

A 4000×3000 photo consumes **48 MB of RAM** when decoded at full resolution, even if displayed in a 100×100 thumbnail tile!

### Constraining Decoded Dimensions
Always decode images near their actual displayed logical size multiplied by device pixel ratio:
- `Image.asset('...', cacheWidth: targetWidthPx, cacheHeight: targetHeightPx)`
- `ResizeImage(imageProvider, width: targetWidthPx, height: targetHeightPx)`
- Use CDN or backend resizing query parameters (e.g., `?w=300&h=300&fit=crop`) for network images whenever available.

### Bounding Displayed Layout Dimensions
For network images whose download is asynchronous:
- Always wrap in a widget with explicit or bounded constraints (e.g., `SizedBox`, `AspectRatio`, or fixed layout).
- Unconstrained image loading causes layout reflows and cumulative layout shifts (CLS) when dimensions resolve.

### Web Image Differences
- On Flutter Web, `Image.network` decode-size hints (`cacheWidth`/`cacheHeight`) are not applied identically because image decoding is delegated to the browser engine or CanvasKit/SkWasm codecs.
- Web images are subject to Cross-Origin Resource Sharing (CORS). Images loaded without appropriate CORS headers cannot be rendered into CanvasKit/HTML renderers without proxying or cross-origin headers.
- `Image.file` does not exist on the Web platform.

### Precaching Strategy
- Use `precacheImage(imageProvider, context)` selectively for critical, imminent visual assets (e.g., onboarding hero image or bottom bar icons).
- Never batch-precache hundreds of feed images at startup. This wastes cellular data, saturates the image cache, and spikes startup memory.

### Animated Images (GIF, WebP, Lottie)
- Multi-frame animated images keep decoded frame buffers in memory or continuously decompress frames, driving both CPU and GPU consumption.
- Profile animated imagery in feeds; pause playback when scrolled offscreen.
- Respect `MediaQuery.disableAnimationsOf(context)` to pause or hide animated loops for users requesting reduced motion.

---

## 3. Animation Performance

### Choosing the Animation Primitive
1. **Implicit Animations (`AnimatedContainer`, `AnimatedOpacity`, `AnimatedPadding`, `TweenAnimationBuilder`)**:
   - Ideal for property transitions driven by state changes.
   - Minimal boilerplate, automatic controller lifecycle management.
2. **Explicit Animations (`AnimationController`, `CurvedAnimation`)**:
   - Required for choreography, coordinated sub-animations, repeating/reversing playback, or manual gesture-coupled playback.
   - Always instantiate in `initState` and call `dispose()` in `State.dispose()`.
3. **Painter-Driven Animations (`CustomPainter` + repaint `Listenable`)**:
   - Ideal for continuous particle systems, audio waveforms, or high-frequency custom charts.
   - Bypasses widget rebuild and layout entirely.

### Protecting Stable Subtrees
Always extract static parts of the animated widget into the `child` argument of builder widgets:
```dart
AnimatedBuilder(
  animation: _controller,
  child: const ExpensiveStaticCard(), // Constructed once, never rebuilt on tick
  builder: (context, child) {
    return Transform.scale(
      scale: _scaleAnimation.value,
      child: child, // Reused identical instance
    );
  },
);
```

### Layout Animations vs. Paint Animations
- Animating layout properties (`width`, `height`, `margin`, `padding`) triggers layout and paint passes on every frame for the animated widget and its ancestors/descendants.
- If the visual effect can be accomplished via `Transform.scale`, `Transform.translate`, or `Matrix4`, prefer paint transforms to preserve 120 Hz/60 Hz frame budgets without triggering relayout.

---

## 4. DevTools and Performance Profiling

### Profile Mode is Mandatory
- **Never profile in Debug mode**: JIT compilation, checked assertions, debug banner, observatory service extensions, and missing compiler optimizations introduce severe synthetic latency.
- Run on a physical target: `flutter run --profile`.
- On Flutter Web, use browser DevTools (Performance timeline, memory heap snapshots) alongside Flutter DevTools.

### Diagnosing UI-Thread vs. Raster-Thread Bottlenecks

| Pipeline Stage | DevTools Indicator | Typical Root Causes | Diagnostic & Remediation |
| :--- | :--- | :--- | :--- |
| **UI Thread / Dart isolate** | Cyan frame bars exceed budget; CPU profiler shows long Dart call stacks. | Heavy parsing in `build()`, synchronous JSON decoding, deep widget hierarchy rebuilds, intrinsic layout passes (`IntrinsicHeight`). | Profile with CPU Profiler and Timeline events; move CPU work to `Isolate.run`; cache view model computations; eliminate intrinsics. |
| **Raster Thread / GPU** | Red/amber frame bars exceed budget; UI thread is fast (1–2 ms) but total frame time drops. | Excessive `saveLayer` calls, large decoded bitmaps, expensive blur/backdrop filters, complex path clipping (`antiAliasWithSaveLayer`). | Enable "Highlight repaints" and "Highlight layers"; reduce image decode sizes (`cacheWidth`); eliminate full-screen blur filters during active scrolling. |

### Investigating Excessive Rebuilds
1. In Flutter DevTools, open the **Performance** tab and enable **Track Widget Builds**.
2. Trigger the interaction (e.g., tap a button or type into a text field).
3. Inspect which widgets rebuilt and their rebuild counts.
4. If a top-level screen widget rebuilt for a small local change, localize state observation downwards using `ValueListenableBuilder`, `ListenableBuilder`, or scoped selectors.

### Investigating Excessive Layout
1. Enable **Track Layouts** in DevTools.
2. Watch for:
   - Repeated layout passes on the same element within a single frame.
   - Multiple intrinsic passes caused by `IntrinsicHeight` or `IntrinsicWidth`.
   - `shrinkWrap: true` on scrollables forcing extent recomputations.
3. Replace intrinsics with explicit constraints, aspect ratios, or custom multi-child layout delegates where appropriate.

### Memory Leak and Bloat Analysis
1. Open the **Memory** tab in DevTools.
2. Take an initial Heap Snapshot.
3. Perform the suspected leaky workflow (e.g., push screen, interact, pop screen).
4. Run Garbage Collection (trash can icon) and take a second Heap Snapshot.
5. Use **Snapshot Diffing** to view retained instances between snapshots.
6. If objects remain (e.g., 10 instances of `_MyScreenState`), click the class and inspect the **Retaining Path**:
   - Is a closure retaining `BuildContext`?
   - Is a `ChangeNotifier` still holding a listener that was not removed?
   - Did a global singleton or stream subscription hold onto the controller?

### Tracing Overhead Caution
Detailed rebuild and layout tracking adds instrumentation cost to Dart execution. Use it to identify specific culprits, but do not measure raw millisecond frame times while heavy instrumentation flags are enabled.

---

## 5. Startup Optimization

### Minimize Pre-`runApp()` Work
The `main()` method before `runApp()` blocks the engine from drawing the first native frame:
```dart
void main() async {
  // ONLY place work here that MUST complete before initial UI can render
  WidgetsFlutterBinding.ensureInitialized();
  
  // Anti-pattern: Synchronously awaiting non-critical third-party SDKs,
  // remote config fetches, database pre-population, or large asset decoding!
  
  runApp(const MyApp());
}
```

### Lazy and Deferred Initialization
- Initialize non-critical analytics, logging, crash reporters, and secondary feature dependencies after the first frame has rendered using `WidgetsBinding.instance.addPostFrameCallback((_) { ... })` or inside feature initialization flows.
- Load remote configuration with reasonable fallback defaults so app startup never stalls on network connectivity.

### First-Frame Deferral
- Flutter provides `WidgetsBinding.instance.deferFirstFrame()` and `allowFirstFrame()`.
- Use this only when the initial frame must display critical resolved data (e.g., avoiding an ugly splash flash).
- Always wrap in a `try/finally` block to guarantee `allowFirstFrame()` is invoked even if an exception occurs:
```dart
WidgetsBinding.instance.deferFirstFrame();
try {
  await criticalInitialDataLoad();
} finally {
  WidgetsBinding.instance.allowFirstFrame();
}
```

### Measuring Startup Metrics
Measure startup on physical release builds using platform tooling:
- **Android**: `adb shell am start-activity -W -n <package>/<activity>` (`ThisTime`, `TotalTime`, `WaitTime`).
- **iOS**: Xcode Organizer Launch Metrics / Instruments.
- Break down launch into: Process Launch → Flutter Engine Init → Main Invocation → First Frame → Interactive UI.

---

## 6. Build and Release Optimization

### Build Modes
- `debug`: JIT, assertions enabled, DevTools extensions active, unoptimized runtime.
- `profile`: AOT compiled, asserts stripped, tracing and profiling extensions enabled.
- `release`: AOT compiled, asserts stripped, all optimizations and tree-shaking enabled.

### Application Size Analysis (`--analyze-size`)
Run the size analysis tool before guessing which package or asset bloats the bundle:
```bash
# Android AAB
flutter build appbundle --analyze-size

# iOS
flutter build ipa --analyze-size

# Web
flutter build web --analyze-size
```
Load the generated size analysis JSON in DevTools **App Size** tool to inspect package-by-package Dart code, native libraries, and asset contributions.

### Asset Hygiene
- Verify no unused high-resolution video, sound, or raw images are packaged into `assets/`.
- Ensure multiple DPI variants (`1.0x`, `2.0x`, `3.0x`) are sized correctly rather than bundling 4K source assets in the base folder.

### Obfuscation and Debug Symbols
For production releases requiring binary size reduction and symbol protection:
```bash
flutter build appbundle --obfuscate --split-debug-info=./symbols/android
flutter build ipa --obfuscate --split-debug-info=./symbols/ios
```
- Store the generated `./symbols/` directory securely with your CI/CD artifacts matching the exact release version. Without this mapping file, stack traces reported by crash monitoring tools cannot be de-obfuscated.
- Remember: Obfuscation is not a security boundary; sensitive logic or keys must never live in client code.
