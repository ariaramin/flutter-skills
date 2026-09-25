---
name: lottie-flutter
description: >
  Expert implementation, architecture, debugging, and performance optimization
  of Lottie animations in production Flutter applications across supported platforms.
  Use when adding, refactoring, profiling, or architecting Lottie vector animations
  using the pure Dart lottie package (v3.5.x+).
---

# Lottie for Flutter

## Purpose

This skill provides exhaustive, source-grounded operating instructions for an autonomous AI coding agent implementing, refactoring, optimizing, and reviewing Lottie animations within Flutter applications. It codifies the architecture of the pure Dart `lottie` runtime (`lottie: ^3.5.1`), establishes strict composition lifecycle and resource ownership models, enforces multi-platform rendering efficiency across Impeller and CanvasKit/Wasm, and prevents performance, memory, and ticker leaks.

---

## When to Use This Skill

Activate this skill whenever a task involves:
- Adding, updating, or styling Lottie animations in Flutter.
- Integrating `AnimationController` with `Lottie` compositions, progress scrubbing, or marker-based playback.
- Dynamically altering animation colors, strokes, opacity, text, or paths via `ValueDelegate` and `LottieDelegates`.
- Loading animations from assets, network URLs, files, memory bytes, `.zip` bundles, `.tgs` (Telegram stickers), or `.lottie` (dotLottie) containers.
- Optimizing frame rates, repaint boundaries, CPU/GPU overhead, and memory consumption in animated UIs.
- Embedding animations inside virtualized scroll views (`ListView`, `GridView`, `CustomScrollView`).
- Designing reusable, accessible, and theme-adaptive design system animation components.
- Diagnosing jank, raster thread delays, unhandled composition exceptions, or memory leaks.

---

## Source of Truth

Primary authoritative sources:
1. **Official Flutter Lottie Package**: `https://pub.dev/packages/lottie` (Current stable: `3.5.1`, maintained by `xaha.dev`, GitHub: `xvrh/lottie-flutter`).
2. **Official Package API Reference**: `https://pub.dev/documentation/lottie/latest/lottie/lottie-library.html`.
3. **Official GitHub Repository & Examples**: `https://github.com/xvrh/lottie-flutter/tree/master/example`.
4. **LottieFiles Specification & Best Practices**: `https://lottiefiles.com` and `https://github.com/airbnb/lottie-spec`.

When implementation decisions conflict, apply the following precedence hierarchy:
1. Official `lottie` Dart package API and behavior (`v3.5.1`).
2. Official repository sample code and test suites (`xvrh/lottie-flutter`).
3. Flutter framework lifecycle, rendering, and accessibility contracts.
4. LottieFiles format specifications and motion design best practices.

---

## Version and API Awareness

- **Engine Architecture**: The Flutter `lottie` package is a **100% pure Dart** port of Airbnb's `lottie-android` (v3.4.0+ architecture). It contains **zero native C/C++ binaries, zero FFI, and zero platform channels** for rendering. It renders directly to Flutter's `Canvas`.
- **Package Version**: `lottie: ^3.5.1` (Requires Dart `>=3.5.0 <4.0.0` and Flutter `>=3.24.0`).
- **Platform Agnostic**: Runs identically on iOS, Android, Web, macOS, Windows, and Linux without CMake, Podfile, Gradle native, or C++ toolchain configurations.
- **Web Runtime**: Fully compatible with Flutter Web on both **CanvasKit** and **WASM (SkWasm)** runtimes. Since v3.0, `package:http` replaced `dart:html`, allowing identical network fetching across native and web platforms.
- **Modern Features (v3.1.0 – v3.5.1)**:
  - `RenderCache` (`RenderCache.drawingCommands` and `RenderCache.raster`) for caching drawing instructions or raster surfaces.
  - `backgroundLoading: true` parameter across all providers to decode and parse JSON off the main isolate.
  - `FrameRate` throttling support (`FrameRate.composition`, `FrameRate.max`, `FrameRate(fps)`).
  - Built-in GZip decompression via `LottieComposition.decodeGZip` for `.tgs` files.
  - Zip container decoding via `LottieComposition.decodeZip` with custom `filePicker` for `.lottie` (dotLottie).

---

## Core Engineering Principles

1. **Zero Work in `build()`**: NEVER parse JSON, fetch network endpoints, or instantiate `AnimationController`s inside widget `build()` methods.
2. **Strict Resource Ownership**: The entity that instantiates an `AnimationController` MUST dispose it. If `Lottie` internally manages the controller, do not pass an external one. If an external controller is passed, configure duration in `onLoaded` and call `controller.dispose()` in the owning widget's `State.dispose()`.
3. **Isolate Parsing for Large Payloads**: Any Lottie payload exceeding 50 KB MUST use `backgroundLoading: true` or `compute()` to prevent blocking the UI isolate during frame rendering.
4. **Repaint Boundary Isolation**: `Lottie` default `addRepaintBoundary: true` MUST remain enabled to insulate parent and sibling widget layers from animation repaint cycles.
5. **Cadence Awareness**: PREFER `FrameRate.composition` over `FrameRate.max`. Never force 120 Hz rendering on a 30 fps After Effects composition.
6. **Respect User Accessibility**: MUST check `MediaQuery.disableAnimationsOf(context)` or `MediaQuery.accessibleNavigationOf(context)` and halt continuous loops or display static final states for motion-sensitive users.

---

## Installation

Add the current stable version to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  lottie: ^3.5.1
```

Run pub get:
```bash
flutter pub get
```

No platform-specific modifications (e.g. `AndroidManifest.xml`, `Info.plist`, or CMake scripts) are required.

---

## Supported Formats

| Format | Extension | Description | How to Load | Best For | Caveats / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard JSON** | `.json` | Uncompressed Bodymovin JSON export. | `Lottie.asset('...')`<br>`Lottie.network('...')`<br>`Lottie.file(file)` | Standard UI icons, feedback badges, empty states. | Uncompressed text can be large (100KB–2MB). Always enable `backgroundLoading: true` for large files. |
| **Zipped Bundle** | `.zip` | Archive containing `data.json` and external PNG/JPEG/TTF assets. | `Lottie.asset('...zip')`<br>`LottieComposition.decodeZip(bytes)` | Complex animations with raster image layers or custom font files. | Higher memory usage due to raster textures. Prefer pure vector. |
| **Telegram Sticker** | `.tgs` | GZip-compressed Bodymovin JSON. | `Lottie.asset('...tgs', decoder: LottieComposition.decodeGZip)` | Compressed animated stickers and emoji vectors. | Requires explicit `decoder: LottieComposition.decodeGZip`. |
| **dotLottie** | `.lottie` | Modern open container format (ZIP with manifest and assets). | `Lottie.asset('...lottie', decoder: dotLottieDecoder)` | Smallest distribution size, bundled animations. | Requires custom `filePicker` decoder in Dart to select `animations/*.json`. |

### dotLottie Decoder Implementation

To load `.lottie` container files directly in Flutter:

```dart
import 'package:archive/archive.dart';
import 'package:lottie/lottie.dart';

Future<LottieComposition> dotLottieDecoder(List<int> bytes) {
  return LottieComposition.decodeZip(
    bytes,
    filePicker: (files) {
      return files.firstWhere(
        (f) => f.name.startsWith('animations/') && f.name.endsWith('.json'),
        orElse: () => files.firstWhere((f) => f.name.endsWith('.json')),
      );
    },
  );
}

// Usage:
// Lottie.asset('assets/animations/hero.lottie', decoder: dotLottieDecoder);
```

---

## Recommended Project Architecture

Maintain strict separation between asset storage, preloading services, presentation widgets, and business state:

```text
lib/
├── core/
│   ├── animations/
│   │   ├── app_animation_assets.dart      // Canonical String constants and paths
│   │   ├── animation_cache_service.dart   // Optional warm-up & composition cache
│   │   └── dot_lottie_decoder.dart        // Custom container decoders
│   └── theme/
│       └── animation_durations.dart       // Global duration & curve standards
├── features/
│   └── checkout/
│       └── presentation/
│           ├── widgets/
│           │   └── payment_success_badge.dart // Reusable domain animation widget
│           └── controllers/
│               └── checkout_state.dart
assets/
└── animations/
    ├── badges/
    │   └── success_check.json
    ├── illustrations/
    │   └── empty_cart.json
    └── loaders/
        └── spinner.json
```

### Asset Registration (`pubspec.yaml`)

```yaml
flutter:
  assets:
    - assets/animations/badges/
    - assets/animations/illustrations/
    - assets/animations/loaders/
```

### Strongly Typed Asset Catalog

NEVER hardcode raw asset path strings across feature widgets. Use a centralized catalog:

```dart
abstract final class AppAnimationAssets {
  static const String _base = 'assets/animations';

  static const String successCheck = '$_base/badges/success_check.json';
  static const String emptyCart = '$_base/illustrations/empty_cart.json';
  static const String spinner = '$_base/loaders/spinner.json';
}
```

---

## Loading Animations

The `lottie` package provides high-level convenience constructors via `LottieBuilder`:

1. `Lottie.asset(String name, ...)`: Loads from `AssetBundle`.
2. `Lottie.network(String url, ...)`: Downloads via HTTP GET and parses.
3. `Lottie.file(File file, ...)`: Reads from device filesystem (Native only).
4. `Lottie.memory(Uint8List bytes, ...)`: Loads directly from in-memory byte buffer.

Each corresponds to an underlying `LottieProvider`: `AssetLottie`, `NetworkLottie`, `FileLottie`, and `MemoryLottie`.

### Common Configuration Parameters

```dart
Lottie.asset(
  AppAnimationAssets.successCheck,
  width: 120,
  height: 120,
  fit: BoxFit.contain,
  alignment: Alignment.center,
  animate: true,                        // Auto-play when controller is null
  repeat: false,                       // Do not loop continuously
  reverse: false,                      // Play forward
  frameRate: FrameRate.composition,    // Match After Effects export fps
  backgroundLoading: true,             // Decode JSON on worker isolate
  filterQuality: FilterQuality.low,    // Bitmap filtering quality
  options: LottieOptions(enableMergePaths: true), // Enable AE merge paths
  errorBuilder: (context, error, stackTrace) {
    return const Icon(Icons.error_outline, color: Colors.red, size: 48);
  },
  frameBuilder: (context, child, composition) {
    if (composition == null) {
      return const SizedBox(
        width: 120,
        height: 120,
        child: Center(child: CircularProgressIndicator.adaptive()),
      );
    }
    return child;
  },
);
```

---

## Composition Lifecycle and Ownership

### What is a `LottieComposition`?

A `LottieComposition` is an **immutable model** representing the fully parsed After Effects scene graph (layers, keyframes, curves, markers, and shapes).
- Parsing a JSON file into a `LottieComposition` is **CPU-intensive**.
- Once parsed, a `LottieComposition` is **read-only and thread-safe**.
- A single `LottieComposition` instance CAN and SHOULD be shared across multiple `Lottie` widgets simultaneously.

### Composition Ownership Rules

1. **Default Ownership**: When using `Lottie.asset(...)` without a preloaded composition, `Lottie` delegates parsing to the provider and caches the composition in `Lottie.cache`.
2. **Preloaded Ownership**: If preloading compositions during app bootstrap or feature initialization, store the `LottieComposition` in an application-scoped service or Riverpod/Bloc state.
3. **Sharing**: Multiple `Lottie` widgets can receive the same `composition` object. Each widget maintains its own animation progress and ticker independently.

---

## Composition Reuse and Caching

The `lottie` package includes a built-in memory cache: `Lottie.cache` (instance of `LottieCache`).

### Built-in Provider Cache

By default, all `LottieProvider` instances (`AssetLottie`, `NetworkLottie`, etc.) cache their `Future<LottieComposition>` by key:
- Cache key for `AssetLottie`: `assetName + bundle`.
- Cache key for `NetworkLottie`: `url`.
- Cache capacity: Defaults to `1000` entries.

### Managing the Built-in Cache

```dart
// Change maximum cache capacity
Lottie.cache.maximumSize = 100;

// Evict a specific asset
Lottie.cache.evict(AssetLottie(AppAnimationAssets.successCheck));

// Clear entire composition cache on low memory warnings
Lottie.cache.clear();
```

### Bypassing Cache

For large, one-off onboarding or splash animations that will never be displayed again, set `cache: false` to avoid retaining the parsed composition in memory:

```dart
Lottie.asset(
  'assets/animations/onboarding_huge.json',
  cache: false,
  backgroundLoading: true,
);
```

### Manual Preloading Pattern

Preload critical feedback or tab animations during initialization to ensure instantaneous, zero-jank display:

```dart
class AnimationPreloader {
  final Map<String, LottieComposition> _cache = {};

  Future<void> preloadAll(List<String> assetPaths) async {
    for (final path in assetPaths) {
      try {
        final composition = await AssetLottie(
          path,
          backgroundLoading: true,
        ).load();
        _cache[path] = composition;
      } catch (e, st) {
        // Surface or log loading failure
        assert(() {
          print('Failed to preload Lottie asset $path: $e\n$st');
          return true;
        }());
      }
    }
  }

  LottieComposition? get(String assetPath) => _cache[assetPath];
}
```

---

## Rendering

The rendering lifecycle of `Lottie` in Flutter proceeds as follows:
1. **Ticker Activation**: A `Ticker` ticks every frame (throttled to `frameRate`).
2. **Progress Update**: Progress `0.0..1.0` is computed from elapsed time or an external `AnimationController`.
3. **Scene Evaluation**: Layer transforms, opacity, and shape paths are evaluated for the current timestamp.
4. **Canvas Drawing**: The pure Dart renderer translates vector shapes into `Path`, `Paint`, and `Canvas.draw...` commands.
5. **Repaint Boundary**: Because `addRepaintBoundary` defaults to `true`, painting is recorded directly into an isolated `RenderRepaintBoundary` graphics layer, preventing repaints from dirtying parent widgets.

### Merge Paths Support

After Effects "Merge Paths" are disabled by default because they require expensive clipping path calculations unsupported in some hardware pipelines.
If an animation uses merge paths and appears broken:

```dart
Lottie.asset(
  AppAnimationAssets.successCheck,
  options: LottieOptions(enableMergePaths: true),
);
```
> [!WARNING]
> `enableMergePaths: true` carries a measurable CPU penalty per frame. Only enable it if the animation geometry fails to render without it.

---

## AnimationController Integration

When you need precise programmatic playback, sequencing, user scrubbing, or synchronization with external state, pass an explicit Flutter `AnimationController`.

### Strict Operational Rules

1. **NO Autoplay with External Controller**: When `controller` is provided, `Lottie`'s internal autoplay and loop logic is completely disabled. The developer has 100% control and 100% responsibility.
2. **Duration Synchronization**: The `AnimationController.duration` MUST be synchronized with `composition.duration`.
3. **Use `onLoaded`**: Set `controller.duration = composition.duration` inside the `onLoaded` callback.
4. **Lifecycle Disposal**: The `StatefulWidget` owning the `AnimationController` MUST call `controller.dispose()` in its `dispose()` method.

### Complete Controlled Implementation

```dart
class ControlledLottieBadge extends StatefulWidget {
  const ControlledLottieBadge({super.key});

  @override
  State<ControlledLottieBadge> createState() => _ControlledLottieBadgeState();
}

class _ControlledLottieBadgeState extends State<ControlledLottieBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    // Initialize controller without duration; duration is set dynamically on load
    _controller = AnimationController(vsync: this);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _replay() {
    _controller
      ..reset()
      ..forward();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Lottie.asset(
          AppAnimationAssets.successCheck,
          controller: _controller,
          width: 150,
          height: 150,
          backgroundLoading: true,
          onLoaded: (composition) {
            // MUST set duration to match composition
            _controller
              ..duration = composition.duration
              ..forward();
          },
        ),
        TextButton.icon(
          onPressed: _replay,
          icon: const Icon(Icons.refresh),
          label: const Text('Replay'),
        ),
      ],
    );
  }
}
```

---

## Playback and Progress Control

### Programmatic Scrubbing (Gestures / Sliders / Scroll)

To scrub an animation directly without an `AnimationController`, pass a normalized `progress` double (`0.0..1.0`) directly to `Lottie`:

```dart
class ScrubbableLottie extends StatelessWidget {
  final double progress; // 0.0 to 1.0

  const ScrubbableLottie({super.key, required this.progress});

  @override
  Widget build(BuildContext context) {
    return Lottie.asset(
      AppAnimationAssets.spinner,
      progress: progress.clamp(0.0, 1.0),
      animate: false, // Prevents automatic ticking
    );
  }
}
```

### Looping Specific Frame Ranges

To loop only a segment of an animation (e.g. frames 30 to 90):

```dart
void playLoopingSection(
  AnimationController controller,
  LottieComposition composition, {
  required int fromFrame,
  required int toFrame,
}) {
  final startProgress = fromFrame / composition.endFrame;
  final endProgress = toFrame / composition.endFrame;
  final sectionDuration = composition.duration * (endProgress - startProgress).abs();

  controller.repeat(
    min: startProgress,
    max: endProgress,
    period: sectionDuration,
  );
}
```

---

## Markers

Lottie markers define named keyframe ranges embedded directly inside the After Effects composition by the motion designer (e.g. `start`, `hover`, `click`, `loop`, `exit`).

### Inspecting Markers

A `Marker` provides:
- `name`: Identifier string.
- `start`: Normalized start time (`0.0..1.0`).
- `durationFrames`: Frame count of the marker segment.
- `startFrame`: Absolute starting frame.

### Marker Playback Pattern

```dart
void playMarker(
  AnimationController controller,
  LottieComposition composition,
  String markerName,
) {
  final marker = composition.markers.firstWhere(
    (m) => m.name == markerName,
    orElse: () => throw ArgumentError('Marker "$markerName" not found in composition.'),
  );

  final startProgress = marker.start;
  // Calculate normalized end progress from durationFrames
  final endProgress = marker.start + (marker.durationFrames / composition.endFrame);
  final segmentDuration = composition.duration * (endProgress - startProgress).abs();

  controller.animateTo(
    endProgress.clamp(0.0, 1.0),
    duration: segmentDuration,
    curve: Curves.easeInOut,
  );
}
```

---

## Dynamic Properties and Delegates

Dynamic properties allow runtime modification of colors, strokes, opacity, transform positions, rotations, scales, and text content without re-exporting the animation file.

### KeyPaths

A `KeyPath` targets layers, shapes, and groups using exact string hierarchy or wildcards:
- Specific target: `KeyPath(const ['Layer 1', 'Group 1', 'Fill 1'])`
- Wildcard match: `KeyPath(const ['**', 'Fill 1'])` matches any fill named `Fill 1` across all layers.
- Global match: `KeyPath(const ['**'])` matches all compatible properties.

### ValueDelegate Types

| Delegate | Type | Value Expectation | Example |
| :--- | :--- | :--- | :--- |
| `ValueDelegate.color` | `Color` | `Color(0xFF...)` | `ValueDelegate.color(const ['**', 'Fill 1'], value: Colors.blue)` |
| `ValueDelegate.strokeColor` | `Color` | `Color(0xFF...)` | `ValueDelegate.strokeColor(const ['**', 'Stroke 1'], value: Colors.amber)` |
| `ValueDelegate.opacity` | `int` | **0 to 100** (After Effects scale!) | `ValueDelegate.opacity(const ['**', 'Fill 1'], value: 50)` |
| `ValueDelegate.strokeWidth` | `double` | Pixels | `ValueDelegate.strokeWidth(const ['**'], value: 4.0)` |
| `ValueDelegate.transformRotation` | `double` | **Degrees** | `ValueDelegate.transformRotation(const ['Needle'], value: 90.0)` |
| `ValueDelegate.transformScale` | `Offset` | Scale factors | `ValueDelegate.transformScale(const ['Icon'], value: const Offset(1.2, 1.2))` |
| `ValueDelegate.colorFilter` | `ColorFilter` | `ColorFilter` | `ValueDelegate.colorFilter(const ['**'], value: ColorFilter.mode(...))` |

> [!CAUTION]
> In `ValueDelegate.opacity`, opacity is evaluated on a **0 to 100** integer scale, matching Adobe After Effects properties. Passing `1.0` results in **1% opacity** (nearly invisible), NOT full opacity!

### Dynamic Color & Text Example

```dart
Lottie.asset(
  AppAnimationAssets.successCheck,
  delegates: LottieDelegates(
    values: [
      ValueDelegate.color(
        const ['**', 'Checkmark', '**'],
        value: Theme.of(context).colorScheme.primary,
      ),
      ValueDelegate.opacity(
        const ['**', 'BackgroundCircle'],
        value: 80, // 80% opacity
      ),
    ],
    text: (originalText) {
      // Dynamic localization of text layers inside Lottie
      if (originalText == 'SUBMIT') return 'ENVOYER';
      return originalText;
    },
  ),
);
```

---

## Images

When an animation contains bitmap layers (PNG/JPEG):
1. **Embedded Images**: Encoded as base64 strings inside the JSON. Decoded automatically without extra configuration.
2. **External Images**: Stored in a subfolder or zip archive.
   - For zipped bundles: Handled automatically via `LottieComposition.decodeZip`.
   - For assets: Provide `imageProviderFactory`:

```dart
Lottie.asset(
  'assets/animations/photo_banner.json',
  imageProviderFactory: (LottieImageAsset asset) {
    // Maps asset.fileName or asset.id to local asset bundle images
    return AssetImage('assets/images/${asset.fileName}');
  },
);
```
> [!TIP]
> PREFER pure vector Lottie animations. Raster bitmaps inside Lottie files negate resolution independence, increase package size, and cause memory spikes on GPU texture upload.

---

## Fonts and Text

If an animation includes editable text layers:
1. Ensure the referenced font family is registered in `pubspec.yaml` under `flutter: fonts:`.
2. Provide a custom font delegate if the embedded font family name differs from your Flutter font family:

```dart
Lottie.asset(
  'assets/animations/typography.json',
  delegates: LottieDelegates(
    text: (initialText) => AppLocalizations.of(context)!.animatedGreeting,
    values: [
      ValueDelegate.fontFamily(
        const ['**'],
        value: 'Roboto',
      ),
    ],
  ),
);
```

---

## Layout, Fit, Alignment, and Constraints

### Sizing Resolution

`Lottie` determines its dimensions using the following priority:
1. **Explicit Arguments**: `width` and `height` parameters on the widget.
2. **Parent Constraints**: If `width`/`height` are omitted, `Lottie` expands to fill tight parent constraints (e.g. `SizedBox.expand` or `Expanded`).
3. **Intrinsic Composition Bounds**: If constraints are unconstrained (loose), `Lottie` adopts the native canvas width and height exported from After Effects (`composition.bounds.size`).

### Responsive Aspect Ratio Preservation

Always wrap flexible Lottie animations in an `AspectRatio` or use explicit `BoxFit`:

```dart
AspectRatio(
  aspectRatio: 16 / 9,
  child: Lottie.asset(
    AppAnimationAssets.emptyCart,
    fit: BoxFit.contain,       // Scales proportionally within bounds
    alignment: Alignment.center,
  ),
)
```

### BoxFit Reference

- `BoxFit.contain` (Default): Entire animation visible, maintains aspect ratio, letterboxed if needed.
- `BoxFit.cover`: Fills entire target box, maintains aspect ratio, clips excess content.
- `BoxFit.fill`: Distorts vector shapes to fill width and height entirely. AVOID unless intentional.
- `BoxFit.scaleDown`: Scales down if bounds exceed container; does not upscale.

---

## Flutter Widget Lifecycle

Map resource creation and disposal strictly to Flutter's `State` lifecycle:

```text
[initState]
  ├── Instantiate AnimationController(vsync: this)
  └── DO NOT load assets synchronously here
        │
[didChangeDependencies]
  └── Preload or read InheritedWidget / Theme / MediaQuery values
        │
[build]
  └── Render Lottie.asset(..., onLoaded: syncDuration)
  └── NEVER instantiate controllers or call load() inside build()
        │
[didUpdateWidget]
  └── React to property changes (e.g. active tab, trigger animation)
  └── DO NOT recreate controller if parameters did not change
        │
[dispose]
  ├── controller.dispose()  <-- MANDATORY if owned
  └── Clear local listeners
```

### Correct Implementation of `didUpdateWidget`

```dart
@override
void didUpdateWidget(covariant CustomAnimatedIcon oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (widget.isSelected != oldWidget.isSelected) {
    if (widget.isSelected) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }
}
```

---

## App Lifecycle

When an app transitions to the background (`AppLifecycleState.paused` or `hidden`):
- Flutter automatically stops scheduling frames for active tickers.
- When `TickerMode` becomes false (e.g. offscreen routes, inactive tabs in `TabBarView`), `_LottieState` automatically pauses ticking via its ambient `TickerMode.getValuesNotifier(context)`.
- If you run an external `AnimationController` with continuous audio or periodic business tasks, observe `WidgetsBindingObserver` to explicitly pause execution.

```dart
class LifecycleAwareLottieState extends State<MyWidget> with WidgetsBindingObserver {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = AnimationController(vsync: this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      _controller.stop(canceled: false);
    } else if (state == AppLifecycleState.resumed && _shouldBePlaying) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }
  // ...
}
```

---

## Resource Ownership and Disposal

### Ownership Matrix

| Resource | Creator | Owner | Disposal Responsibility | Method |
| :--- | :--- | :--- | :--- | :--- |
| `AnimationController` | `StatefulWidget` (`State`) | The `State` instance | The `State` instance | `controller.dispose()` in `State.dispose()` |
| `AnimationController` | `Lottie` (internal default) | `_LottieState` | `_LottieState` | Automatic on unmount |
| `LottieComposition` | `AssetLottie.load()` | Cache or State Provider | Memory Cache / GC | Evict via `Lottie.cache.evict(...)` |
| `RenderCache.raster` | Developer / Widget | `RenderCache` | Global Store | Clear via `renderCache.store.clear()` |
| `StreamSubscription` | Feature Widget | Feature Widget | Feature Widget | `subscription.cancel()` |

> [!IMPORTANT]
> Failing to dispose a locally created `AnimationController` causes a framework exception: `AnimationController.dispose() was not called`. Always balance `AnimationController(vsync: this)` with `_controller.dispose()`.

---

## State Management Integration

Keep UI animation controllers inside presentation `StatefulWidget`s. Business logic state machines (Bloc, Riverpod, Cubit) should emit **semantic states**, not animation progress values.

```text
[Bloc / Notifier]                [Presentation Widget (StatefulWidget)]
  State: PaymentSuccess    --->    Listens to state change
                                   Calls _controller.forward()
                                   Renders Lottie.asset(controller: _controller)
```

### Riverpod Integration Pattern

```dart
class CheckoutBadgeConsumer extends ConsumerStatefulWidget {
  const CheckoutBadgeConsumer({super.key});

  @override
  ConsumerState<CheckoutBadgeConsumer> createState() => _CheckoutBadgeConsumerState();
}

class _CheckoutBadgeConsumerState extends ConsumerState<CheckoutBadgeConsumer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen to state transitions without triggering whole-widget rebuilds
    ref.listen<CheckoutState>(checkoutStateProvider, (previous, next) {
      if (next is CheckoutStateSuccess) {
        _controller.forward(from: 0.0);
      } else if (next is CheckoutStateFailed) {
        _controller.reset();
      }
    });

    return Lottie.asset(
      AppAnimationAssets.successCheck,
      controller: _controller,
      width: 100,
      height: 100,
      onLoaded: (comp) => _controller.duration = comp.duration,
    );
  }
}
```

---

## Reusable Component Patterns

Create standard, resilient design system wrappers rather than sprinkling raw `Lottie.asset` calls across your codebase:

```dart
class AppFeedbackAnimation extends StatelessWidget {
  final String assetName;
  final double size;
  final bool loop;
  final VoidCallback? onCompleted;

  const AppFeedbackAnimation({
    super.key,
    required this.assetName,
    this.size = 120,
    this.loop = false,
    this.onCompleted,
  });

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) {
      // Respect Reduced Motion settings
      return SizedBox(
        width: size,
        height: size,
        child: const Icon(Icons.check_circle_outline, size: 48),
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: Lottie.asset(
        assetName,
        repeat: loop,
        backgroundLoading: true,
        onLoaded: (composition) {
          if (!loop && onCompleted != null) {
            Future.delayed(composition.duration, onCompleted);
          }
        },
        errorBuilder: (context, error, stackTrace) =>
            Icon(Icons.info_outline, size: size * 0.4),
      ),
    );
  }
}
```

---

## Network Animations

Loading Lottie from remote CDNs is appropriate for seasonal campaigns, remote onboarding steps, and dynamic content.

### Production Network Loading Rules

1. **Always Supply an `errorBuilder`**: Network requests can fail due to offline devices, HTTP 404, or malformed data.
2. **Always Supply a `frameBuilder`**: Show a lightweight skeleton or progress spinner while bytes are fetched over the wire.
3. **Cache HTTP Responses**: Use an HTTP client with cache headers or preload via `dio_cache_interceptor` / `flutter_cache_manager` and feed bytes to `Lottie.memory`.

```dart
Lottie.network(
  'https://assets.mycdn.com/animations/promo.json',
  width: 250,
  height: 250,
  backgroundLoading: true,
  frameBuilder: (context, child, composition) {
    if (composition == null) {
      return const SizedBox(
        width: 250,
        height: 250,
        child: Center(child: CircularProgressIndicator.adaptive()),
      );
    }
    return child;
  },
  errorBuilder: (context, error, stackTrace) {
    return Container(
      width: 250,
      height: 250,
      color: Colors.grey.shade100,
      alignment: Alignment.center,
      child: const Text('Failed to load animation'),
    );
  },
);
```

---

## Accessibility and Reduced Motion

Accessibility is a non-negotiable production requirement:
1. **Screen Readers**: Continuous or complex decorative vector animations are invisible to screen readers unless wrapped in `Semantics`.
2. **Vestibular Disorders & Reduced Motion**: Users who enable "Reduce Motion" in iOS/Android OS settings experience nausea or disorientation from continuous spinning or bouncing vector graphics.

### Implementation Pattern

```dart
class AccessibleLottieBadge extends StatelessWidget {
  final String semanticLabel;
  final String assetName;

  const AccessibleLottieBadge({
    super.key,
    required this.semanticLabel,
    required this.assetName,
  });

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return Semantics(
      label: semanticLabel,
      image: true,
      child: reduceMotion
          ? Lottie.asset(
              assetName,
              animate: false,
              progress: 1.0, // Display final settled state instantly
            )
          : Lottie.asset(
              assetName,
              repeat: false,
              backgroundLoading: true,
            ),
    );
  }
}
```

---

# Performance Engineering

## Composition Parsing

Parsing raw JSON strings into AST objects involves significant string allocation and CPU time:
- A 250 KB JSON file can cause 15–40 ms of UI thread jank if decoded on the main isolate.
- **Rule**: Set `backgroundLoading: true` on all constructors (`Lottie.asset`, `Lottie.network`, etc.). This causes the package to use Flutter's background worker isolates to parse JSON off the UI isolate.

---

## Composition Caching

- `LottieProvider` caches the `Future<LottieComposition>` internally.
- Subsequent calls to `Lottie.asset('same_path')` return the cached future immediately without disk I/O or re-parsing.
- If an animation is displayed frequently across multiple screens, keep it in the cache.

---

## Rendering Cost

Every frame of a Lottie animation executes vector math (path bezier evaluations, matrix transforms, dash calculations, and path trimming) in pure Dart.
- **Paths**: The number of control points directly impacts CPU path building.
- **Merge Paths**: Forces CPU Boolean path operations (`Path.combine`). High cost.
- **Masks and Mattes**: Requires `saveLayer` calls, which create offscreen GPU render targets. Excessive `saveLayer` calls exhaust GPU memory bandwidth and cause dropped frames.

---

## Frame Rate

By default, Flutter apps refresh at 60 Hz or 120 Hz (ProMotion).
- If a Lottie animation was created at 30 fps in After Effects, running it at `FrameRate.max` (120 Hz) executes 4 times more path evaluations per second for zero visual gain.
- **Rule**: Use `frameRate: FrameRate.composition` (default) to throttle the ticker to the animation's native authoring frame rate.

```dart
Lottie.asset(
  AppAnimationAssets.spinner,
  frameRate: FrameRate.composition, // Ticks at 30 fps instead of 120 fps
);
```

---

## Render Caching

The `lottie` package includes `RenderCache` to cache frame rendering instructions or raster images:

```dart
// 1. Drawing Commands Cache:
// Caches ui.Picture drawing commands. Eliminates Dart shape recalculations.
Lottie.asset(
  AppAnimationAssets.spinner,
  renderCache: RenderCache.drawingCommands,
);

// 2. Raster Cache:
// Caches rasterized ui.Image. Spares both CPU pathing and GPU vector rendering.
Lottie.asset(
  AppAnimationAssets.spinner,
  renderCache: RenderCache.raster,
);
```

### Memory Impact of `RenderCache.raster`

`RenderCache.raster` stores a raw uncompressed bitmap for every frame:
$$\text{Memory} = \text{Width} \times \text{Height} \times 4\text{ bytes} \times \text{Frame Count}$$
- Example: A 400x400 animation with 60 frames:
  $$400 \times 400 \times 4 \times 60 = 38.4\text{ MB RAM!}$$
- **CRITICAL RULE**: NEVER use `RenderCache.raster` on large dimensions or long animations. Reserve it strictly for small, looping UI icons (e.g. 32x32 to 48x48 spinners, ≤ 30 frames).

---

## Flutter Rebuilds

Do not trigger parent widget rebuilds on every animation tick!
- NEVER attach an `addListener(() => setState(() {}))` to an `AnimationController` driving Lottie. `Lottie` manages its own internal repainting via `addRepaintBoundary`. Calling `setState` causes the entire parent widget tree to rebuild 60–120 times per second.

---

## Concurrent Animations

Running multiple simultaneous Lottie tickers multiplies CPU load linearly:
- 10 active Lottie animations = 10 canvas evaluations per frame.
- Cap simultaneously playing animations on a single screen to **1 to 3 active instances**. Freeze or pause offscreen or secondary animations.

---

## Off-Screen Animations

- Always wrap offscreen or hidden animations in `TickerMode(enabled: false, ...)` or let Flutter's navigation / `TabBarView` handle it automatically.
- When widgets scroll out of viewport, stop playback.

---

## Lists, Grids, and Feeds

Embedding autoplaying Lottie animations inside `ListView.builder` or `GridView.builder` is a major cause of scroll jank.

### Strict Rules for Virtualized Lists

1. **NEVER Autoplay in Every Item**: Keep animations paused (`animate: false` or `progress: 0.0`) by default.
2. **Trigger on Interaction or Visibility**: Only play the animation for the currently focused card or when explicitly tapped.
3. **Share Preloaded Compositions**: Pass a preloaded `LottieComposition` instance rather than loading assets per item.
4. **Enforce Bounded Dimensions**: Always supply explicit `width` and `height` to prevent layout reflow during scrolling.

```dart
class FeedAnimatedItem extends StatelessWidget {
  final LottieComposition composition;
  final bool isPlaying;

  const FeedAnimatedItem({
    super.key,
    required this.composition,
    required this.isPlaying,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 64,
      height: 64,
      child: Lottie(
        composition: composition,
        animate: isPlaying,
        repeat: isPlaying,
      ),
    );
  }
}
```

---

## Memory Management

1. **Evict Unused Large Assets**: Call `Lottie.cache.evict(...)` when leaving heavy animation flows.
2. **Monitor Image Assets**: Ensure embedded PNGs inside Lottie JSON are compressed or resized to target dimensions.
3. **Inspect Store Size**: If using `RenderCache.raster`, monitor memory consumption:
   ```dart
   final memoryBytes = RenderCache.raster.store.totalMemory;
   ```

---

## Asset Complexity (Designer Collaboration)

A significant proportion of Lottie performance bugs stem from After Effects design choices. Enforce these technical constraints with design teams:
- **Layer Count**: Keep total layers under 30. Eliminate invisible or hidden layers before export.
- **Path Nodes**: Minimize vector anchor points. Simplify bezier curves.
- **No Heavy Effects**: Bodymovin drop shadows, gaussian blurs, and fractal noise are either unsupported or trigger catastrophic software fallbacks.
- **Avoid Masks and Mattes**: Alpha mattes and inverted masks trigger `saveLayer` offscreen passes. Replace them with vector clipping paths where possible.
- **File Size Target**: Target < 100 KB for standard icons and < 300 KB for full-screen illustrations.

---

## CPU and GPU Considerations

- **Impeller (iOS & Android)**: Impeller renders canvas paths via tessellation on the GPU. Extremely intricate vector geometry with thousands of self-intersecting paths can increase tessellation pipeline times.
- **Skia (Desktop / Older Android)**: Highly optimized for 2D paths, but susceptible to shader compilation jank on older Android devices.
- **Repaint Boundaries**: Default `addRepaintBoundary: true` isolates the Lottie render object to its own `RenderRepaintBoundary` layer. Do not set `addRepaintBoundary: false` unless compositing inside a custom canvas that already manages layer caching.

---

## Performance Profiling

Use Flutter DevTools to isolate animation bottlenecks:
1. **Flutter DevTools Timeline**:
   - Long UI isolate bars during animation load indicate JSON parsing on main thread -> Enable `backgroundLoading: true`.
   - Long UI isolate bars during animation playback indicate excessive path complexity or unnecessary widget rebuilds.
   - Long Raster/GPU isolate bars indicate excessive `saveLayer` calls from masks/mattes or excessive layer dimensions.
2. **Widget Rebuild Tracker**:
   - Verify that your parent widgets are NOT rebuilding during animation ticks.
3. **Performance Overlay**:
   - Enable `showPerformanceOverlay: true` in `MaterialApp` to observe frame drops in real time.

---

# Platform Guidance

| Platform | Runtime Architecture | Performance Characteristics | Key Caveats / Rules |
| :--- | :--- | :--- | :--- |
| **Android** | Pure Dart over Impeller (Vulkan/GLES) or Skia. | Excellent. Low-end devices may stutter on JSON parsing. | MUST enable `backgroundLoading: true`. Throttle frame rate to 30 fps on budget devices. |
| **iOS** | Pure Dart over Impeller (Metal). | Ultra smooth. ProMotion displays refresh at 120 Hz. | MUST use `FrameRate.composition` to prevent battery drain from redundant 120 Hz ticks. |
| **Web (CanvasKit / WASM)** | Pure Dart compiled to Wasm/JS, rendered via WebGL/WebGPU. | Good performance on modern browsers. | Keep JSON payload sizes low to minimize network download latency. WASM fully supported in v3.5+. |
| **macOS** | Pure Dart over Metal. | Desktop class performance. | Handles multiple concurrent compositions effortlessly. Respect `disableAnimations`. |
| **Windows** | Pure Dart over DirectX 11/12. | High performance across discrete and integrated GPUs. | Zero native C++ build plugins required. |
| **Linux** | Pure Dart over OpenGL. | Reliable, predictable vector rendering. | Zero native library dependencies. |

---

# Production Patterns

## Pattern A — Decorative Animation

For small, non-interactive visual accents (loading spinners, empty states):

```dart
class DecorativeSpinner extends StatelessWidget {
  const DecorativeSpinner({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 48,
      height: 48,
      child: Lottie.asset(
        AppAnimationAssets.spinner,
        frameRate: FrameRate.composition,
        backgroundLoading: true,
      ),
    );
  }
}
```

---

## Pattern B — Controlled Animation

For animations tied to user interactions or domain state transitions:

```dart
class InteractiveToggleIcon extends StatefulWidget {
  final bool isToggled;
  final ValueChanged<bool> onToggle;

  const InteractiveToggleIcon({
    super.key,
    required this.isToggled,
    required this.onToggle,
  });

  @override
  State<InteractiveToggleIcon> createState() => _InteractiveToggleIconState();
}

class _InteractiveToggleIconState extends State<InteractiveToggleIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }

  @override
  void didUpdateWidget(covariant InteractiveToggleIcon oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isToggled != oldWidget.isToggled) {
      if (widget.isToggled) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => widget.onToggle(!widget.isToggled),
      child: SizedBox(
        width: 36,
        height: 36,
        child: Lottie.asset(
          AppAnimationAssets.successCheck,
          controller: _controller,
          onLoaded: (comp) => _controller.duration = comp.duration,
        ),
      ),
    );
  }
}
```

---

## Pattern C — Shared Composition

When displaying the same animation in multiple places simultaneously (e.g. 5 rating stars or badge indicators):

```dart
class SharedLottieRow extends StatefulWidget {
  const SharedLottieRow({super.key});

  @override
  State<SharedLottieRow> createState() => _SharedLottieRowState();
}

class _SharedLottieRowState extends State<SharedLottieRow> {
  late final Future<LottieComposition> _compositionFuture;

  @override
  void initState() {
    super.initState();
    // Load once for all children
    _compositionFuture = AssetLottie(
      AppAnimationAssets.successCheck,
      backgroundLoading: true,
    ).load();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<LottieComposition>(
      future: _compositionFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const SizedBox(
            height: 48,
            child: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        final composition = snapshot.data!;
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            5,
            (index) => SizedBox(
              width: 48,
              height: 48,
              child: Lottie(
                composition: composition,
                repeat: true,
              ),
            ),
          ),
        );
      },
    );
  }
}
```

---

## Pattern D — Feed/List Animation

Safe, memory-conservative animation in virtualized lists:

```dart
class FeedAnimationCard extends StatelessWidget {
  final LottieComposition preloadedComposition;
  final bool isVisibleInViewport;

  const FeedAnimationCard({
    super.key,
    required this.preloadedComposition,
    required this.isVisibleInViewport,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 64,
              height: 64,
              child: Lottie(
                composition: preloadedComposition,
                animate: isVisibleInViewport,
                repeat: isVisibleInViewport,
                frameRate: FrameRate.composition,
              ),
            ),
            const SizedBox(width: 16),
            const Text('Card Item Description'),
          ],
        ),
      ),
    );
  }
}
```

---

## Pattern E — Remote Animation

Production-grade remote network loader with caching, loading indicators, and graceful fallback:

```dart
class RemotePromoBanner extends StatelessWidget {
  final String url;

  const RemotePromoBanner({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 180,
      child: Lottie.network(
        url,
        fit: BoxFit.contain,
        backgroundLoading: true,
        frameBuilder: (context, child, composition) {
          if (composition == null) {
            return Container(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              alignment: Alignment.center,
              child: const CircularProgressIndicator.adaptive(),
            );
          }
          return child;
        },
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            alignment: Alignment.center,
            child: const Icon(Icons.broken_image_outlined, size: 40),
          );
        },
      ),
    );
  }
}
```

---

## Pattern F — Design-System Animation Component

Unified design-system component integrating semantic tokens, accessibility, and error handling:

```dart
enum AppFeedbackType { success, error, info }

class AppFeedbackView extends StatelessWidget {
  final AppFeedbackType type;
  final String message;
  final VoidCallback? onFinished;

  const AppFeedbackView({
    super.key,
    required this.type,
    required this.message,
    this.onFinished,
  });

  String get _asset {
    return switch (type) {
      AppFeedbackType.success => AppAnimationAssets.successCheck,
      AppFeedbackType.error => AppAnimationAssets.emptyCart,
      AppFeedbackType.info => AppAnimationAssets.spinner,
    };
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 120,
          height: 120,
          child: reduceMotion
              ? Icon(
                  type == AppFeedbackType.success ? Icons.check_circle : Icons.error,
                  size: 64,
                  color: theme.colorScheme.primary,
                )
              : Lottie.asset(
                  _asset,
                  repeat: false,
                  backgroundLoading: true,
                  onLoaded: (comp) {
                    if (onFinished != null) {
                      Future.delayed(comp.duration, onFinished);
                    }
                  },
                  delegates: LottieDelegates(
                    values: [
                      ValueDelegate.color(
                        const ['**', 'Accent', '**'],
                        value: theme.colorScheme.primary,
                      ),
                    ],
                  ),
                ),
        ),
        const SizedBox(height: 16),
        Text(message, style: theme.textTheme.bodyLarge),
      ],
    );
  }
}
```

---

# Error Handling

| Failure Mode | Root Cause | Prevention / Recovery Strategy |
| :--- | :--- | :--- |
| **AssetNotFoundException** | Asset not declared in `pubspec.yaml` or typo in path string. | Use `AppAnimationAssets` constants. Always verify asset manifests in tests. |
| **FormatException (Malformed JSON)** | Incomplete file download or corrupt Bodymovin export. | Supply `errorBuilder` to render UI fallback. Check JSON validity with `jsonDecode`. |
| **Missing Image / Font Layer** | Asset references an external bitmap not provided to package. | Provide `imageProviderFactory` or bundle as `.zip` / `.lottie`. |
| **HttpException / Timeout** | Remote server error, offline client, or invalid CDN URL. | Implement timeout handling and `errorBuilder`. Cache payloads locally. |
| **Controller Exception on Dispose** | Controller disposed while ticker is active or called multiple times. | Follow strict single-owner disposal in `State.dispose()`. |
| **OOM (Out of Memory)** | Oversized `RenderCache.raster` cache on high-res animations. | Never use raster caching on animations larger than 64x64. Use `drawingCommands`. |

---

# Debugging Guide

### 1. Animation Does Not Play
- **Symptom**: Lottie displays only the first frame and remains frozen.
- **Cause**: An explicit `AnimationController` was provided, but `controller.forward()` or `repeat()` was never called, or duration was not set.
- **Fix**: Call `_controller..duration = composition.duration..forward()` inside `onLoaded: (composition) { ... }`.

### 2. Checkmark or Shapes Disappear / Turn Black
- **Symptom**: Geometry missing or filled with solid black boxes.
- **Cause**: After Effects export uses "Merge Paths" or unsupported gradient blend modes.
- **Fix**: Pass `options: LottieOptions(enableMergePaths: true)` or request the motion designer unmerge paths in After Effects.

### 3. Opacity Delegate Has No Visible Effect
- **Symptom**: Passing `ValueDelegate.opacity(..., value: 1)` renders the shape completely invisible.
- **Cause**: Lottie opacity expects an integer from `0` to `100`. Passing `1` equates to 1% opacity.
- **Fix**: Pass `100` for 100% opacity, `50` for 50% opacity.

### 4. Layout Overflow / Unbounded Height Error
- **Symptom**: `A RenderFlex overflowed...` or `RenderBox was not laid out`.
- **Cause**: Placing `Lottie.asset` inside an unconstrained column/row without explicit `width`, `height`, or `Expanded`.
- **Fix**: Wrap in `SizedBox(width: ..., height: ...)`, `AspectRatio`, or `Expanded`.

### 5. UI Stutters When Animation Mounts
- **Symptom**: Frame drop during navigation transition when Lottie widget mounts.
- **Cause**: Synchronous JSON decoding blocking the UI thread.
- **Fix**: Set `backgroundLoading: true` on the `Lottie` widget or preload the composition before initiating navigation.

---

# Common Anti-Patterns

### Anti-Pattern 1: Re-parsing Composition in `build()`
```dart
// BAD: Re-reads bytes and parses JSON on EVERY build pass!
@override
Widget build(BuildContext context) {
  return FutureBuilder<LottieComposition>(
    future: AssetLottie('assets/anim.json').load(), // DISASTER
    builder: (context, snapshot) => Lottie(composition: snapshot.data),
  );
}

// PREFERRED: Store Future in initState() or use Lottie.asset() directly
late final Future<LottieComposition> _future;

@override
void initState() {
  super.initState();
  _future = AssetLottie('assets/anim.json', backgroundLoading: true).load();
}
```

### Anti-Pattern 2: Rebuilding Parent on Animation Ticks
```dart
// BAD: Forces entire parent widget tree to rebuild 60-120 times per second!
@override
void initState() {
  super.initState();
  _controller = AnimationController(vsync: this)
    ..addListener(() {
      setState(() {}); // DESTROYS PERFORMANCE
    });
}

// PREFERRED: Remove listener entirely. Lottie internally repaints itself!
@override
void initState() {
  super.initState();
  _controller = AnimationController(vsync: this);
}
```

### Anti-Pattern 3: Instantiating Controllers in `build()`
```dart
// BAD: Leaks controllers on every rebuild and resets animation state
@override
Widget build(BuildContext context) {
  final controller = AnimationController(vsync: this); // LEAK
  return Lottie.asset('...', controller: controller);
}

// PREFERRED: Instantiate in initState(), dispose in dispose()
```

### Anti-Pattern 4: Unchecked Autoplay in Infinite Lists
```dart
// BAD: 100 simultaneous active tickers destroying battery and frame rate
ListView.builder(
  itemBuilder: (context, index) => Lottie.asset('assets/badge.json'),
);

// PREFERRED: Pause offscreen or non-visible items, share preloaded composition
ListView.builder(
  itemBuilder: (context, index) => Lottie(
    composition: preloadedComposition,
    animate: index == activeIndex,
  ),
);
```

### Anti-Pattern 5: Blind Raster Caching
```dart
// BAD: 1000x1000 animation cached as 120 individual bitmaps = 480 MB RAM!
Lottie.asset(
  'assets/full_screen_hero.json',
  renderCache: RenderCache.raster, // OUT OF MEMORY
);

// PREFERRED: Use drawingCommands or leave renderCache null for large vector art
Lottie.asset(
  'assets/full_screen_hero.json',
  renderCache: RenderCache.drawingCommands,
);
```

---

# Recommended Implementation Patterns

1. **Preload Before Navigation**: When opening an essential modal or flow, preload the `LottieComposition` so the UI appears instantaneously with zero frame drops.
2. **Dynamic Theming**: Always hook Lottie colors to `Theme.of(context).colorScheme` using `ValueDelegate.color` to support Dark Mode automatically.
3. **Throttled Frame Rates**: Set `frameRate: FrameRate.composition` across all looping background assets.
4. **Isolate Decoding**: Always enable `backgroundLoading: true`.

---

# Testing

### Widget Testing Strategy

In Flutter widget tests, the fake async environment controls animation tickers:
- Use `tester.pump()` to advance animation frames manually.
- Avoid real HTTP network calls; mock `AssetBundle` or pass `MemoryLottie`.

```dart
testWidgets('Lottie badge renders and animates to completion', (tester) async {
  await tester.pumpWidget(
    const MaterialApp(
      home: Scaffold(
        body: ControlledLottieBadge(),
      ),
    ),
  );

  // Pump past the async loading phase
  await tester.pump();
  expect(find.byType(Lottie), findsOneWidget);

  // Advance by half the expected duration
  await tester.pump(const Duration(milliseconds: 500));

  // Advance to completion
  await tester.pumpAndSettle();
});
```

### Golden File Testing

For deterministic golden testing, freeze the animation at a specific frame or progress value:

```dart
testWidgets('Matches golden at 50% progress', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Lottie.asset(
          AppAnimationAssets.successCheck,
          animate: false,
          progress: 0.5, // Deterministic frame capture
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();

  await expectLater(
    find.byType(Lottie),
    matchesGoldenFile('goldens/success_check_halfway.png'),
  );
});
```

---

# Code Review Checklist

When reviewing code containing Lottie animations, verify each requirement:

- [ ] **No Controller Leaks**: Is every developer-instantiated `AnimationController` paired with a `.dispose()` call in `State.dispose()`?
- [ ] **Duration Synchronized**: Is `controller.duration` set inside `onLoaded: (composition) { ... }` or before playback?
- [ ] **No `setState` on Ticker**: Is the `AnimationController` free from redundant `.addListener(() => setState(...))` calls?
- [ ] **No Work in `build()`**: Are asset futures, decoders, or controllers created outside `build()`?
- [ ] **Background Parsing**: Is `backgroundLoading: true` specified on all large assets or network animations?
- [ ] **Error Handling**: Are network and file Lottie widgets protected with `errorBuilder` and `frameBuilder`?
- [ ] **Reduced Motion Supported**: Does the widget check `MediaQuery.disableAnimationsOf(context)` and halt looping motion?
- [ ] **Bounded Layout**: Are `width` and `height`, `AspectRatio`, or parent constraints explicitly provided?
- [ ] **Opacity Scale Verified**: If `ValueDelegate.opacity` is used, is the value within `0..100` instead of `0.0..1.0`?

---

# Performance Review Checklist

- [ ] **Repaint Boundaries**: Has `addRepaintBoundary` NOT been disabled without clear architectural justification?
- [ ] **Frame Rate Optimization**: Are non-critical animations set to `FrameRate.composition` rather than `FrameRate.max`?
- [ ] **List Virtualization**: Are Lottie animations in scrolling lists paused by default and sharing preloaded compositions?
- [ ] **Raster Cache Safety**: Is `RenderCache.raster` strictly limited to small (< 64x64) looping icons?
- [ ] **File Size Audit**: Are bundled JSON files under 250 KB? Have unnecessary raster images or hidden AE layers been purged?

---

# Animation Asset Review Checklist

Collaborate with motion designers to verify After Effects export quality:
- [ ] **No Expressions**: Are all AE expressions baked into keyframes?
- [ ] **Minimal Mattes & Masks**: Are expensive inverted alpha mattes eliminated?
- [ ] **No Unsupported Effects**: Are gaussian blurs, drop shadows, and lens flares removed?
- [ ] **Vector Only**: Are raster PNG/JPEG layers removed and replaced with vector shapes?
- [ ] **Merge Paths Minimized**: Are shapes unmerged where possible to avoid `enableMergePaths: true` overhead?
- [ ] **Optimized Keyframes**: Has the Bodymovin / LottieFiles export optimizer been run to strip unused metadata?

---

# Migration and Deprecated API Rules

1. **`LottieComposition.fromByteData`**: Deprecated in favor of `LottieComposition.fromBytes` or `AssetLottie.load()`.
2. **`LottieBuilder.load()`**: Do not use directly. Use `LottieProvider.load()` or high-level `Lottie.asset` / `network`.
3. **Web HTML Renderer Warnings**: If upgrading legacy web projects, migrate from HTML renderer to CanvasKit or WASM (`flutter build web --wasm`). The HTML renderer cannot accurately clip or composite complex Lottie vector paths.
4. **`package:http` Replacement**: Ensure custom network loaders use `package:http` rather than `dart:html` `HttpRequest` to preserve multi-platform and WASM compatibility.

---

# Decision Frameworks

### General Animation Strategy

| Requirement / Scenario | Recommended Approach | What to AVOID |
| :--- | :--- | :--- |
| **Decorative Accent / Spinner** | `Lottie.asset(...)` with default internal controller and `FrameRate.composition`. | Custom `AnimationController` with manual `repeat()`. |
| **Interactive Domain Feedback** | `Lottie.asset(controller: _controller)` with duration set in `onLoaded`. | Untracked autoplay or ignoring `dispose()`. |
| **Scrolling Feed / List Tile** | Shared preloaded `LottieComposition`, `animate: false` unless active. | Independent `Lottie.asset` loading and playing in every row. |
| **Dynamic Color Adaptability** | `LottieDelegates(values: [ValueDelegate.color(...)])`. | Duplicating JSON assets for light and dark modes. |
| **Remote Seasonal Campaign** | `Lottie.network` with local file cache, `frameBuilder`, and `errorBuilder`. | Bare `Lottie.network` without timeout or fallback handling. |
| **User Scrubbing / Gestures** | Direct `Lottie.asset(progress: normalizedValue, animate: false)`. | Driving scrubbers via high-frequency `controller.value = ...` rebuilds. |
| **User Requested Reduced Motion** | Display static terminal frame (`progress: 1.0`) or simple `Icon`. | Forcing continuous motion on motion-sensitive users. |

### Loading Mechanism Selection

| Source | Best For | Advantages | Tradeoffs |
| :--- | :--- | :--- | :--- |
| `Lottie.asset` | Core app UI, feedback badges, loaders. | Zero network latency, guaranteed offline availability. | Increases initial app bundle size. |
| `Lottie.network` | Dynamic promos, remote onboarding, banners. | Decoupled from app releases, dynamic updates. | Network latency, offline failure risk. |
| `Lottie.file` | Locally cached downloads or user-generated content. | Offline capability after initial fetch. | Device filesystem permissions and cleanup required. |
| `Lottie.memory` | Decrypted, decompressed, or dynamically generated bytes. | Maximum pipeline flexibility. | Higher transient RAM usage during byte manipulation. |

---

# Complete Examples

### Complete Example 1: Full-Featured Controlled Lottie Component

```dart
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class PaymentSuccessModal extends StatefulWidget {
  final VoidCallback onDismissed;

  const PaymentSuccessModal({
    super.key,
    required this.onDismissed,
  });

  @override
  State<PaymentSuccessModal> createState() => _PaymentSuccessModalState();
}

class _PaymentSuccessModalState extends State<PaymentSuccessModal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _isAnimationComplete = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
    _controller.addStatusListener(_handleStatusUpdate);
  }

  void _handleStatusUpdate(AnimationStatus status) {
    if (status == AnimationStatus.completed) {
      if (mounted) {
        setState(() => _isAnimationComplete = true);
      }
    }
  }

  @override
  void dispose() {
    _controller.removeStatusListener(_handleStatusUpdate);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 140,
              height: 140,
              child: reduceMotion
                  ? Icon(Icons.check_circle, size: 80, color: theme.colorScheme.primary)
                  : Lottie.asset(
                      'assets/animations/badges/success_check.json',
                      controller: _controller,
                      backgroundLoading: true,
                      frameRate: FrameRate.composition,
                      delegates: LottieDelegates(
                        values: [
                          ValueDelegate.color(
                            const ['**', 'Checkmark', '**'],
                            value: theme.colorScheme.primary,
                          ),
                        ],
                      ),
                      onLoaded: (composition) {
                        _controller
                          ..duration = composition.duration
                          ..forward();
                      },
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.check_circle_outline, size: 80),
                    ),
            ),
            const SizedBox(height: 16),
            Text('Payment Successful', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              'Your transaction has settled and receipt is ready.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: (_isAnimationComplete || reduceMotion)
                  ? widget.onDismissed
                  : null,
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### Complete Example 2: Interactive Marker-Driven Lottie Button

```dart
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class MarkerDrivenBookmarkButton extends StatefulWidget {
  final bool isBookmarked;
  final ValueChanged<bool> onChanged;

  const MarkerDrivenBookmarkButton({
    super.key,
    required this.isBookmarked,
    required this.onChanged,
  });

  @override
  State<MarkerDrivenBookmarkButton> createState() => _MarkerDrivenBookmarkButtonState();
}

class _MarkerDrivenBookmarkButtonState extends State<MarkerDrivenBookmarkButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  LottieComposition? _composition;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }

  @override
  void didUpdateWidget(covariant MarkerDrivenBookmarkButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isBookmarked != oldWidget.isBookmarked && _composition != null) {
      _playTransition(widget.isBookmarked);
    }
  }

  void _playTransition(bool bookmarked) {
    final comp = _composition!;
    final targetMarkerName = bookmarked ? 'bookmark' : 'unbookmark';
    
    // Search for defined marker
    final marker = comp.markers.cast<Marker?>().firstWhere(
          (m) => m?.name == targetMarkerName,
          orElse: () => null,
        );

    if (marker != null) {
      final startProgress = marker.start;
      final endProgress = marker.start + (marker.durationFrames / comp.endFrame);
      final duration = comp.duration * (endProgress - startProgress).abs();

      _controller.animateTo(
        endProgress.clamp(0.0, 1.0),
        duration: duration,
        curve: Curves.easeInOut,
      );
    } else {
      // Fallback if markers are missing: snap to start or end
      _controller.value = bookmarked ? 1.0 : 0.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: () => widget.onChanged(!widget.isBookmarked),
      icon: SizedBox(
        width: 32,
        height: 32,
        child: Lottie.asset(
          'assets/animations/bookmark.json',
          controller: _controller,
          backgroundLoading: true,
          onLoaded: (composition) {
            _composition = composition;
            _controller.duration = composition.duration;
            _controller.value = widget.isBookmarked ? 1.0 : 0.0;
          },
        ),
      ),
    );
  }
}
```

---

## Official References

- Official Flutter Lottie Package: `https://pub.dev/packages/lottie`
- Official Package API Reference: `https://pub.dev/documentation/lottie/latest/lottie/lottie-library.html`
- Official GitHub Repository: `https://github.com/xvrh/lottie-flutter`
- Official Repository Examples: `https://github.com/xvrh/lottie-flutter/tree/master/example`
- LottieFiles Official Documentation: `https://lottiefiles.com`
- Airbnb Lottie Specification: `https://github.com/airbnb/lottie-spec`
