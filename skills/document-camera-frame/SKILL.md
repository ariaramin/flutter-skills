---
name: document-camera-frame
description: >
  Expert guidance for integrating, configuring, debugging, optimizing,
  testing, and maintaining the document_camera_frame Flutter package (custom
  framed camera, auto-capture alignment, on-device OCR, multi-page PDF/image
  export, and native VisionKit/MLKit document scanner) in production apps.
---

# document_camera_frame Flutter Skill

## Purpose and Scope

Activate this skill whenever a Flutter task involves or references the
`document_camera_frame` package (pub.dev), including:

- Integrating document capture for ID cards, passports, driver's licenses,
  receipts, or multi-page paper documents.
- Using or configuring `DocumentCameraFrame`, `DocumentCameraLogic`,
  `DocumentCameraController`, `DocumentCameraUIMode`, `DocumentCaptureData`,
  `DocumentDetectionConfig`, `DocumentDetectionStatus`, `CamScannerService`,
  `OcrService`, `PdfGenerationService`, or `ImageProcessingService`.
- Configuring UI modes: `defaultMode`, `minimal`, `overlay`, `kiosk`,
  `textExtract`, and `camScanner`.
- Setting up on-device ML Kit Latin OCR or configuring auto-capture alignment.
- Exporting scans as JPG, PNG, multi-page PDF (A4/Letter), or TIFF with
  built-in JPG preview.
- Delegating document capture to platform-native scanning engines: Google ML
  Kit Document Scanner on Android and Apple VisionKit
  (`VNDocumentCameraViewController`) on iOS.
- Debugging build errors (such as Android CameraX `compileSdk 36` errors,
  missing iOS microphone usage description, or SPM build failures), capture
  misalignments, image cropping squashing, or memory issues.
- Writing unit, widget, or integration tests for document capture flows.

**Out of Scope:**
- Standalone generic camera management where no document framing, cropping,
  or document scanning is required (use `camera` or `camerawesome`).
- Headless, pure image perspective-cropping without UI (use `document_scan`).
- Non-Latin OCR (e.g., Arabic, Chinese, Devanagari) — ML Kit on-device model
  bundled here is strictly Latin-script only; cloud OCR is required for others.
- Desktop or Web document camera capture — the package officially supports
  Android and iOS only.

---

## Verified Package Profile

- **Package Identity:** `document_camera_frame`
- **Official pub.dev URL:** `https://pub.dev/packages/document_camera_frame`
- **Official Repository:** `https://github.com/ahmedzein-dev/document_camera_frame`
- **Publisher:** `ahmedzein.dev` (Verified Publisher, 160/160 pub points)
- **Version Researched:** `2.6.12` (Published October 2026)
- **SDK Constraints:** Dart `^3.8.1`, Flutter `>=1.17.0`
- **Plugin Platform Declarations:** Android (`io.github.ahmedzein.document_camera_frame`), iOS (`DocumentCameraFramePlugin`).
- **Core Dependencies:**
  - `camera: ^0.12.0+1` (Pulls `camera_android_camerax` 0.7.2+ with CameraX 1.6)
  - `flutter_animate: ^4.5.2` (Used for UI mode animations and frame flips)
  - `google_mlkit_object_detection: ">=0.15.1 <0.18.0"` (Auto-capture alignment)
  - `google_mlkit_text_recognition: ">=0.15.1 <0.18.0"` (Latin on-device OCR)
  - `google_mlkit_document_scanner: ">=0.4.1 <0.7.0"` (Android native scanner)
  - `image: ^4.8.0` (Pure-Dart image decode, center crop, format encoding)
  - `pdf: ^3.12.0` (A4/Letter PDF document assembly)
  - `path_provider: ^2.1.5` (Temporary and document directories)

---

## Core Engineering Rules

- **MUST** await `Navigator.push<DocumentCaptureData>` to receive capture results.
  `DocumentCameraFrame` automatically pops itself upon save or user cancellation.
  `onDocumentSaved` is strictly an optional side-effect callback for analytics or
  intermediate processing.
- **MUST** set `compileSdk 36` and `minSdk 24` in `android/app/build.gradle`.
  The underlying `camera` plugin relies on CameraX 1.6, which fails compilation
  against `compileSdk 35` with:
  *"Dependency 'androidx.camera:camera-core:1.6.0' requires libraries and applications that depend on it to compile against version 36 or later"*.
- **MUST** set `platform :ios, '15.5'` in `ios/Podfile`. While the internal
  podspec specifies iOS 13.0 for VisionKit, the Google ML Kit CocoaPods require
  iOS 15.5+.
- **MUST** declare both `NSCameraUsageDescription` AND `NSMicrophoneUsageDescription`
  in `ios/Runner/Info.plist`. The camera plugin validates microphone permission
  at runtime on iOS even when audio recording is disabled in code.
- **MUST NOT** deploy to Web, macOS, Windows, or Linux without platform guards.
  The package imports `dart:io` and mobile-only plugins. Invoking it on unsupported
  platforms will throw runtime exceptions (`UnsupportedError` or `MissingPluginException`).
- **MUST** use `innerCornerBorderRadius` (not `innerCornerBroderRadius`) in
  `DocumentCameraFrameStyle`. The typo was fixed in v2.5.7 and the old name is removed.
- **MUST** handle the `onCameraError` callback with the signature
  `void Function(Object error)?`. The signature was updated in v2.6.7 to pass the
  actual exception rather than a zero-argument callback.
- **MUST NOT** assume custom frame styles, borders, or buttons apply in
  `DocumentCameraUIMode.camScanner`. Native scanner mode delegates UI to
  Google ML Kit on Android and Apple VisionKit on iOS, ignoring all Flutter frame styling.
- **SHOULD** offload or prepare for UI isolate load during still image crop.
  `ImageProcessingService` decodes high-resolution camera frames synchronously via
  `img.decodeImage(imageFile.readAsBytesSync())!`.

---

## Platform Compatibility Matrix

| Platform | Support Status | Minimum OS Floor | Key Native Engine | Configuration Requirements & Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Android** | **Verified (Full)** | Android 7.0 (API 24) | CameraX 1.6, ML Kit Object Detection, ML Kit Doc Scanner | `compileSdk 36`, `minSdk 24`. Requires Google Play Services on device for ML Kit. |
| **iOS** | **Verified (Full)** | iOS 15.5 (Podfile) / iOS 13 (VisionKit) | AVFoundation, Apple VisionKit (`VNDocumentCameraViewController`) | Requires `NSCameraUsageDescription` & `NSMicrophoneUsageDescription`. Real device required; Simulator fails. |
| **Web** | **Unsupported** | N/A | None | Uses `dart:io` and native plugins. Fails immediately. Must guard with `kIsWeb` and provide file upload fallback. |
| **macOS** | **Unsupported** | N/A | None | No macOS plugin registered. Throws `MissingPluginException`. Guard with platform check. |
| **Windows** | **Unsupported** | N/A | None | No Windows plugin registered. Guard with platform check. |
| **Linux** | **Unsupported** | N/A | None | No Linux plugin registered. Guard with platform check. |

---

## Installation and Project Setup

### 1. Add Dependency

```yaml
dependencies:
  document_camera_frame: ^2.6.12
```

### 2. Android Configuration

In `android/app/build.gradle`:

```groovy
android {
    compileSdk 36 // MANDATORY: CameraX 1.6 requires API 36+

    defaultConfig {
        minSdk 24 // MANDATORY: Flutter 3.41+ baseline and ML Kit compatibility
        targetSdk 35
    }
}
```

In `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Camera permissions and hardware features -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Storage permissions for older Android versions (API <= 28) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:label="My App"
        android:icon="@mipmap/ic_launcher">
        <!-- ... -->
    </application>
</manifest>
```

### 3. iOS Configuration

In `ios/Podfile`:

```ruby
platform :ios, '15.5' # MANDATORY: Google ML Kit dependencies require iOS 15.5+
```

In `ios/Runner/Info.plist`:

```xml
<dict>
    <!-- Camera Permission -->
    <key>NSCameraUsageDescription</key>
    <string>We need camera access to capture and scan document photos.</string>
    
    <!-- Microphone Permission (Required by camera plugin initialization on iOS) -->
    <key>NSMicrophoneUsageDescription</key>
    <string>We need microphone access for camera initialization.</string>
</dict>
```

---

## Architecture and UI Modes

The package provides two primary architectural paths:
1. **Custom Flutter Camera Overlay Engine** (`defaultMode`, `minimal`, `overlay`, `kiosk`, `textExtract`)
2. **Platform Native Scanner Engine** (`camScanner`)

```
                          DocumentCameraFrame (Widget)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
     Custom Overlay Engine                           Native Scanner Engine
   (uiMode != camScanner)                            (uiMode == camScanner)
              │                                               │
   ┌──────────┴──────────┐                       ┌────────────┴────────────┐
   ▼                     ▼                       ▼                         ▼
CameraPreviewLayer   OverlayLayer             Android (ML Kit)         iOS (VisionKit)
 (Cover-Fit Scale)   (Cuts/Borders/Buttons)  DocumentScanner       VNDocumentCameraVC
   │                     │                       │                         │
   └──────────┬──────────┘                       └────────────┬────────────┘
              ▼                                               ▼
     DocumentCameraLogic                             CamScannerService
   - ObjectDetector Stream                         - Google Play Services
   - Cover-Fit Math & Alignment                    - Native Sheet UI
   - ImageProcessingService (Crop/Format)          - Auto-perspective crop
   - OcrService / PdfGenerationService
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                        Navigator.pop(DocumentCaptureData)
```

### UI Mode Selection Matrix

| UI Mode | Frame / Dark Cutout | Action Buttons | Auto-Capture | On-Device OCR | Ideal Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `defaultMode` | Full cutout + border | Yes | Optional (`enableAutoCapture: true`) | Off by default | Standard ID/card flows with full visual guidance. |
| `minimal` | Corner boxes only | Yes | Disabled | Off by default | Uncluttered, modern UI where camera preview fills screen. |
| `overlay` | Frame border only (no dark mask) | Yes | Optional | Off by default | Custom branded backgrounds behind the frame. |
| `kiosk` | Full cutout + border | **Hidden** | **Required** (Auto-only) | Off by default | Unattended terminals, tablets, hands-free scanning. |
| `textExtract` | Full cutout + border | Yes | Optional | **Enabled** by default | Immediate Latin text extraction (ID number, name, text). |
| `camScanner` | **Native OS Sheet** | **Native OS UI** | **Native OS Auto** | Native filters | High-precision multi-page document scanning with perspective skew correction. |

---

## Correct Usage Patterns

### Pattern 1: Standard ID Card Capture (Front & Back with Await Result)

```dart
import 'package:document_camera_frame/document_camera_frame.dart';
import 'package:flutter/material.dart';

Future<DocumentCaptureData?> captureNationalId(BuildContext context) async {
  final DocumentCaptureData? result = await Navigator.push<DocumentCaptureData>(
    context,
    MaterialPageRoute(
      builder: (_) => const DocumentCameraFrame(
        frameWidth: 320,
        frameHeight: 200,
        requireBothSides: true,
        enableAutoCapture: true,
        titleStyle: DocumentCameraTitleStyle(
          frontSideTitle: Text(
            'Scan Front of ID',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          backSideTitle: Text(
            'Scan Back of ID',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        frameStyle: DocumentCameraFrameStyle(
          outerFrameBorderRadius: 16.0,
          innerCornerBorderRadius: 8.0,
        ),
      ),
    ),
  );

  return result;
}
```

### Pattern 2: Single-Sided Passport with Text Extraction (OCR)

```dart
Future<DocumentCaptureData?> capturePassportWithOcr(BuildContext context) async {
  final DocumentCaptureData? result = await Navigator.push<DocumentCaptureData>(
    context,
    MaterialPageRoute(
      builder: (_) => const DocumentCameraFrame(
        frameWidth: 300,
        frameHeight: 420,
        requireBothSides: false,
        uiMode: DocumentCameraUIMode.textExtract, // Auto-enables on-device Latin OCR
        titleStyle: DocumentCameraTitleStyle(
          frontSideTitle: Text('Scan Passport Photo Page', style: TextStyle(color: Colors.white)),
        ),
        instructionStyle: DocumentCameraInstructionStyle(
          showInstructionText: true,
          frontSideInstruction: 'Fit the entire passport page within the border',
        ),
      ),
    ),
  );

  if (result != null && result.hasFrontText) {
    debugPrint('Extracted OCR text: ${result.frontOcrText}');
  }

  return result;
}
```

### Pattern 3: Multi-Page PDF Generation

```dart
Future<String?> captureDocumentToPdf(BuildContext context) async {
  final DocumentCaptureData? result = await Navigator.push<DocumentCaptureData>(
    context,
    MaterialPageRoute(
      builder: (_) => const DocumentCameraFrame(
        frameWidth: 320,
        frameHeight: 450,
        outputFormat: DocumentOutputFormat.pdf,
        pdfPageSize: PdfPageSize.a4,
        requireBothSides: true, // Creates a 2-page PDF
        imageQuality: 85,
      ),
    ),
  );

  if (result != null && result.hasPdf) {
    debugPrint('Generated PDF path: ${result.pdfPath}');
    return result.pdfPath;
  }
  return null;
}
```

### Pattern 4: Native CamScanner Mode (Google ML Kit & Apple VisionKit)

```dart
Future<DocumentCaptureData?> captureWithNativeSystemScanner(BuildContext context) async {
  // Uses platform's built-in document scanner UI
  // Note: All Flutter frame/style properties are ignored in this mode
  final DocumentCaptureData? result = await Navigator.push<DocumentCaptureData>(
    context,
    MaterialPageRoute(
      builder: (_) => const DocumentCameraFrame(
        frameWidth: 320,
        frameHeight: 200,
        uiMode: DocumentCameraUIMode.camScanner,
        requireBothSides: true,
      ),
    ),
  );

  return result;
}
```

### Pattern 5: Headless Native Scanning Service (Direct Call)

When you do not need the Flutter camera UI widget at all, invoke the underlying
`CamScannerService` directly:

```dart
import 'package:document_camera_frame/document_camera_frame.dart';

Future<List<String>> runHeadlessScan() async {
  final scannerService = CamScannerService();
  // Android: triggers ML Kit Document Scanner
  // iOS: triggers VNDocumentCameraViewController
  final List<String> scannedFilePaths = await scannerService.scan(maxPages: 3);
  return scannedFilePaths;
}
```

---

## Production Architecture & Abstraction Layer

Never call `DocumentCameraFrame` directly across multiple business widgets.
Wrap it in a dedicated `DocumentCaptureService` or `DocumentCaptureRepository`
to isolate platform handling, file retention, error reporting, and testing.

```dart
import 'dart:io';
import 'package:document_camera_frame/document_camera_frame.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

enum DocumentType { nationalId, passport, genericDocument }

class DocumentCaptureResult {
  final String frontImagePath;
  final String? backImagePath;
  final String? pdfPath;
  final String? extractedText;

  const DocumentCaptureResult({
    required this.frontImagePath,
    this.backImagePath,
    this.pdfPath,
    this.extractedText,
  });
}

abstract interface class IDocumentCaptureService {
  Future<DocumentCaptureResult?> captureDocument(
    BuildContext context, {
    required DocumentType type,
    bool enableOcr,
    DocumentOutputFormat outputFormat,
  });
}

class ProductionDocumentCaptureService implements IDocumentCaptureService {
  const ProductionDocumentCaptureService();

  @override
  Future<DocumentCaptureResult?> captureDocument(
    BuildContext context, {
    required DocumentType type,
    bool enableOcr = false,
    DocumentOutputFormat outputFormat = DocumentOutputFormat.jpg,
  }) async {
    // 1. Guard against unsupported platforms before navigation
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      throw UnsupportedError(
        'DocumentCameraFrame is only supported on Android and iOS.',
      );
    }

    // 2. Configure dimensions based on document geometry
    final (double width, double height, bool requireBothSides) = switch (type) {
      DocumentType.nationalId => (320.0, 200.0, true),
      DocumentType.passport => (300.0, 420.0, false),
      DocumentType.genericDocument => (320.0, 450.0, false),
    };

    // 3. Launch camera flow
    final DocumentCaptureData? data = await Navigator.push<DocumentCaptureData>(
      context,
      MaterialPageRoute(
        builder: (_) => DocumentCameraFrame(
          frameWidth: width,
          frameHeight: height,
          requireBothSides: requireBothSides,
          outputFormat: outputFormat,
          enableExtractText: enableOcr,
          enableAutoCapture: true,
          onCameraError: (error) {
            debugPrint('[DocumentCapture] Camera error encountered: $error');
          },
        ),
      ),
    );

    if (data == null || !data.hasFrontSide) {
      return null; // User cancelled
    }

    return DocumentCaptureResult(
      frontImagePath: data.frontImagePath!,
      backImagePath: data.backImagePath,
      pdfPath: data.pdfPath,
      extractedText: data.frontOcrText,
    );
  }
}
```

---

## Performance and Memory Optimization

### 1. UI Thread Freeze During Capture (Synchronous Decode)
- **Problem:** `ImageProcessingService.cropImageToFrame` calls `img.decodeImage(imageFile.readAsBytesSync())!`
  and `img.copyCrop(...)` synchronously on the Flutter UI isolate. With `ResolutionPreset.ultraHigh`
  (12MP+ camera output), this causes a 200–800ms UI frame drop.
- **Rule:** Set `imageQuality: 85` (instead of 100) and understand that the capture button
  displays a loading spinner (`isLoadingNotifier`). Avoid dispatching heavy background isolate work
  or complex animations simultaneously at the exact moment of capture.

### 2. Auto-Capture Frame Stream Throttling
- **Problem:** Processing raw `CameraImage` frames through ML Kit's `ObjectDetector` at 30–60 FPS
  generates high CPU usage and thermal throttling.
- **Rule:** `DocumentCameraLogic` utilizes an internal `isDetectorBusy` lock that drops incoming
  frames until the previous frame's detection returns. Additionally, auto-capture requires 1.0 second
  of continuous alignment before triggering capture. Never lower this debounce timer or bypass
  the detector busy guard.

### 3. File System Bloat and Sandbox Pruning
- **Problem:** Raw captures are written to `ApplicationDocumentsDirectory/Pictures/flutter_test/`,
  cropped images get written to disk, and PDF generation creates additional files.
- **Rule:** When `outputFormat == DocumentOutputFormat.pdf`, `DocumentCameraLogic` automatically
  deletes temporary JPGs. However, when using JPG or PNG in high-volume apps, the application
  must explicitly prune old files from the documents directory when the session completes:
  ```dart
  Future<void> pruneCapturedFile(String? path) async {
    if (path == null || path.isEmpty) return;
    try {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('Failed to delete temporary document: $e');
    }
  }
  ```

### 4. TIFF Image Display Caution
- **Problem:** Flutter's built-in `Image.file` widget cannot decode TIFF images.
- **Rule:** When `outputFormat: DocumentOutputFormat.tiff`, always use
  `result.frontPreviewPath` (which the package generates as a standard `.jpg`) for rendering
  the image preview in the UI, and reserve `result.frontImagePath` (`.tiff`) for backend upload.

---

## Error Handling and Lifecycle Safety

### Handling Camera Errors via `onCameraError`

Always wire `onCameraError` to an application-level logger or user alert:

```dart
DocumentCameraFrame(
  frameWidth: 320,
  frameHeight: 200,
  onCameraError: (Object error) {
    // Error can be CameraException, ML Kit exception, or FileSystemException
    debugPrint('Camera error: $error');
    if (error is CameraException) {
      switch (error.code) {
        case 'CameraAccessDenied':
        case 'CameraAccessDeniedWithoutPrompt':
          _showPermissionDialog(context);
          break;
        case 'CameraAccessRestricted':
          _showRestrictedDialog(context);
          break;
        default:
          _showGenericCameraError(context, error.description);
      }
    }
  },
)
```

### Android Activity Lifecycle & App Backgrounding
- The package's internal `DocumentCameraLogic` manages camera controller disposal upon widget
  `dispose()`.
- However, if the user leaves the app (presses Home or switches apps) while the camera is open,
  the `WidgetsBindingObserver` in the host app should pause or close camera sessions to release
  the camera sensor.

---

## Common Mistakes and Anti-Patterns

### ❌ Anti-Pattern 1: Nesting Navigator.pop Inside onDocumentSaved
```dart
// ❌ WRONG: Causes a double pop or black screen because the package already pops!
DocumentCameraFrame(
  frameWidth: 320,
  frameHeight: 200,
  onDocumentSaved: (data) {
    Navigator.of(context).pop(data); // WRONG: Double pop!
  },
)

// ✅ CORRECT: Await Navigator.push directly
final result = await Navigator.push<DocumentCaptureData>(
  context,
  MaterialPageRoute(
    builder: (_) => const DocumentCameraFrame(frameWidth: 320, frameHeight: 200),
  ),
);
```

### ❌ Anti-Pattern 2: Setting compileSdk 35 on Android
```groovy
// ❌ WRONG: Fails build due to CameraX 1.6 in camera: ^0.12.0
android {
    compileSdk 35
}

// ✅ CORRECT: Must be 36
android {
    compileSdk 36
}
```

### ❌ Anti-Pattern 3: Omitting Microphone Usage Description on iOS
```xml
<!-- ❌ WRONG: Missing NSMicrophoneUsageDescription causes iOS crash on camera init -->
<key>NSCameraUsageDescription</key>
<string>Camera access</string>

<!-- ✅ CORRECT: Both keys present -->
<key>NSCameraUsageDescription</key>
<string>Camera access to scan documents</string>
<key>NSMicrophoneUsageDescription</key>
<string>Required by camera initialization</string>
```

### ❌ Anti-Pattern 4: Using Deprecated or Typo Properties
```dart
// ❌ WRONG: innerCornerBroderRadius (typo from <= 2.5.6)
frameStyle: DocumentCameraFrameStyle(innerCornerBroderRadius: 8.0)

// ✅ CORRECT: innerCornerBorderRadius
frameStyle: DocumentCameraFrameStyle(innerCornerBorderRadius: 8.0)

// ❌ WRONG: onBothSidesSaved (deprecated)
onBothSidesSaved: (data) {}

// ✅ CORRECT: onDocumentSaved (or await Navigator.push)
onDocumentSaved: (data) {}
```

### ❌ Anti-Pattern 5: Expecting Arabic or Non-Latin OCR
```dart
// ❌ WRONG: ML Kit on-device model here only supports Latin script!
// Passing Arabic documents with enableExtractText: true returns garbage or empty string.

// ✅ CORRECT: Use enableExtractText for English/Latin IDs; use dedicated cloud API for Arabic.
```

---

## Troubleshooting Guide

| Issue / Symptom | Root Cause | Verified Resolution |
| :--- | :--- | :--- |
| **Android build fails:** *"requires libraries and applications... to compile against version 36"* | `camera` 0.12 uses CameraX 1.6, which strictly requires Android API 36. | In `android/app/build.gradle`, set `compileSdk 36`. Install Android 16 (API 36) SDK via Android Studio. |
| **iOS app crashes on camera launch:** `[access] This app has crashed because it attempted to access privacy-sensitive data without a usage description.` | Missing `NSMicrophoneUsageDescription` in `ios/Runner/Info.plist`. | Add both `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` to `Info.plist`. |
| **iOS Swift Package Manager build fails:** *"product 'document-camera-frame' not found"* | SPM library product naming mismatch in older versions (< 2.6.11). | Upgrade to `document_camera_frame: ^2.6.12` where `Package.swift` uses hyphenated product name. |
| **Navigator returns null immediately:** `camScanner` mode produces null. | Bug in older package versions (< 2.6.0) where `maybePop()` was called without arguments. | Upgrade to `^2.6.12`. It correctly calls `Navigator.pop(result)`. |
| **Camera preview stretched/squashed:** Document frame doesn't match photo crop. | Non-standard sensor aspect ratio on certain devices (< 2.6.7). | Fixed in 2.6.7+ with coverScale calculation. Ensure package is `^2.6.12`. |
| **Crash on Desktop/Web:** `MissingPluginException` or `UnsupportedError`. | Package does not support Web, Windows, macOS, or Linux. | Add `if (kIsWeb \|\| (!Platform.isAndroid && !Platform.isIOS))` guards and provide a fallback file picker. |
| **Auto-capture never triggers:** | Document bounding box area is outside the 50%–70% frame ratio threshold. | Instruct user to move closer/farther, or customize `detectionConfig: DocumentDetectionConfig(minSizeRatio: 0.4, maxSizeRatio: 0.8)`. |

---

## Testing and Verification Strategy

### 1. Unit Testing Models and Logic States (No Camera Hardware Needed)

Unit test `DocumentCaptureData`, `DocumentDetectionConfig`, and `DocumentDetectionStatus`
without needing a live camera or device simulator:

```dart
import 'package:document_camera_frame/document_camera_frame.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DocumentCaptureData Tests', () {
    test('isCompleteFor requires both sides when requireBothSides is true', () {
      final oneSideData = DocumentCaptureData(
        frontImagePath: '/path/front.jpg',
      );
      expect(oneSideData.hasFrontSide, isTrue);
      expect(oneSideData.hasBackSide, isFalse);
      expect(oneSideData.isCompleteFor(requireBothSides: true), isFalse);
      expect(oneSideData.isCompleteFor(requireBothSides: false), isTrue);

      final bothSidesData = oneSideData.copyWith(
        backImagePath: '/path/back.jpg',
      );
      expect(bothSidesData.isCompleteFor(requireBothSides: true), isTrue);
    });

    test('DocumentDetectionConfig asserts valid threshold ranges', () {
      expect(
        () => DocumentDetectionConfig(minSizeRatio: 0.8, maxSizeRatio: 0.4),
        throwsAssertionError,
      );
    });
  });
}
```

### 2. Widget Testing with Service Abstraction

Because `DocumentCameraFrame` calls `availableCameras()` on mount, widget tests that instantiate
`DocumentCameraFrame` directly without camera mocks will fail in test environments.
Instead, test against your `IDocumentCaptureService` mock:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class MockDocumentCaptureService implements IDocumentCaptureService {
  @override
  Future<DocumentCaptureResult?> captureDocument(
    BuildContext context, {
    required DocumentType type,
    bool enableOcr = false,
    DocumentOutputFormat outputFormat = DocumentOutputFormat.jpg,
  }) async {
    return const DocumentCaptureResult(
      frontImagePath: '/mock/front.jpg',
      backImagePath: '/mock/back.jpg',
      extractedText: 'JOHN DOE 123456789',
    );
  }
}

void main() {
  testWidgets('Screen displays document results after successful capture', (tester) async {
    final service = MockDocumentCaptureService();
    // Test your screen using the mocked service
  });
}
```

---

## AI Agent Implementation Workflow

Follow this systematic sequence when asked to integrate or fix `document_camera_frame`:

```
1. Inspect Project Constraints
   ├── Check pubspec.yaml for Flutter and Dart SDK compatibility.
   ├── Check android/app/build.gradle: verify compileSdk is 36 and minSdk is >= 24.
   └── Check ios/Podfile: verify platform :ios is >= '15.5'.

2. Verify Platform Target
   ├── If task targets Web/Desktop: Explain that document_camera_frame is Android/iOS only.
   └── Scaffold a kIsWeb / platform fallback (e.g. image_picker).

3. Select Appropriate UI Mode
   ├── Standard framed capture with custom buttons? -> DocumentCameraUIMode.defaultMode
   ├── Clean unmasked preview with corners? -> DocumentCameraUIMode.minimal
   ├── Kiosk / hands-free auto-capture? -> DocumentCameraUIMode.kiosk
   ├── Document with immediate Latin OCR? -> DocumentCameraUIMode.textExtract
   └── High-precision perspective-corrected native scan? -> DocumentCameraUIMode.camScanner

4. Implement Integration Code
   ├── Use standard `final result = await Navigator.push<DocumentCaptureData>(...)`.
   ├── DO NOT call Navigator.pop() inside onDocumentSaved.
   └── Wire onCameraError: (Object error) => ...

5. Validate Permissions & Edge Cases
   ├── Ensure NSCameraUsageDescription & NSMicrophoneUsageDescription in Info.plist.
   └── Ensure CAMERA permission in AndroidManifest.xml.
```

---

## Code Review Checklist

- [ ] **Android SDK Versions:** Is `compileSdk` set to `36` and `minSdk` to `24` in `android/app/build.gradle`?
- [ ] **iOS Podfile:** Is `platform :ios` set to `'15.5'` or higher in `ios/Podfile`?
- [ ] **iOS Permissions:** Are both `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` in `Info.plist`?
- [ ] **Navigation Result:** Is the code awaiting `Navigator.push<DocumentCaptureData>` rather than manually managing pop inside `onDocumentSaved`?
- [ ] **Platform Isolation:** Are Web and Desktop protected by `kIsWeb` or platform checks?
- [ ] **UI Mode Consistency:** If `camScanner` mode is used, are developers aware that custom Flutter borders and styling are ignored?
- [ ] **OCR Limitations:** Is OCR used strictly for Latin text, with appropriate fallback for other scripts?
- [ ] **Error Callback:** Is `onCameraError` typed as `void Function(Object error)?`?
- [ ] **Spelling Accuracy:** Is `innerCornerBorderRadius` spelled correctly?
