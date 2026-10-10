---
name: flutter-doc-scanner
description: >
  Use when integrating, configuring, debugging, optimizing, or testing
  the flutter_doc_scanner Flutter package (Google Play Services ML Kit
  Document Scanner on Android and Apple VisionKit / AutoScan on iOS) for
  native document capture, multi-page image scanning, and PDF generation.
---

# flutter_doc_scanner Production Engineering Skill

## Purpose and Scope

Activate this skill whenever a Flutter task involves or references the
`flutter_doc_scanner` package (pub.dev), including:

- Integrating native document capture for physical documents, ID cards, receipts,
  invoices, or multi-page paperwork using native platform engines.
- Using or configuring `FlutterDocScanner`, `ImageScanResult`, `PdfScanResult`,
  `ImageFormat`, or handling `DocScanException`.
- Capturing scanned documents as high-resolution images (`getScannedDocumentAsImages`)
  or compiled multi-page PDFs (`getScannedDocumentAsPdf`).
- Utilizing fast single-picture zero-review scanning via
  `useAutomaticSinglePictureProcessing: true` (Android Base Mode & iOS AutoScan).
- Handling Android-specific content URIs vs iOS file paths.
- Configuring native host environments: Android Gradle (`compileSdk 34`, `minSdk 21`,
  Google Play Services ML Kit) and iOS (`NSCameraUsageDescription`, `VisionKit`, iOS 13+).
- Debugging native crashes (missing camera permission descriptions, missing Google Play
  Services, simulator incompatibilities, `SCAN_IN_PROGRESS` concurrency issues).
- Implementing proper file cleanup lifecycles to avoid iOS sandbox disk bloat.
- Writing unit, widget, and integration tests with mocked platform channels.

**Out of Scope:**
- Custom in-app camera viewfinder widgets with custom Flutter UI frames (use
  `document_camera_frame` or `camerawesome`).
- Pure headless edge-detection and perspective transformation on pre-existing image
  files without camera capture (use `document_scan`).
- Web, macOS, Windows, or Linux scanning — while package stubs exist, scanning is
  unsupported on desktop and web in v0.0.21.

---

## Verified Package Profile

- **Package Identity:** `flutter_doc_scanner`
- **Official pub.dev URL:** `https://pub.dev/packages/flutter_doc_scanner`
- **Official Repository:** `https://github.com/shirsh94/flutter_doc_scanner`
- **Publisher:** `shirsh.dev` (Shirsh Shukla)
- **Version Researched:** `0.0.21` (Published June 2024)
- **License:** MIT
- **SDK Constraints:** Dart `>=3.4.1 <4.0.0`, Flutter `>=3.3.0`
- **Platform Declarations (pubspec.yaml):**
  - `android`: `com.shirsh.flutter_doc_scanner.FlutterDocScannerPlugin`
  - `ios`: `SwiftFlutterDocScannerPlugin`
  - `macos`: `FlutterDocScannerPlugin` *(stub only)*
  - `linux`: `flutter_doc_scanner_plugin` *(stub only)*
  - `windows`: `FlutterDocScannerPluginCApi` *(stub only)*
  - `web`: `FlutterDocScannerWeb` *(stub only; throws `UnimplementedError` on scan)*
- **Core Dependencies:**
  - `flutter: sdk: flutter`
  - `plugin_platform_interface: ^2.0.2`
- **Native Platform Dependencies:**
  - Android: `com.google.android.gms:play-services-mlkit-document-scanner:16.0.0`
  - iOS: Apple `VisionKit` (`VNDocumentCameraViewController`), `AVFoundation`, `Vision`, `CoreImage`, `PDFKit`

---

## Core Engineering Rules

### 1. Platform & Environment Requirements
- **MUST NOT** call `flutter_doc_scanner` on Web, macOS, Windows, or Linux. The desktop
  implementations are empty stubs returning `FlutterMethodNotImplemented`, and Web
  methods throw `UnimplementedError`. Always guard scanner calls with
  `!kIsWeb && (Platform.isAndroid || Platform.isIOS)`.
- **MUST** declare `NSCameraUsageDescription` in `ios/Runner/Info.plist`. Failure to do
  so causes an immediate native `SIGABRT` crash upon presenting the camera.
- **MUST NOT** test scanner invocations on the iOS Simulator. Apple's `VisionKit`
  requires physical camera hardware and is unsupported on simulators.
- **MUST** ensure Android physical devices or emulators run Google Play Services with
  the Google APIs image. The underlying ML Kit scanner runs out-of-process in Google
  Play Services.

### 2. Method Selection & Data Types
- **MUST NOT** use the legacy `getScanDocuments()` method in production. It returns
  divergent shapes across platforms (`Map` containing PDF details on Android vs
  `List<String>` of image paths on iOS).
- **MUST** use `getScannedDocumentAsImages()` when images are required, and
  `getScannedDocumentAsPdf()` when a PDF document is required.
- **MUST NOT** call `getScanDocumentsUri()` on iOS. It is Android-only and explicitly
  throws `DocScanException(code: UNSUPPORTED_PLATFORM)` on iOS.
- **MUST** check for `null` return values. When the user cancels the scanning UI, the
  methods return `null` (not an exception).

### 3. Exception Handling & Concurrency
- **MUST** catch `DocScanException` rather than `PlatformException`. The plugin's
  internal method channel layer intercepts `PlatformException` and re-throws a custom
  `DocScanException`.
- **MUST** prevent concurrent scanner invocations. Android throws
  `DocScanException(code: SCAN_IN_PROGRESS)` if a second scan is triggered while another
  is running. Debounce user buttons and track scanning status in state.

### 4. File Storage & Memory Hygiene
- **MUST** implement explicit cleanup for scanned files on iOS. The iOS plugin writes
  scanned images and PDFs directly into the app's `Documents` directory
  (`FileManager.default.urls(for: .documentDirectory)`). The plugin never cleans them
  up, causing permanent disk bloat and iCloud backup bloat.
- **MUST** handle Android Content URIs (`content://...`) safely. Do not assume scanner
  outputs are POSIX filesystem paths on Android.

---

## Complete API Reference & Types

### 1. `FlutterDocScanner`
Top-level entrypoint:
```dart
class FlutterDocScanner {
  const FlutterDocScanner();

  Future<String?> getPlatformVersion();

  Future<dynamic> getScanDocuments({int page = 4});

  Future<ImageScanResult?> getScannedDocumentAsImages({
    int page = 4,
    ImageFormat imageFormat = ImageFormat.jpeg,
    double quality = 0.9,
    bool useAutomaticSinglePictureProcessing = false,
  });

  Future<PdfScanResult?> getScannedDocumentAsPdf({int page = 4});

  Future<ImageScanResult?> getScanDocumentsUri({int page = 4});
}
```

### 2. `ImageScanResult`
Container for scanned image references:
```dart
class ImageScanResult {
  final List<String> images;
  int get count => images.length;

  const ImageScanResult({required this.images});

  factory ImageScanResult.fromPlatformData(dynamic data);
}
```
- `images`: Contains iOS POSIX file paths or Android content URIs.

### 3. `PdfScanResult`
Container for generated PDF document reference:
```dart
class PdfScanResult {
  final String pdfUri;
  final int pageCount;

  const PdfScanResult({required this.pdfUri, this.pageCount = 0});

  factory PdfScanResult.fromPlatformData(dynamic data);
}
```
- `pdfUri`: iOS POSIX file path or Android content URI.
- `pageCount`: Page count on Android. *Note: Defaults to `0` on iOS because native iOS returns only the file path.*

### 4. `ImageFormat`
```dart
enum ImageFormat {
  png,
  jpeg,
}
```
- On Android, ML Kit always exports JPEG regardless of this value.
- On iOS standard mode, `saveScannedImages` writes PNGs.
- On iOS auto mode, `AutoScanViewController` writes JPEG at quality 0.78.

### 5. `DocScanException`
```dart
class DocScanException implements Exception {
  final String code;
  final String message;
  final dynamic details;

  static const String codeNoActivity = 'NO_ACTIVITY';
  static const String codeScanInProgress = 'SCAN_IN_PROGRESS';
  static const String codeScanFailed = 'SCAN_FAILED';
  static const String codePdfCreationError = 'PDF_CREATION_ERROR';
  static const String codeCancelled = 'CANCELLED';
  static const String codeUnsupported = 'UNSUPPORTED_PLATFORM';
}
```

---

## Platform Architecture & Native Engines

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Flutter / Dart Client                           │
│     getScannedDocumentAsImages()  │  getScannedDocumentAsPdf()         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ MethodChannel("flutter_doc_scanner")
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐
   │    Android Engine     │                 │      iOS Engine       │
   │ Google Play Services  │                 │   Apple VisionKit /   │
   │ ML Kit Doc Scanner    │                 │   AutoScan Pipeline   │
   └───────────┬───────────┘                 └───────────┬───────────┘
               │                                         │
     ┌─────────┴─────────┐                     ┌─────────┴─────────┐
     ▼                   ▼                     ▼                   ▼
[SCANNER_MODE_FULL] [SCANNER_MODE_BASE]   [VisionKit UI]     [AutoScan]
 • Multi-page        • Single-page         • VNDocumentCamera • AVFoundation
 • Shutter / Crop    • Fast capture        • Multi-page PNG   • VNDetectRectangles
 • Filters / Review  • No review UI        • PDFKit compile   • Single JPEG 0.78
```

### Android Native Engine (Google Play Services ML Kit)
- Runs out-of-process in Google Play Services (`GmsDocumentScanning`).
- Host app does not require native camera permission; Google Play Services manages it.
- Full Mode (`useAutomaticSinglePictureProcessing: false`): Multi-page scanning up to
  `pageLimit`, manual corner adjustments, shadow and stain removal filters, gallery import.
- Base Mode (`useAutomaticSinglePictureProcessing: true`): Single-page instant capture,
  gallery import disabled, post-capture review bypassed.

### iOS Native Engine (VisionKit & AutoScan)
- Requires `NSCameraUsageDescription` in `Info.plist`.
- Standard Mode: Uses `VNDocumentCameraViewController` (`VisionKit`). Provides Apple's
  system document scanner UI with automatic boundary detection, perspective correction,
  and color/B&W filters. Saves individual pages as PNGs or compiles via `PDFKit`.
- Fast AutoScan Mode: Presents custom `AutoScanViewController` using `AVCaptureSession`,
  `VNDetectRectanglesRequest` (confidence >= 0.7), and `CIPerspectiveCorrection`.
  Outputs a single JPEG scaled to 1280px max dimension.

---

## Platform Setup & Configuration

### Android Setup
In `android/app/build.gradle`:
```groovy
android {
    compileSdkVersion 34 // or 35

    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

Optional (downloads ML Kit model at app install time rather than first scan):
In `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest ...>
    <application ...>
        <meta-data
            android:name="com.google.mlkit.vision.DEPENDENCIES"
            android:value="document_scanner" />
    </application>
</manifest>
```

### iOS Setup
In `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is needed to scan documents, receipts, and identification cards.</string>
```

In `ios/Podfile`:
```ruby
platform :ios, '13.0'
```

---

## Production Implementation Recipes

### Recipe 1: Production Multi-Page Image Scanner

Full production service with concurrency guard, error handling, and file cleanup:

```dart
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';

class DocumentScannerService {
  final FlutterDocScanner _scanner;
  bool _isScanning = false;

  DocumentScannerService({FlutterDocScanner? scanner})
      : _scanner = scanner ?? const FlutterDocScanner();

  bool get isScanning => _isScanning;

  /// Scans up to [maxPages] document images.
  /// Returns a list of image paths/URIs, or empty list if cancelled.
  Future<List<String>> scanImages({int maxPages = 4}) async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      throw UnsupportedError('Document scanning is only supported on Android and iOS.');
    }

    if (_isScanning) {
      throw StateError('A scan session is already in progress.');
    }

    _isScanning = true;
    try {
      final result = await _scanner.getScannedDocumentAsImages(
        page: maxPages,
        imageFormat: ImageFormat.jpeg,
      );

      if (result == null) {
        return const []; // User cancelled
      }

      return result.images;
    } on DocScanException catch (e) {
      if (e.code == DocScanException.codeScanInProgress) {
        throw StateError('Scanner is busy with an existing operation.');
      }
      rethrow;
    } finally {
      _isScanning = false;
    }
  }

  /// Cleans up temporary scanned image files on iOS to prevent disk leaks.
  Future<void> cleanupScannedFiles(List<String> paths) async {
    if (kIsWeb || !Platform.isIOS) return;

    for (final path in paths) {
      try {
        final file = File(path);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (e) {
        debugPrint('Failed to delete temp scan file: $path ($e)');
      }
    }
  }
}
```

### Recipe 2: Production Multi-Page PDF Scanner

```dart
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';

class PdfScanOutput {
  final String pathOrUri;
  final int pageCount;

  const PdfScanOutput({required this.pathOrUri, required this.pageCount});
}

Future<PdfScanOutput?> scanDocumentToPdf({int maxPages = 10}) async {
  if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
    throw UnsupportedError('PDF document scanning is only supported on Android and iOS.');
  }

  final scanner = const FlutterDocScanner();

  try {
    final result = await scanner.getScannedDocumentAsPdf(page: maxPages);
    if (result == null) return null;

    return PdfScanOutput(
      pathOrUri: result.pdfUri,
      pageCount: result.pageCount,
    );
  } on DocScanException catch (e) {
    debugPrint('PDF scan failed [${e.code}]: ${e.message}');
    rethrow;
  }
}
```

### Recipe 3: Fast Single-Picture Auto-Scan (Zero-Review)

Best for instant single-document capture (e.g. checks, barcodes on paper, fast receipts):

```dart
Future<String?> scanSingleDocumentFast() async {
  final scanner = const FlutterDocScanner();

  final result = await scanner.getScannedDocumentAsImages(
    page: 1,
    useAutomaticSinglePictureProcessing: true,
  );

  if (result == null || result.images.isEmpty) {
    return null;
  }

  return result.images.first;
}
```

---

## Cross-Platform File & URI Handling

### Android Content URIs vs iOS Paths
- **Android**: Returns `content://com.google.android.gms.provider/...`.
  Cannot be opened with `File(path)` synchronously if path starts with `content://`.
- **iOS**: Returns `/var/mobile/Containers/Data/Application/.../Documents/YYYYMMDD-HHMMSS-0.png`.
  Can be opened directly with `File(path)`.

### Unified File Ingestion Utility
```dart
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

Future<File> resolveScanToFile(String uriOrPath) async {
  final uri = Uri.parse(uriOrPath);

  if (uri.scheme == 'content') {
    // Resolve Android Content URI to local temporary file
    final contentFile = File.fromUri(uri);
    final bytes = await contentFile.readAsBytes();
    final tempDir = await getTemporaryDirectory();
    final outPath = '${tempDir.path}/doc_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final tempFile = File(outPath);
    return await tempFile.writeAsBytes(bytes);
  }

  return File(uriOrPath);
}
```

---

## Common Pitfalls, Gotchas & Anti-Patterns

### Pitfall 1: Catching `PlatformException` Instead of `DocScanException`
```dart
// BAD: PlatformException will NEVER catch scanner errors!
try {
  final result = await scanner.getScannedDocumentAsImages();
} on PlatformException catch (e) {
  print(e.message);
}

// GOOD: Catch DocScanException specifically
try {
  final result = await scanner.getScannedDocumentAsImages();
} on DocScanException catch (e) {
  print('Scanner failed: ${e.code} - ${e.message}');
}
```

### Pitfall 2: Relying on `getScanDocuments()` Polymorphic Output
```dart
// BAD: Diverges across platforms! Returns Map on Android, List on iOS.
final dynamic result = await scanner.getScanDocuments();
final List<String> images = result as List<String>; // CRASHES on Android!

// GOOD: Use explicitly typed methods
final ImageScanResult? imgResult = await scanner.getScannedDocumentAsImages();
final List<String> images = imgResult?.images ?? [];
```

### Pitfall 3: Calling Scanner Without Concurrency Lock
```dart
// BAD: Rapid button taps cause SCAN_IN_PROGRESS on Android
onPressed: () async {
  await scanner.getScannedDocumentAsImages();
}

// GOOD: Maintain busy state and disable button
onPressed: isScanning ? null : () async {
  setState(() => isScanning = true);
  try {
    await scanner.getScannedDocumentAsImages();
  } finally {
    if (mounted) setState(() => isScanning = false);
  }
}
```

### Pitfall 4: Neglecting iOS Documents Directory Disk Cleanup
```dart
// BAD: Scanned files remain permanently in iOS Documents dir, leaking storage
final result = await scanner.getScannedDocumentAsImages();
await uploadImages(result.images);
// Done (files left on disk indefinitely!)

// GOOD: Clean up files after processing
final result = await scanner.getScannedDocumentAsImages();
if (result != null) {
  try {
    await uploadImages(result.images);
  } finally {
    if (Platform.isIOS) {
      for (final p in result.images) {
        final f = File(p);
        if (await f.exists()) await f.delete();
      }
    }
  }
}
```

---

## Testing & Mocking Strategy

### 1. Mocking the Native MethodChannel in Unit Tests

```dart
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('flutter_doc_scanner');
  final scanner = const FlutterDocScanner();

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (MethodCall call) async {
      switch (call.method) {
        case 'getScannedDocumentAsImages':
          return {
            'images': ['/path/to/scan1.jpg', '/path/to/scan2.jpg'],
            'count': 2,
          };
        case 'getScannedDocumentAsPdf':
          return {
            'pdfUri': '/path/to/document.pdf',
            'pageCount': 3,
          };
        default:
          return null;
      }
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('getScannedDocumentAsImages parses valid payload', () async {
    final result = await scanner.getScannedDocumentAsImages(page: 2);
    expect(result, isNotNull);
    expect(result!.count, 2);
    expect(result.images.first, '/path/to/scan1.jpg');
  });

  test('getScannedDocumentAsPdf parses valid PDF payload', () async {
    final result = await scanner.getScannedDocumentAsPdf(page: 3);
    expect(result, isNotNull);
    expect(result!.pdfUri, '/path/to/document.pdf');
    expect(result.pageCount, 3);
  });
}
```

### 2. Testing User Cancellation Handling

```dart
test('returns null when user cancels scan', () async {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(channel, (MethodCall call) async => null);

  final result = await scanner.getScannedDocumentAsImages();
  expect(result, isNull);
});
```

### 3. Testing Exception Propagation

```dart
test('throws DocScanException on platform error', () async {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(channel, (MethodCall call) async {
    throw PlatformException(
      code: 'SCAN_FAILED',
      message: 'Camera unavailable',
    );
  });

  expect(
    () => scanner.getScannedDocumentAsImages(),
    throwsA(isA<DocScanException>().having(
      (e) => e.code,
      'code',
      'SCAN_FAILED',
    )),
  );
});
```
