---
name: document-scan-flutter
description: >
  Expert guidance for integrating, configuring, debugging, optimizing,
  testing, and maintaining the document_scan Flutter package (headless
  document corner detection + perspective correction; Apple Vision on iOS,
  OpenCV on Android) across its officially supported platforms.
---

# document_scan Flutter Skill

## Purpose

Activate this skill whenever a task in a Flutter repository touches the
`document_scan` package (pub.dev), including:

- Adding `document_scan` to a new or existing project.
- Writing or modifying code that calls `DocumentScanner`, `DocumentDetector`,
  `DocumentProcessor`, `AutoCaptureAnalyzer`, `CornerStabilizer`, `ScanInput`,
  `ScanSession`, or any other type from the `document_scan` library.
- Building a camera-based or gallery-based document-capture flow that is
  expected to use, or already uses, this package.
- Debugging: corners not detected, wrong/blank crops, distorted/skewed
  scans, filters producing unexpected output, auto-capture firing too often
  or not at all, jittery live overlays, or crashes/exceptions referencing
  `document_scan`, `DocumentDetector`, or a `MissingPluginException` on a
  document-scan call.
- Performance problems in a scanning flow (UI jank during capture, high
  memory use with multi-page sessions, excessive battery drain from a live
  camera overlay).
- Writing tests for scanning logic.
- Upgrading the package to a newer version.

**Do not** reach for this skill for generic camera-permission handling, for
the `camera` package's own API, or for OCR — `document_scan` does none of
those; see "Package Capabilities" below.

## Research Baseline

- **Package version researched:** 0.3.1 (published ~Sep 22, 2026).
- **Research date:** September 2026.
- **Supported platforms (verified):** Android, iOS only. No macOS, Windows,
  Linux, or Web plugin registration exists in `pubspec.yaml`.
- **SDK constraints (verified from `pubspec.yaml`):** Dart `^3.12.0`,
  Flutter `>=3.3.0`.
- **Dependencies (verified):** `image ^4.5.4`, `meta ^1.16.0`, `pdf ^3.13.0`.
- **Authoritative sources:** the package's own pub.dev listing, published
  README (tied to the 0.3.1 release), CHANGELOG.md, ROADMAP.md,
  `pubspec.yaml`, the generated dartdoc API reference (including embedded
  "Implementation" source snippets pulled directly from the released
  source), and the pub.dev package-analysis (pana) report. See "Sources"
  at the end of this file.

**This package moves fast** (small releases roughly every few weeks, per
its own roadmap) and has already had one release (0.3.0) that changed
runtime behavior without breaking the public API surface. Before relying on
any version-sensitive claim below — especially exact filter behavior,
detection thresholds, or dependency versions — check the installed
package's own version against pub.dev/CHANGELOG.md, and re-read the
relevant dartdoc page if the installed version is newer than 0.3.1.

**Not independently verified in this research pass:** the plugin's own
Android `minSdkVersion` and any iOS deployment-target floor declared inside
its native module. See "Platform Configuration → Android" and "→ iOS"
below for why, and for a safe way to determine it for the exact installed
version rather than guessing.

## Core Rules

- **MUST** treat `document_scan` as camera-free and UI-free: it never
  requests a permission, never opens a camera, and ships no screens. Any
  camera, gallery, or permission code belongs to the app's own capture
  layer (typically the `camera` or `image_picker` package), not to this
  package.
- **MUST NOT** assume `DocumentScanner.scan()`'s defaults (`filter:
  ScanFilter.enhance`, `background: true`, `sensitivity:
  DetectionSensitivity.lenient`) apply when calling the lower-level
  `DocumentProcessor.crop()`/`DocumentDetector.detect()` primitives
  directly — their own defaults differ (`filter: ScanFilter.none`,
  `background: false`, `sensitivity: DetectionSensitivity.balanced`). This
  is explicitly called out in the package's own dartdoc.
- **MUST** cap a live `detectStream` with `minInterval` (around
  `Duration(milliseconds: 100)`) — a camera pushes 30–60 fps, and running
  native detection on every frame heats the device for no visible overlay
  improvement. This is documented package guidance, not a general Flutter
  tip.
- **MUST** treat `DocumentCorners.confidence` as **non-comparable across
  platforms** (Vision's own probability on iOS vs. a geometric heuristic
  with a ~0.4 floor on Android) — never hardcode one global
  `minConfidence`/threshold and expect identical behavior on both
  platforms.
- **MUST** cancel any `detectStream` subscription in `dispose()` (or
  equivalent lifecycle teardown). The stream's internal backpressure guard
  keeps it safe from "add after close" errors, but an uncancelled
  subscription keeps invoking native detection after the screen is gone.
- **SHOULD** put `document_scan` calls behind a small service/repository
  abstraction (see "Recommended Architecture") rather than calling
  `DocumentScanner`/`DocumentDetector` directly from widgets — both classes
  are deliberately designed with injectable collaborators specifically so
  this layer is easy to build and easy to test.
- **SHOULD** reuse the same `CornerStabilizer`/`AutoCaptureAnalyzer`
  instance for the lifetime of one scanning session and discard it when the
  session ends (new screen entry / new document) rather than sharing one
  instance across unrelated sessions.
- **SHOULD** pass `PNG`- or `JPEG`-encoded `ScannedDocument`s into
  `DocumentProcessor.pagesToPdf()` — never a `ScanOutputFormat.pdf`-encoded
  one; bytes are embedded as-is, not decoded, so a PDF blob "embedded as an
  image" produces a broken output PDF.
- **MUST NOT** fabricate the package's channel name, native minSdk, or iOS
  deployment target when writing code or docs for a consumer of this
  skill — verify the currently-installed version's own files (see
  "Platform Configuration") rather than repeating an unverified number.

## Package Capabilities

**What it provides:**
- Document-shaped rectangle detection (not text detection — blank pages,
  forms, and drawings are found too) in a still image/file/bytes, or a
  live camera frame stream.
- Normalized (0..1), geometrically-ordered four-corner output
  (`DocumentCorners`), independent of whichever order the native engine
  returned them in.
- Pure-Dart perspective correction (homography-based since 0.3.0),
  cropping, and six post-crop filters.
- PNG / JPEG / single-page-PDF encoding of one scan, and multi-page-PDF
  combination of several already-scanned pages.
- A pure-Dart, camera-free "steady long enough to auto-capture" analyzer
  and an EMA corner-jitter smoother, both designed to be wired to a
  `detectStream`.
- An immutable, framework-agnostic multi-page session container.

**What it explicitly does NOT provide** (per the package's own README and
ROADMAP "Explicitly not planned" section):
- **No camera.** It never opens one; you feed it frames or files from your
  own capture layer.
- **No fullscreen scanner UI or any widgets at all.** You build every pixel
  of UI yourself.
- **No OCR and no bundled ML model.** If you need OCR, run a
  dedicated OCR package on the returned bytes.
- **No permission handling.** It requests none itself (see "Permissions").

## Installation

```yaml
dependencies:
  document_scan: ^0.3.1
```

(The package's own README/dartdoc install snippet currently still shows an
older `^0.2.1` constraint in its prose — this is a **stale line in the
package's own docs**, not a recommendation to under-constrain; use the
actual latest published version, currently `0.3.1`, or let
`flutter pub add document_scan` resolve it.)

No transitive native SDKs to install yourself — `image`, `meta`, and `pdf`
are all pure-Dart; OpenCV (Android) and Vision (iOS, an OS framework) ship
inside the plugin's own native module.

## Platform Configuration

### Android

- The plugin declares no manifest permissions and registers
  `DocumentScanPlugin` (package `com.oguzhan.document_scan`) for the
  Android platform (verified from `pubspec.yaml`).
- The plugin is **built-in-Kotlin-ready** per pub.dev's own analysis
  (i.e., compatible with Flutter's modern built-in-Kotlin Android plugin
  toolchain) — no manual Kotlin-plugin wiring should be required on a
  current Flutter Android template.
- **Not verified in this research pass:** the plugin module's own declared
  `minSdkVersion`. GitHub's file-tree browsing was blocked in this research
  environment and no other indexed copy of `android/build.gradle` for this
  repo was found. **Do not guess this number.** To get the real, current
  value for whatever version is actually installed:
  1. Run `flutter pub get`.
  2. Open the resolved package's `android/build.gradle` under your pub
     cache (e.g. `~/.pub-cache/hosted/pub.dev/document_scan-<version>/android/build.gradle`
     on most systems), and read its `defaultConfig.minSdkVersion` (or
     Kotlin-DSL `minSdk`) directly — or simply try a debug build; if your
     app's own `minSdkVersion` is lower than the plugin requires, Gradle's
     manifest merger will fail with an explicit
     `uses-sdk:minSdkVersion X cannot be smaller than version Y declared in
     library ...` error naming the exact required floor.
  2. Since Android's OpenCV bindings are the native dependency here,
     expect a floor somewhere in the Android 21+ range typical of modern
     OpenCV-Android builds — but confirm the exact number per point 1
     before shipping; do not hardcode a specific value into build
     configuration based on this assumption alone.
- **Release size:** the plugin bundles OpenCV's native `.so` per ABI. If
  your app doesn't need every ABI, restrict the release build:
```gradle
  // android/app/build.gradle
  android {
    splits { abi { enable true; reset(); include 'arm64-v8a'; universalApk false } }
  }
```
  This is documented package guidance, not a generic Android tip — it
  exists specifically because of this plugin's bundled OpenCV binary.

### iOS

- The plugin registers `DocumentScanPlugin` for iOS and is **Swift
  Package Manager-ready** per pub.dev's analysis, alongside standard
  CocoaPods support.
- Corner detection uses Apple's own **Vision** framework
  (`VNDetectRectanglesRequest`), part of the OS — **0 MB added** to your
  app, no separate framework linking step documented or required.
- The package's iOS privacy manifest declares **no accessed APIs, no
  tracking, and no data collection** (verified from the README's
  "Permissions" section) — nothing to add to your own privacy-manifest
  aggregation on this package's account.
- **Not verified in this research pass:** an explicit minimum iOS
  deployment target declared by the plugin's own podspec/module. Apple
  Vision's rectangle-detection API (`VNDetectRectanglesRequest`) has been
  available since early Vision-framework iOS releases, so a very old
  deployment target is plausible, but this was not confirmed from the
  package's own source in this pass. Verify against the resolved
  `ios/document_scan.podspec` (or the SPM `Package.swift`) for your
  installed version before assuming a specific floor, the same way as for
  Android above.
- **No Podfile edits, no `Info.plist` entries, and no camera-permission
  string are required by `document_scan` itself.** (Contrast this
  explicitly with other, differently-named "document scanner" Flutter
  packages that do require Podfile/`Info.plist` changes — that guidance
  does not apply here.) If your app's *capture layer* uses the `camera`
  package, `NSCameraUsageDescription` belongs to that integration, not to
  `document_scan`.

### macOS, Windows, Linux, Web

**Not supported.** Confirmed via `pubspec.yaml`'s `plugin.platforms` block
(only `android` and `ios` keys exist) and independently confirmed by
pub.dev's platform-support analysis, which explicitly lists Windows,
Linux, macOS, and Web as unsupported for this package. Calling
`DocumentDetector.detect()`/`detectStream()`/`DocumentScanner.scan()` on
one of these platforms has no registered native implementation to talk
to; based on standard Flutter plugin behavior for an unregistered channel
(this specific consequence was not independently confirmed against this
package's source, and is flagged as an engineering inference rather than
documented fact), expect a `MissingPluginException` rather than a
graceful `null`. `DocumentProcessor` alone (crop/filter/PDF) is pure Dart
and has no platform channel, so it *could* theoretically run standalone
on an unsupported platform if you already have corners from elsewhere —
but the package as a whole is not published, tested, or supported outside
Android/iOS, and `background: true` additionally requires `Isolate.run`,
which has no Web implementation (this exact interaction was flagged and
corrected in the package's own 0.3.0 changelog).

## API Reference for Practical Usage

All types are exported from a single library: `package:document_scan/document_scan.dart`.

### `ScanInput` (sealed) — the universal input type

One input type for both `DocumentDetector` and `DocumentProcessor`.
Implementers: `FileScanInput`, `BytesScanInput`, `CameraFrameScanInput`.

| Factory | Use for |
|---|---|
| `ScanInput.file(String path)` | A file on disk (JPEG/PNG/…) — e.g. from `image_picker` or a saved capture. |
| `ScanInput.bytes(Uint8List bytes, {required int width, required int height})` | Already-decoded image bytes you have in memory. |
| `ScanInput.yuvFrame({required width, required height, required yBytes, required uBytes, required vBytes, rotation, yRowStride, uvRowStride, uvPixelStride})` | A live YUV 4:2:0 camera frame — the **Android** camera default. Prefer this over the low-level `ScanInput.cameraFrame` because it makes the three planes non-optional. |
| `ScanInput.bgraFrame({required width, required height, required bytes, rotation, bytesPerRow})` | A live BGRA camera frame — the **iOS** camera default. |
| `ScanInput.cameraFrame(...)` | Low-level, format-agnostic constructor where plane params are all optional — avoid unless you have a genuine cross-format need; it's easy to pass the wrong plane set for the chosen `format` and have it silently accepted by the type system. |

**Platform frame-format restriction (documented):** the *live-stream* path
accepts **BGRA only on iOS** and **YUV420 or BGRA on Android**. This
restriction applies only to `CameraFrameScanInput` (the realtime
`detectFrame` channel call) — `FileScanInput`/`BytesScanInput` (the
`detectFile` channel call) have no such restriction.

```dart
// Android (YUV420) — from a camera package's CameraImage:
final input = ScanInput.yuvFrame(
  width: image.width,
  height: image.height,
  rotation: 90,
  yBytes: image.planes[0].bytes,
  uBytes: image.planes[1].bytes,
  vBytes: image.planes[2].bytes,
  yRowStride: image.planes[0].bytesPerRow,
  uvRowStride: image.planes[1].bytesPerRow,
  uvPixelStride: image.planes[1].bytesPerPixel ?? 1,
);

// iOS (BGRA):
final input = ScanInput.bgraFrame(
  width: image.width,
  height: image.height,
  rotation: 0,
  bytes: image.planes[0].bytes,
  bytesPerRow: image.planes[0].bytesPerRow,
);
```

### `DocumentDetector` — native corner detection

```dart
DocumentDetector({MethodChannel? channel, @visibleForTesting DateTime Function()? clock})
```
Both parameters are injectable specifically for testing (see "Testing").
Internally uses `const MethodChannel(_channelName)` when `channel` is
omitted — the literal channel name is a private implementation detail; do
not hardcode a guessed value into app code (see "Testing" for a pattern
that avoids needing it at all).

```dart
Future<DocumentCorners?> detect(
  ScanInput input, {
  DetectionSensitivity sensitivity = DetectionSensitivity.balanced,
})
```
Confirmed source behavior: dispatches to the native `detectFile` channel
method for `FileScanInput`/`BytesScanInput`, or `detectFrame` for
`CameraFrameScanInput`. Returns `null` when no document-like rectangle is
found. **Throws only on an unexpected channel error** you'd want to
surface (e.g. a genuine native exception, or a `MissingPluginException` on
an unsupported platform) — this is a real, uncaught exception in the
single-shot path, unlike `detectStream` below.

```dart
Stream<DetectionEvent> detectStream(
  Stream<ScanInput> frames, {
  CornerStabilizer? stabilize,
  DetectionSensitivity sensitivity = DetectionSensitivity.strict,
  Duration? minInterval,
})
```
Confirmed source behavior (read directly from the published
implementation):
- Frames arriving while a previous one is still processing are **dropped**
  and emitted as `DetectionSkipped` — the stream never backs up.
- `minInterval` drops a frame that arrives too soon **after the last
  frame that was actually run** (not the last arrival) — so a burst of
  dropped frames doesn't reset the rate-limit clock.
- A thrown error from `detect()` for one frame is caught, the
  `stabilize`r is reset (so a post-error document doesn't visually slide
  in from a stale position), and a `DetectionError(error, stackTrace)`
  event is emitted — **the stream itself stays alive**.
- **Important, easy to miss:** this try/catch only covers errors from the
  detection call itself. If your *own* `frames` source stream throws
  (e.g. the underlying camera image stream errors), that propagates as a
  genuine stream error via `addError` — it is **not** converted into a
  `DetectionEvent`. Always attach an `onError` handler when you `.listen()`
  to `detectStream`, in addition to switching over `DetectionEvent`.
- The returned stream closes only once your source `frames` stream is done
  **and** no frame is still in flight — a mid-flight frame settles into an
  event instead of racing a closed controller.
- Cancelling your subscription cancels the underlying `frames`
  subscription too (confirmed: `onCancel: () async { await sub?.cancel(); }`).

### `DocumentCorners` — detection result

Four corners, **always** ordered top-left → top-right → bottom-right →
bottom-left regardless of what order the native engine returned — the
package re-derives this order geometrically (`DocumentCorners.fromUnordered`)
rather than trusting Vision/OpenCV's native vertex order, specifically
because the two engines are inconsistent with each other here.

Key members: `topLeft`/`topRight`/`bottomRight`/`bottomLeft` (each a
`ScanPoint = ({double x, double y})` record, normalized 0..1),
`confidence` (nullable `double`, **not comparable across platforms** —
iOS is Vision's own probability, Android is a geometric heuristic with a
~0.4 floor), `area` (shoelace formula), `isConvex`, `longestEdge`,
`toPixels(width, height)`, `copyWith(...)`, `toList()` (draw order:
TL, TR, BR, BL).

### `DocumentProcessor` — pure-Dart warp + filter + encode

`const` constructible and stateless — safe to share one instance
app-wide (or reuse `DocumentScanner.processor`).

```dart
Future<ScannedDocument?> crop(
  ScanInput input,
  DocumentCorners corners, {
  ScanFilter filter = ScanFilter.none,       // NOT enhance — see Core Rules
  ScanOutputFormat output = ScanOutputFormat.png,
  int? maxDimension = defaultMaxDimension,    // = 2000
  bool background = false,                    // NOT true — see Core Rules
})
```
- Output resolution matches the document's real edge-length proportions
  (aspect-preserving), long side capped at `maxDimension`; pass `null` to
  warp at full resolution.
- `background: true` routes the CPU-heavy warp+filter+encode through
  `Isolate.run`. Confirmed from source: the processor is **reconstructed
  inside the spawned isolate** rather than captured across the boundary,
  and `Isolate.run` **copies** everything it does capture — so a
  `BytesScanInput` pays a full duplicate of its byte buffer on every
  `background: true` call, while a `FileScanInput` only copies a path
  string (much cheaper). Prefer file paths over raw bytes when routing
  through `background: true` at scale.
- There is a debug-only `assert(maxDimension == null || maxDimension >= 1)`
  guarding this parameter — asserts are stripped in release builds, so an
  invalid `maxDimension` passed from untrusted/computed input will not be
  cleanly rejected in a release build. Validate it yourself before the
  call if the value isn't a compile-time constant.
- Returns `null` if `input` can't be decoded.
- **Since 0.3.0**, this performs a true projective/homography perspective
  correction (previously an incorrect bilinear blend). Degenerate quads
  fall back to the old bilinear map; non-finite coordinates are clamped
  (so a bad quad yields a bad-but-non-crashing crop).

```dart
Future<ScannedDocument?> applyFilter(
  ScanInput input,
  ScanFilter filter, {
  ScanOutputFormat output = ScanOutputFormat.png,
  bool background = false,
})
```
Re-filters an **already-cropped** image without re-warping — the
documented, intended way to let a user cycle through filter previews
cheaply (this is exactly what the example app's "Reprocess" screen does).

```dart
Future<ScannedDocument?> pagesToPdf(List<ScannedDocument> pages)
```
Combines several scans into one multi-page PDF, one A4 page per scan, in
input order. **Confirmed from source: each page's `bytes` is embedded
directly, with no re-decode** — so `pages` must be PNG/JPEG-encoded
`ScannedDocument`s (i.e., produced with `output: ScanOutputFormat.png` or
`.jpeg`), never `ScanOutputFormat.pdf`-encoded ones. Returns `null` for an
empty list. The returned `ScannedDocument.width`/`.height` are copied from
the *first* page only — a PDF has no single pixel size, this is just
metadata bookkeeping, not a claim about the whole document's dimensions.

`defaultMaxDimension` (`const int`, currently 2000): documented rationale
is that a scan is legible/OCR-ready well below a full ~4000px sensor
photo, and the warp is an O(pixels) pure-Dart bilinear sample, so capping
keeps the common case fast.

### `ScanFilter` (enum) — post-crop looks

| Value | Effect |
|---|---|
| `none` | Untouched cropped color image. |
| `grayscale` | Desaturated only. |
| `enhance` | Grayscale + contrast boost + full-range histogram stretch. **Default for `DocumentScanner.scan()`.** Not hard-binarized. |
| `blackWhite` | Hard black & white via one **global Otsu threshold** — crisp on an evenly-lit page; smears under shadows/gradients (single global cut). Behavior fixed in 0.3.0 (previously did not actually binarize). |
| `sharpen` | Edge sharpening for crisper text. |
| `magicColor` | Adaptive, **per-region** Otsu-style thresholding — the filter to reach for under uneven lighting/shadows, where `blackWhite` fails; "the look most scanner apps mean by enhance." |

### `ScanOutputFormat` — encoding

`static const` values `.png` (default, lossless), `.jpeg` (quality 90),
`.pdf` (single-page A4); `ScanOutputFormat.jpegAt(int quality)` factory
for a specific 1..100 JPEG quality. `quality` is ignored for PNG/PDF.

### `DocumentScanner` — one-call façade

```dart
DocumentScanner({DocumentDetector? detector, DocumentProcessor processor = const DocumentProcessor()})
```
Both collaborators injectable — this is the primary seam for unit testing
(see "Testing").

```dart
Future<ScannedDocument?> scan(
  ScanInput input, {
  DocumentCorners? corners,
  ScanFilter filter = ScanFilter.enhance,
  ScanOutputFormat output = ScanOutputFormat.png,
  int? maxDimension = DocumentProcessor.defaultMaxDimension,
  bool background = true,
  DetectionSensitivity sensitivity = DetectionSensitivity.lenient,
})
```
Confirmed source: if `corners` is `null`, detects first (using
`sensitivity`, ignored if `corners` is supplied) and returns `null` when
nothing is found; otherwise crops directly with the given corners,
skipping detection entirely — this is the path for a user-adjusted quad.

```dart
Future<DocumentCorners?> detectCorners(ScanInput input, {DetectionSensitivity sensitivity = DetectionSensitivity.balanced})
```
Detect-only, no crop — for showing the quad for user confirmation/edit
before calling `scan(input, corners: edited)`.

### `DetectionSensitivity` (enum: `strict`/`balanced`/`lenient`)

A portable control mapped to different native thresholds per platform
(Vision confidence + min-size on iOS; contour-area/adaptive-Canny-band/
corner-angle/score-floor on Android) — pick by *context*, not platform:

| Context | Default used by | Why |
|---|---|---|
| Live overlay | `detectStream` → `strict` | Don't snap onto tabletops/shadows while framing. |
| One-shot scan of a chosen file | `scan()` → `lenient` | User already committed — missing it is worse than a rare false positive. |
| Preview corners you're about to show | `detectCorners()`/`detect()` → `balanced` | A wrong quad the user must drag back is worse than no quad. |

### `DetectionEvent` (sealed) — `detectStream` outcomes

`DetectionSuccess(DocumentCorners corners)`, `DetectionEmpty()` (no
document — normal, not an error), `DetectionSkipped()` (dropped under
backpressure/rate-cap — normal, ignore), `DetectionError(Object error,
[StackTrace? stackTrace])` (native threw for this frame — log it, stream
stays alive).

### `CornerStabilizer` — EMA overlay smoothing

```dart
CornerStabilizer({double smoothing = 0.5, double resetDistance = 0.2})
```
`smoothing` is the weight given to the *new* frame each step: `1.0`
disables smoothing entirely (always raw), lower values are steadier but
laggier. A corner jump beyond `resetDistance` snaps instead of gliding.
Holds one frame of state — use one instance per session, `reset()` (or
rely on the built-in jump-snap) between unrelated sessions.

### `AutoCaptureAnalyzer` — steady-hold auto-capture signal

```dart
AutoCaptureAnalyzer({int requiredSteadyFrames = 2, double minConfidence = 0, double minArea = 0.10, double maxJitter = 0.08})
```
A frame "qualifies" when a document is present, convex, `area >=
minArea`, and `confidence >= minConfidence`. Fires `ready` after
`requiredSteadyFrames` consecutive qualifying **and** steady
(movement `< maxJitter`) frames, then **latches** until the document
leaves or moves significantly — one hold produces one capture, not a
burst (this exact bug — a skipped frame re-firing `ready` — was present
before 0.3.0 and is now fixed). `minConfidence` defaults to `0`, i.e. no
confidence gating unless you opt in — and if you do, tune it per platform
(see confidence non-comparability above).

`add(corners)` / `addEvent(DetectionEvent)` (preferred — preserves the
Skipped/Error distinction that flattening to `DocumentCorners?` would
erase) / `bindCorners(Stream<DocumentCorners?>)` /
`bindEvents(Stream<DetectionEvent>)` (preferred convenience wrapper) /
`reset()` (call after a successful capture so the next document requires
a fresh countdown).

`AutoCaptureState`: `{status: AutoCaptureStatus (searching/detecting/ready),
corners, steadyFrames, shouldCapture}` — `shouldCapture` is a convenience
bool over `status == AutoCaptureStatus.ready`.

### `ScanSession` / `ScannedPage` — multi-page container

`ScanSession({List<ScannedPage> pages = const []})` — an **immutable**
value type (no `ChangeNotifier`); `add`/`removeAt`/`reorder(oldIndex,
newIndex)` (ReorderableListView semantics — `newIndex` computed before
removal, clamped if out of range)/`replaceAt`/`clear` **each return a new
session** — you must reassign the result. `ScannedPage({required
ScannedDocument document, DocumentCorners? corners})` keeps the corners a
page was cropped from, for later re-crop/edit.

## Recommended Architecture

Keep `document_scan` out of widget code. The package's own design —
injectable `DocumentDetector`/`DocumentProcessor` — is a strong signal
that a thin service/repository layer is the intended integration point,
not incidental advice:

```dart
abstract interface class DocumentScanService {
  Future<ScannedDocument?> scanFile(String path);
  Stream<DetectionEvent> watch(Stream<ScanInput> frames);
  Future<ScannedDocument?> crop(
    ScanInput input,
    DocumentCorners corners, {
    ScanFilter filter,
  });
}

class DocumentScanServiceImpl implements DocumentScanService {
  DocumentScanServiceImpl({DocumentScanner? scanner, DocumentDetector? detector})
      : _scanner = scanner ?? DocumentScanner(),
        _detector = detector ?? DocumentDetector();

  final DocumentScanner _scanner;
  final DocumentDetector _detector;

  @override
  Future<ScannedDocument?> scanFile(String path) =>
      _scanner.scan(ScanInput.file(path));

  @override
  Stream<DetectionEvent> watch(Stream<ScanInput> frames) => _detector.detectStream(
        frames,
        stabilize: CornerStabilizer(),
        minInterval: const Duration(milliseconds: 100),
      );

  @override
  Future<ScannedDocument?> crop(
    ScanInput input,
    DocumentCorners corners, {
    ScanFilter filter = ScanFilter.enhance,
  }) =>
      _scanner.processor.crop(input, corners, filter: filter, background: true);
}
```

This gives you: one place to pin app-wide policy (default filter,
`minInterval`, sensitivity), a seam for unit tests (inject a stub
`DocumentDetector`/`DocumentScanner`), and a clean boundary between "raw
camera plumbing" (owned entirely by your app, outside this package) and
"scanning logic." Put the small, fiddly `CameraImage → ScanInput`
conversion (plane extraction, YUV vs. BGRA branching) in its own tested
function — it's the one piece of glue code this package doesn't provide
for you.

## Canonical Implementation

```dart
import 'dart:async';
import 'package:document_scan/document_scan.dart';
import 'package:flutter/material.dart';

class GalleryScanFlow extends StatefulWidget {
  const GalleryScanFlow({super.key, required this.photoPath});
  final String photoPath;

  @override
  State<GalleryScanFlow> createState() => _GalleryScanFlowState();
}

class _GalleryScanFlowState extends State<GalleryScanFlow> {
  final _scanner = DocumentScanner();
  ScannedDocument? _result;
  bool _loading = false;
  String? _error;

  Future<void> _runScan() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final scan = await _scanner.scan(ScanInput.file(widget.photoPath));
      if (!mounted) return;
      setState(() {
        _result = scan; // null == "no document detected", not an error
        _loading = false;
      });
    } catch (e, st) {
      // Only an unexpected channel error reaches here (e.g. a genuine
      // native exception, or an unsupported-platform MissingPluginException).
      debugPrint('document_scan failed: $e\n$st');
      if (!mounted) return;
      setState(() {
        _error = 'Something went wrong while scanning. Please try again.';
        _loading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _runScan();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    if (_result == null) {
      return const Center(child: Text('No document detected — try again.'));
    }
    return Image.memory(_result!.bytes);
  }
}
```

Notes on why this shape is correct: `mounted` is checked before every
`setState` after an `await` (standard Flutter async-safety, not
package-specific); `null` from `scan()` is treated as an expected UI
state, not funnelled into the `catch` block; only the `try`/`catch`
around the *call itself* handles genuine exceptions, matching the
documented "throws only on an unexpected channel error" contract.

## State Management Integration

Every value document_scan hands back — `DocumentCorners`, `ScannedDocument`,
`AutoCaptureState`, `ScanSession` — is an immutable value type with value
equality, so it drops cleanly into whatever you already use: `setState`,
a `ValueNotifier`, a `ChangeNotifier`-based controller, a Bloc/Cubit state
class, or a Riverpod provider. The package's own example app deliberately
uses plain `StatefulWidget` throughout, to keep the demo about the API
rather than state-management plumbing — that is a reasonable default for
small scan screens, and nothing about the package requires more.

For a scanning flow with a live overlay, a Cubit-shaped controller is a
representative pattern (swap for your team's actual framework — the
principle, not the framework, is what matters):

```dart
sealed class ScanOverlayState {}
class ScanSearching extends ScanOverlayState {}
class ScanShowingCorners extends ScanOverlayState {
  ScanShowingCorners(this.corners);
  final DocumentCorners corners;
}
class ScanReadyToCapture extends ScanOverlayState {}

class ScanOverlayController {
  ScanOverlayController(this._detector, this._analyzer);
  final DocumentDetector _detector;
  final AutoCaptureAnalyzer _analyzer;
  final _controller = StreamController<ScanOverlayState>.broadcast();
  StreamSubscription<DetectionEvent>? _sub;

  Stream<ScanOverlayState> get states => _controller.stream;

  void start(Stream<ScanInput> frames) {
    final stabilizer = CornerStabilizer();
    _sub = _detector
        .detectStream(frames, stabilize: stabilizer, minInterval: const Duration(milliseconds: 100))
        .listen(
      (event) {
        final capture = _analyzer.addEvent(event);
        if (capture.shouldCapture) {
          _controller.add(ScanReadyToCapture());
        } else if (event case DetectionSuccess(:final corners)) {
          _controller.add(ScanShowingCorners(corners));
        } else {
          _controller.add(ScanSearching());
        }
      },
      onError: (Object e, StackTrace st) => debugPrint('scan stream error: $e'),
    );
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    await _controller.close();
  }
}
```

## Error Handling

| Source | Behavior | What to do |
|---|---|---|
| `DocumentDetector.detect()` / `DocumentScanner.scan()` (single-shot) | Throws on a genuine unexpected channel error. | `try`/`catch` at the call site; log the raw error+stack, show a generic retry message. |
| `detect()`/`scan()` returning `null` | Expected outcome — no document found. | Not an error path: show a specific "no document detected" prompt, not a generic error. |
| `detectStream` — per-frame native failure | Emitted as `DetectionError(error, stackTrace)`; stream stays alive. | Log for diagnostics; don't surface a blocking error UI for a single bad frame. |
| `detectStream` — your own `frames` source throws | Propagates as a real stream error (`addError`), **not** a `DetectionEvent`. | Always add `onError:` to your `.listen()` call, separate from the `DetectionEvent` switch. |
| `DetectionEmpty` | Normal "nothing in view yet." | Ambient hint only ("Point at a document") — never an error state. |
| `DetectionSkipped` | Normal backpressure/rate-cap drop. | Ignore entirely. |
| `crop()`/`applyFilter()` returning `null` | Undecodable input. | Null-check before using `.bytes`; surface a "couldn't process that image" message. |
| `pagesToPdf()` returning `null` | Empty `pages` list. | Guard the export action so it can't be invoked with zero pages. |

## Permissions

**The package requests none of its own** — no Android manifest
permissions, no iOS privacy-manifest accessed APIs, no data
collection/tracking declarations. Detection runs entirely against the
bytes/frames you hand it, on-device.

Any permission your app needs comes from **your capture layer**, not from
`document_scan`:
- Using the `camera` package → you own its `CAMERA` Android permission
  and its `NSCameraUsageDescription` Info.plist entry.
- Using `image_picker` for gallery import → you own its own
  permission/plist requirements.
- Only feeding the package file paths you already have (no camera/gallery
  picker at all) → you may need no permissions whatsoever for the
  scanning feature itself.

Because of this, a permission-denied crash or App Store rejection in a
scanning flow almost always traces back to the *capture* package, not to
`document_scan` — don't spend debugging time inside this package's own
config for a permission problem.

## Lifecycle Safety

- Always cancel a `detectStream` subscription in `dispose()`. The stream's
  own backpressure/close logic is safe against races (confirmed from
  source: emission is guarded by `!controller.isClosed`, and the
  controller only closes once the source is done and idle), but an
  uncancelled subscription keeps running native detection after your
  screen is gone, burning battery/CPU for nothing.
- Because cancelling your subscription also cancels the underlying
  `frames` source subscription (confirmed from source), a clean
  `await sub.cancel()` in `dispose()` reliably stops further native calls.
- Still guard listener callbacks with a `mounted`/"still active" check
  before calling `setState`/navigation — a frame already in flight when
  you start disposing can still deliver one final event before
  cancellation fully propagates. This is standard Flutter async-safety
  practice, not a package-specific requirement, but it matters here
  because detection is asynchronous per frame.
- `CornerStabilizer` and `AutoCaptureAnalyzer` hold only small in-memory
  state and need no explicit disposal beyond dropping the reference —
  create fresh instances per scanning session (e.g., in `initState`) so
  stale EMA/steadiness state from a previous session can't leak into a
  new one.
- `DocumentDetector` holds no native resources beyond a `MethodChannel`
  reference — safe to keep one long-lived instance for the app's whole
  lifetime (e.g., inside your service class) rather than recreating it
  per screen.
- `DocumentProcessor` is `const`-constructible and stateless; reuse a
  single shared instance freely.
- A `background: true` `crop`/`scan` in flight via `Isolate.run` does not
  know about your widget tree and will complete regardless of navigation —
  guard the `await`'s continuation with a "still mounted/still relevant"
  check before acting on the result.

## Performance Best Practices

**MUST**
- Cap `detectStream` with `minInterval` (~100ms) for any live-camera
  overlay — documented, not optional guidance.
- Let `DocumentScanner.scan()`'s `background: true` default stand for
  UI-triggered one-shot scans.

**SHOULD**
- Pass `background: true` explicitly when calling `DocumentProcessor.crop`/
  `applyFilter` directly (their own defaults are `false`, unlike the
  façade) — unless you're already on a background isolate, in which case
  leave it `false` to avoid a redundant isolate hop (documented).
- Prefer `ScanInput.file(path)` over `ScanInput.bytes(...)` for anything
  going through `background: true` — `Isolate.run` copies captured data,
  and a path string is far cheaper to copy than a full image buffer
  (documented, source-confirmed).
- Leave `maxDimension` at its 2000px default unless you have a specific
  reason to change it — legibility/OCR-readiness plateaus well below
  full-sensor resolution, and warping is O(pixels) pure-Dart work
  (documented rationale).
- On Android release builds, restrict OpenCV's bundled ABIs to what you
  actually ship (see "Platform Configuration → Android").
- Reuse `applyFilter()` on an already-cropped `ScannedDocument` when a
  user is only swapping filters — this only re-runs the filter, not
  detection or the perspective warp (documented, and this is literally
  what the class exists for).

**AVOID**
- Re-running `crop()` from the original photo just to preview a different
  filter — wasteful; use `applyFilter()` instead.
- Setting the underlying camera preview's `ResolutionPreset` to
  `veryHigh`/`max` purely to "improve detection" — detection internally
  caps at ~720px on Android and uses resolution-relative gates on iOS, so
  `ResolutionPreset.high` is already "plenty" for the *live overlay*
  (documented). This does **not** mean you should shrink the actual
  captured still used for the final `scan()`/`crop()` call — that
  determines your real output quality (up to `maxDimension`) and should
  stay high-resolution; only the continuous detection stream benefits
  from staying modest.

## Memory and Image Handling

- `ScannedDocument.bytes` is a full encoded image held in Dart memory
  (PNG by default — larger than JPEG for the same content). A multi-page
  `ScanSession` accumulates one such buffer per page; for sessions with
  many pages, consider `ScanOutputFormat.jpeg`/`.jpegAt(quality)` for the
  working pages you hold in memory, reserving the final PNG/PDF export for
  the export step (engineering recommendation — no specific package
  guidance on this trade-off was found, but it follows directly from
  `ScannedDocument`'s documented structure).
- Every `crop`/`applyFilter` call fully re-decodes its `input` — there is
  no internal caching of decoded buffers between calls. The one
  documented reuse path is `applyFilter()` operating on an
  already-cropped output, not a general "decode once" primitive.
- No temp files are created or need cleanup by this package — it returns
  only in-memory bytes. Any temp files come from whatever capture package
  you used to *get* the source photo (e.g., `image_picker`'s own temp
  file), and cleaning those up is that package's concern, not
  `document_scan`'s.

## Privacy and Security

- The entire pipeline is on-device: the package requests no permissions,
  declares no accessed APIs in its iOS privacy manifest, and its
  dependencies (`image`, `meta`, `pdf`) are pure-Dart with no networking.
  No scanned data leaves the device via anything inside this package
  (documented; consistent with the README's stated "Best for: Custom
  banking / KYC capture flows" use case).
- What happens to `ScannedDocument.bytes` after the package returns them —
  persistence, encryption at rest, upload, secure deletion — is entirely
  your app's responsibility. The package holds nothing after the call
  returns.
- For sensitive-document use cases (IDs, financial forms), avoid logging
  full `bytes` or raw corner/confidence data to analytics or crash
  reporting in production; log only high-level outcomes (success /
  no-document / error-type).
- If you cache intermediate pages to disk for a large multi-page session
  (to reduce memory pressure — see above), treat those temp files with
  the same sensitivity as the final exported document, and clear them
  once the session is exported or abandoned. This is a general
  engineering recommendation, not package-specific guidance.

## Testing

`document_scan`'s constructor-level dependency injection makes most of
this package's logic testable **without a device**:

**Unit-testing `DocumentDetector`'s stream logic** (backpressure, rate
limiting, error propagation) by injecting your own named channel — you do
not need to know the package's real internal channel name for this
pattern, because the *injected* channel is the one `detect()` actually
calls through:

```dart
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:document_scan/document_scan.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('detect() returns null when the native side finds nothing', () async {
    final testChannel = MethodChannel('test/document_scan');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(testChannel, (call) async => null);

    final detector = DocumentDetector(channel: testChannel);
    final result = await detector.detect(ScanInput.file('irrelevant.jpg'));

    expect(result, isNull);
  });

  test('detectStream drops overlapping frames as DetectionSkipped', () async {
    // Feed a handler with an artificial delay to force overlap, then assert
    // the second-in-flight frame yields DetectionSkipped rather than being
    // queued — exercises the documented busy-guard behavior directly.
  });
}
```

**Unit-testing orchestration logic** (your own service class, or
`DocumentScanner` itself) by injecting a stub `DocumentDetector` built the
same way — a real `DocumentDetector` with a stub channel, rather than a
mocked class, so you stay within the package's own documented seam:

```dart
test('scan() skips detection when corners are supplied', () async {
  var detectFileCalled = false;
  final testChannel = MethodChannel('test/document_scan_2');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(testChannel, (call) async {
    detectFileCalled = true;
    return null;
  });

  final scanner = DocumentScanner(detector: DocumentDetector(channel: testChannel));
  final corners = DocumentCorners(
    topLeft: (x: 0.1, y: 0.1),
    topRight: (x: 0.9, y: 0.1),
    bottomRight: (x: 0.9, y: 0.9),
    bottomLeft: (x: 0.1, y: 0.9),
  );

  await scanner.scan(
    ScanInput.bytes(Uint8List(0), width: 1, height: 1),
    corners: corners,
  );

  expect(detectFileCalled, isFalse); // detection was skipped, as documented
});
```

**Fully unit-testable without any channel at all:** `DocumentProcessor`
(pure Dart — feed known bytes/corners, assert on output
dimensions/non-null), `CornerStabilizer` (feed a synthetic corner
sequence, assert smoothing/reset behavior), and `AutoCaptureAnalyzer`
(feed synthetic `DocumentCorners`/`DetectionEvent` sequences via `add`/
`addEvent`, assert on the resulting `AutoCaptureState.status`/
`shouldCapture` sequence, including the "fires once per hold, then
latches" behavior).

**Requires a real device/emulator:**
- Actual detection accuracy of Vision/OpenCV against real photographs.
- Real `camera`-package `CameraImage` plane layouts (YUV strides on a
  specific device, BGRA byte layout on a specific iOS device) feeding into
  `ScanInput.yuvFrame`/`.bgraFrame` — this conversion code is exactly the
  kind of thing worth an integration test on both platforms, since a
  wrong stride/plane mapping fails silently as "no document found" rather
  than a clear error.
- Real permission and camera-lifecycle interplay — but note this tests
  your *capture layer* (e.g. the `camera` package), not `document_scan`
  itself, which has no lifecycle of its own to test here.

There is nothing package-specific to "widget test" — `document_scan`
ships no widgets. Widget tests in a scanning feature exercise your own
overlay painters/buttons reacting to `DocumentCorners`/`AutoCaptureState`,
which is ordinary Flutter widget testing, not something this skill needs
to add guidance for.

## Common Mistakes

**Mistake:** Dropping from `DocumentScanner.scan()` to
`DocumentProcessor.crop()` directly and getting an unfiltered, unenhanced
image back.
**Why it fails:** `crop()`'s own default is `filter: ScanFilter.none`, not
`ScanFilter.enhance` — the enhanced default lives on the façade, not the
primitive.
**Correct approach:** Pass `filter: ScanFilter.enhance` explicitly when
calling `crop()` to reproduce `scan()`'s look. *(Documented.)*

**Mistake:** Building a multi-page PDF from pages that were individually
scanned with `output: ScanOutputFormat.pdf`.
**Why it fails:** `pagesToPdf()` embeds each page's `bytes` as-is, without
decoding — feeding it already-PDF-encoded bytes as if they were an image
produces a corrupt/broken output document.
**Correct approach:** Scan working pages as PNG or JPEG
(`ScanOutputFormat.png`/`.jpeg`) and only reach for `.pdf` on the final,
single combined export. *(Source-derived from the `pagesToPdf`
implementation.)*

**Mistake:** `session.add(newPage);` with no reassignment, then wondering
why the session never grows.
**Why it fails:** `ScanSession` is an immutable value type — every mutator
returns a *new* session and leaves the original untouched.
**Correct approach:** `session = session.add(newPage);` (or store it in
whatever state container you use). *(Documented; standard immutable-type
usage.)*

**Mistake:** Feeding BGRA frames into `detectStream` on Android, or YUV
frames on iOS.
**Why it fails:** the realtime path is platform-restrictive — iOS accepts
BGRA only, Android accepts YUV420 or BGRA — a mismatched format will not
detect correctly even though it compiles.
**Correct approach:** branch your camera-frame conversion by
`Platform.isIOS`/`Platform.isAndroid` and use `ScanInput.bgraFrame`/
`.yuvFrame` accordingly (as the README's own "Building a camera frame"
example does). This restriction does not apply to file/bytes-based scans.
*(Documented.)*

**Mistake:** Hardcoding one `minConfidence` value for `AutoCaptureAnalyzer`
(or any manual confidence gate) and expecting the same feel on both
platforms.
**Why it fails:** `confidence` means different things per platform — a
true probability on iOS vs. a geometric heuristic with a ~0.4 floor on
Android — the same numeric threshold is not equivalent behavior on both.
**Correct approach:** tune (or omit) confidence-based gating per platform
if you rely on it, rather than sharing one constant. *(Documented, README
"Platform differences.")*

**Mistake:** Passing a runtime-computed, potentially-invalid
`maxDimension` (e.g., `0` or negative) straight into `crop()` in a release
build.
**Why it fails:** the parameter is only guarded by a debug-only `assert`,
which is stripped in release builds — invalid input isn't cleanly
rejected there.
**Correct approach:** validate `maxDimension` yourself (e.g., `>= 1` or
`null`) before the call if it isn't a compile-time constant. *(Source-
derived: the `assert` is visible in the published implementation; Dart's
release-mode assert-stripping is general-knowledge Dart behavior.)*

**Mistake:** Expecting `NSCameraUsageDescription`/Android `CAMERA`
permission errors to be fixed by changing something in `document_scan`'s
own setup.
**Why it fails:** the package requests no permissions of its own — those
errors originate in whichever capture package (e.g. `camera`,
`image_picker`) your app uses.
**Correct approach:** fix the permission/plist configuration of the
actual capture package. *(Documented, README "Permissions.")*

**Mistake:** Calling `detect`/`scan`/`detectStream` on macOS, Windows,
Linux, or Web.
**Why it fails:** the plugin only registers a native implementation for
Android and iOS; there is nothing on the other end of the channel.
**Correct approach:** gate any document-scanning entry points to
Android/iOS in your UI, or provide an alternative flow on other platforms.
*(Documented platform support; the specific resulting exception type is
an engineering inference, not independently confirmed.)*

## Troubleshooting

| Symptom | Likely cause | Solution |
|---|---|---|
| `scan()`/`detect()` always returns `null` for photos that clearly contain a document | `sensitivity` too strict for the context, or the document is near the frame edge / has a low-contrast background | Try `DetectionSensitivity.lenient`; check the README's documented aspect/size gating differences (iOS rejects very wide/landscape documents more aggressively than Android). |
| Live overlay quad is present but jitters visibly every frame | No `CornerStabilizer` passed to `detectStream` | Pass `stabilize: CornerStabilizer()`; tune `smoothing`/`resetDistance` if it's too laggy or too twitchy. |
| Auto-capture fires repeatedly for the same held document | Old `AutoCaptureAnalyzer.addEvent` bug (pre-0.3.0) where a `DetectionSkipped` re-echoed `ready` | Upgrade to `>=0.3.0`, where a skip reports `detecting`/`searching` instead of re-firing `ready`. |
| Scanned text looks subtly warped/bent, especially on an angled photo | Using a version below 0.3.0, which used an incorrect bilinear (non-perspective) crop | Upgrade to `>=0.3.0` for the true homography-based perspective correction. |
| `ScanFilter.blackWhite` doesn't actually produce black-and-white output | Using a version below 0.3.0 | Upgrade — `blackWhite` was fixed to actually Otsu-binarize in 0.3.0. |
| App crashes/throws on desktop or web when calling `detect`/`scan` | Platform not supported — no native implementation registered | Restrict the scanning entry point to Android/iOS builds. |
| `crop`/`applyFilter` with `background: true` janks the UI anyway | Called from an environment where `Isolate.run` can't help (e.g. Web, where it has no implementation), or `background: true` was actually left `false` | Confirm the target platform is Android/iOS; confirm `background: true` is actually being passed — it is *not* the default on `crop`/`applyFilter` (only on the `scan()` façade). |
| Multi-page PDF export is corrupt/won't open | A page passed to `pagesToPdf()` was itself PDF-encoded (`ScanOutputFormat.pdf`) | Re-scan working pages as PNG/JPEG; reserve `.pdf` for the single final `pagesToPdf()` call. |
| `ScanSession` never seems to accumulate added pages | Mutator result (`session.add(page)`) discarded instead of reassigned | `session = session.add(page);` — `ScanSession` is immutable. |
| Detection works from the gallery/file picker but never from the live camera stream | Wrong `ScanInput` frame factory for the platform (BGRA vs. YUV mismatch), or missing/incorrect plane strides | Re-check `ScanInput.bgraFrame`/`.yuvFrame` usage against the actual `CameraImage` planes for the current platform; this restriction only affects the live-frame path, not `ScanInput.file`/`.bytes`. |
| Android release build size grows a lot after adding this package | OpenCV's native `.so` bundled for every ABI | Restrict release ABIs (`splits { abi { ... } }`) to what you actually ship. |
| Gradle build fails with a `minSdkVersion` manifest-merge error after adding this package | Your app's own `minSdkVersion` is below the floor this plugin's Android module declares | Read the exact required floor from Gradle's own error message (it names it explicitly), and raise your app's `minSdkVersion` to match — see "Platform Configuration → Android" for why this floor wasn't pre-stated here. |

## Upgrade Checklist

Given the release cadence documented in this package's own ROADMAP.md
("a patch or minor release roughly every few weeks"), treat every version
bump as worth a real check, not a blind bump:

- [ ] Read `CHANGELOG.md` for the specific version range being crossed —
      this package has already shipped at least one **behavior-changing,
      non-API-breaking** release (0.3.0: perspective-correction algorithm
      and `blackWhite` filter behavior both changed silently from the
      type system's point of view).
- [ ] Re-diff the README/dartdoc "Filters" table and "Platform
      differences" section against what's currently documented in this
      skill — both have been edited between versions in this package's
      own history.
- [ ] Confirm `image`/`meta`/`pdf` transitive dependency versions still
      resolve cleanly (`dart pub outdated`); this package's own 0.3.1
      release specifically called out re-verifying against a fresh
      `image`/`pdf` resolve, including the EXIF-orientation contract the
      crop depends on.
- [ ] Re-check Android `minSdkVersion` and any iOS deployment-target floor
      declared by the newly-resolved package version (see "Platform
      Configuration" — these were not independently verified for 0.3.1 in
      this research pass and could change between versions regardless).
- [ ] Re-run any tests built against injected `MethodChannel`/`DateTime`
      clocks in `DocumentDetector` — these constructor parameters are a
      public, documented seam, but confirm they're still present with the
      same signature after an upgrade.
- [ ] Regression-test on a real Android device and a real iOS device —
      the native detection engines (OpenCV pipeline, Vision gating) are
      exactly the part of this package most likely to change behavior
      between releases without a Dart-level API change.

## Pre-Commit Checklist

- [ ] No hardcoded guess at this package's internal channel name, Android
      `minSdkVersion`, or iOS deployment target anywhere in app code or
      build config — verified against the actually-resolved package
      version instead (see "Platform Configuration").
- [ ] Every `detectStream` subscription has a matching cancellation in the
      owning widget/controller's teardown path.
- [ ] Every `detectStream(...).listen(...)` call has an `onError` handler,
      separate from the `DetectionEvent` switch (covers the source-stream
      error case that is *not* converted to a `DetectionError` event).
- [ ] `crop`/`applyFilter` calls from UI code pass `background: true`
      unless there's a specific, noted reason not to (their defaults are
      `false`, unlike the `scan()` façade).
- [ ] If dropping from `scan()` to `crop()` for any call site, `filter:
      ScanFilter.enhance` is passed explicitly if equivalent output is
      expected.
- [ ] Only PNG/JPEG-encoded `ScannedDocument`s are ever passed into
      `pagesToPdf()`.
- [ ] `ScanSession` mutator results are always reassigned, never
      discarded.
- [ ] Live-frame `ScanInput` construction branches correctly by platform
      (`bgraFrame` iOS / `yuvFrame` or `bgraFrame` Android) and passes real
      plane strides, not assumed/zeroed ones, where the source camera
      frame's actual stride differs from its width.
- [ ] Any manual `minConfidence`/confidence-based gating is either omitted
      or explicitly tuned per platform, with a comment noting why.
- [ ] Camera/gallery permission handling lives entirely in the app's own
      capture layer, with no assumption that `document_scan` handles or
      needs any permission itself.
- [ ] Android release build ABI splits are configured if app size matters
      for this target.

## Agent Workflow

When asked to add, modify, or debug `document_scan` usage in an existing
Flutter repository:

1. Inspect `pubspec.yaml` for the currently pinned/resolved
   `document_scan` version.
2. If a version is installed, prefer reading that exact version's own
   README/CHANGELOG/dartdoc over this skill's cached facts wherever they
   might have drifted (see "Upgrade Checklist" for what's most likely to
   have changed).
3. Inspect current usage: is the code calling `DocumentScanner.scan()`
   (façade) or the lower-level `DocumentDetector`/`DocumentProcessor`
   primitives directly? Note that their defaults differ (see "Core
   Rules") before changing anything.
4. Identify which platforms the change targets — remember this package is
   Android/iOS only; flag any code path that assumes it works elsewhere.
5. Inspect native platform configuration only if the task involves build
   failures, app size, or permission issues — for ordinary Dart-level
   feature work, no platform configuration changes should be needed at
   all, since the package itself requires none.
6. Compare any minSdk/deployment-target assumptions in the project against
   the resolved package's own declared values (see "Platform
   Configuration") rather than trusting a previously-hardcoded number.
7. Preserve the existing project's architecture — if a
   service/repository abstraction around `document_scan` already exists,
   extend it rather than introducing direct widget-level calls.
8. Implement the smallest correct change, respecting the documented
   default-parameter differences between the façade and the primitives.
9. Run static analysis (`dart analyze`/`flutter analyze`).
10. Run relevant tests — prefer the injected-channel/injected-detector
    unit-test patterns in "Testing" for anything that doesn't strictly
    require real native detection accuracy.
11. Verify on an actual Android and/or iOS device/emulator when the
    change touches detection accuracy, live-stream frame handling, or
    auto-capture timing — this is the part of the stack most sensitive to
    real hardware/native-engine behavior.
12. Explicitly report any assumption that could not be verified from the
    installed package's own source (e.g., an unverified minSdk/deployment
    target) rather than presenting it as confirmed fact.

## Sources

- pub.dev package page — https://pub.dev/packages/document_scan (README,
  version 0.3.1, platform badges, dependency list)
- pub.dev Score/analysis page — https://pub.dev/packages/document_scan/score
  (platform-support verification, dependency-freshness check, pub points)
- pub.dev CHANGELOG — https://pub.dev/packages/document_scan/changelog
- pub.dev example — https://pub.dev/packages/document_scan/example
- pub.dev Dart API reference (library index and every class/enum/method
  page referenced above, including embedded source "Implementation"
  snippets) — https://pub.dev/documentation/document_scan/latest/
- GitHub repository — https://github.com/Ozdemiroguz/document_scan
- GitHub `pubspec.yaml` (SDK constraints, plugin platform registration,
  dependency versions) — https://github.com/Ozdemiroguz/document_scan/blob/main/pubspec.yaml
- GitHub `CHANGELOG.md` (full version history 0.1.0 → 0.3.1) —
  https://github.com/Ozdemiroguz/document_scan/blob/main/CHANGELOG.md
- GitHub `ROADMAP.md` (release cadence, shipped/planned/explicitly-not-
  planned scope) — https://github.com/Ozdemiroguz/document_scan/blob/main/ROADMAP.md