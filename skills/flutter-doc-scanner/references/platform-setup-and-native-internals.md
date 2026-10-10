# Platform Setup & Native Internals

Architecture and configuration guide for `flutter_doc_scanner` (0.0.21).

---

## 1. Android Platform Architecture

### 1.1 Underlying Engine
`flutter_doc_scanner` utilizes Google Play Services ML Kit Document Scanner:
- Maven artifact: `com.google.android.gms:play-services-mlkit-document-scanner:16.0.0`
- Minimum Android SDK: 21 (Android 5.0 Lollipop)
- Target & Compile SDK: 34 (Android 14)
- Java Version: Java 17

### 1.2 Google Play Services Execution Model
The ML Kit Document Scanner runs out-of-process inside Google Play Services.
- **Camera Permissions**: The host Flutter app **does not require** `android.permission.CAMERA` in its `AndroidManifest.xml` for standard scanning. Google Play Services handles camera access within its own process.
- **Hardware Requirement**: Physical devices and emulators **must have Google Play Services installed and updated**. Emulators created without the Google APIs / Play Store image will fail to launch the scanner.
- **Dynamic Module Download**: If the ML Kit Document Scanner module is not already downloaded by Google Play Services on the device, it will initiate an on-demand download when first launched.

### 1.3 Scanner Modes (`GmsDocumentScannerOptions`)
In `FlutterDocScannerPlugin.kt`:
1. **Full Scanner Mode (`SCANNER_MODE_FULL`)**:
   - Used when `useAutomaticSinglePictureProcessing == false`.
   - Enables multi-page scanning (up to `pageLimit`), user review, automatic perspective correction, edge-tuning controls, filters (shadow removal, black-and-white, clean-up), and gallery image import.
2. **Base Scanner Mode (`SCANNER_MODE_BASE`)**:
   - Used when `useAutomaticSinglePictureProcessing == true`.
   - Forces `pageLimit = 1`.
   - Disables gallery import (`galleryImportAllowed = false`).
   - Disables post-capture editing/tuning UI, returning the scanned page immediately.

### 1.4 Android Lifecycle & Activity Awareness
`FlutterDocScannerPlugin` implements `ActivityAware` and `ActivityResultListener`:
- Scanner intent is launched via `Activity.startIntentSenderForResult`.
- Request codes used:
  - `REQUEST_CODE_SCAN = 213312` (`getScanDocuments`)
  - `REQUEST_CODE_SCAN_URI = 214412` (`getScanDocumentsUri`)
  - `REQUEST_CODE_SCAN_IMAGES = 215512` (`getScannedDocumentAsImages`)
  - `REQUEST_CODE_SCAN_PDF = 216612` (`getScannedDocumentAsPdf`)
- Concurrency guard: A variable `pendingResult` stores the active Flutter `Result`. If a second scan is triggered before the first completes, native code immediately rejects with `SCAN_IN_PROGRESS`.
- Cancellation: If the user presses back or cancels the scanner UI, `Activity.RESULT_CANCELED` is received, returning `null` to Dart.

### 1.5 Android Configuration Steps
In `android/app/build.gradle`:
```groovy
android {
    compileSdkVersion 34 // or higher (e.g. 35)

    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

Optional (for immediate module download upon app install rather than first launch):
In `android/app/src/main/AndroidManifest.xml`:
```xml
<application ...>
    <meta-data
        android:name="com.google.mlkit.vision.DEPENDENCIES"
        android:value="document_scanner" />
</application>
```

---

## 2. iOS Platform Architecture

### 2.1 Underlying Engines
On iOS, the plugin implements two distinct scanning pipelines depending on the `useAutomaticSinglePictureProcessing` argument:

1. **Standard Pipeline (`VNDocumentCameraViewController` via Apple VisionKit)**:
   - Used when `useAutomaticSinglePictureProcessing == false`.
   - Utilizes Apple's native document camera controller (`VisionKit`).
   - Provides quad edge detection, automatic shutter trigger, multi-page scanning tray, manual crop adjustment, and color/grayscale/B&W filters.
   - Saves scanned pages as PNG files into the application's `Documents` directory using `FileManager`.
   - For PDF output, compiles images using `PDFKit` into a single `.pdf` file in the `Documents` directory.

2. **Fast Single-Picture Pipeline (`AutoScanViewController`)**:
   - Used when `useAutomaticSinglePictureProcessing == true` via `getScannedDocumentAsImages`.
   - Custom implementation built from:
     - `AVFoundation` (`AVCaptureSession`, `AVCapturePhotoOutput` with portrait orientation lock)
     - `Vision` (`VNDetectRectanglesRequest` with confidence >= 0.7)
     - `CoreImage` (`CIPerspectiveCorrection` filter)
     - `UIGraphicsImageRenderer` (orientation normalization, portrait force-rotation, and resize to max dimension 1280px)
   - Bypasses user review and filter trays; crops the document quad and writes a single JPEG (quality 0.78) to the `Documents` directory.

### 2.2 Permissions & Hardware Constraints
- **Camera Permission**: **Mandatory**. You MUST declare `NSCameraUsageDescription` in `ios/Runner/Info.plist`. If omitted, iOS will terminate the app immediately upon attempting to present the scanner.
- **Physical Device Required**: Apple's `VNDocumentCameraViewController` is **hardware-dependent and not supported on the iOS Simulator**.
  - Calling scan methods on the iOS Simulator will fail to present the camera UI or trigger errors.
  - Development and testing of scanning workflows must take place on a physical iPhone or iPad running iOS 13.0+.

### 2.3 iOS Configuration Steps
In `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>This app requires camera access to scan documents, receipts, and identification cards.</string>
```

In `ios/Podfile`:
```ruby
platform :ios, '13.0'
```

---

## 3. Web & Desktop Platform Status

| Platform | Runtime Support | Native Engine | Error Behavior | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **Android** | Fully Supported | Google Play Services ML Kit | None (full functionality) | Production ready |
| **iOS** | Supported (Real Devices) | VisionKit / AVFoundation + Vision | None on device; unsupported on Simulator | Production ready |
| **Web** | Unsupported in 0.0.21 | Dummy stub returning user agent | Throws `UnimplementedError` | Use WebRTC or file upload |
| **macOS** | Unsupported | Default Xcode plugin stub | Throws `MissingPluginException` / `DocScanException` | Gate with platform guard |
| **Windows** | Unsupported | Default CMake plugin stub | Throws `MissingPluginException` / `DocScanException` | Gate with platform guard |
| **Linux** | Unsupported | Default CMake plugin stub | Throws `MissingPluginException` / `DocScanException` | Gate with platform guard |

### Platform Guard Pattern
```dart
import 'dart:io';
import 'package:flutter/foundation.dart';

bool get isDocumentScannerSupported {
  if (kIsWeb) return false;
  return Platform.isAndroid || Platform.isIOS;
}
```
