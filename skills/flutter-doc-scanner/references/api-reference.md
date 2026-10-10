# flutter_doc_scanner API Reference & Internal Type System

Comprehensive reference for `flutter_doc_scanner` (version `0.0.21`).

---

## 1. Top-Level Class: `FlutterDocScanner`

Library import:
```dart
import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';
```

Instantiation:
```dart
final scanner = FlutterDocScanner();
```
*(Class has an un-named default const constructor `const FlutterDocScanner()`).*

### Method Signatures

#### `getPlatformVersion()`
```dart
Future<String?> getPlatformVersion()
```
- **Returns**: Formatted platform string (e.g., `"Android 14"`, `"iOS 17.5"`, or browser user agent on Web).
- **Errors**: Does not typically throw.

#### `getScanDocuments({int page = 4})`
```dart
Future<dynamic> getScanDocuments({int page = 4})
```
- **Description**: Legacy/hybrid scanner method with diverging cross-platform return values.
- **Parameters**: `page` (int, default 4, must be `>= 1`). Throws `ArgumentError` if `page < 1`.
- **Returns**:
  - `null` if user cancelled.
  - **On Android**: `Map<String, dynamic>` containing `{'pdfUri': String, 'pageCount': int}` (handled via `REQUEST_CODE_SCAN` which routes to PDF result handler).
  - **On iOS**: `List<dynamic>` of String file paths pointing to saved PNGs in app Documents directory.
- **Throws**: `DocScanException` on scanner failure, missing activity, or platform error.
- **Recommendation**: Avoid in modern production code; prefer `getScannedDocumentAsImages` or `getScannedDocumentAsPdf`.

#### `getScannedDocumentAsImages(...)`
```dart
Future<ImageScanResult?> getScannedDocumentAsImages({
  int page = 4,
  ImageFormat imageFormat = ImageFormat.jpeg,
  double quality = 0.9,
  bool useAutomaticSinglePictureProcessing = false,
})
```
- **Description**: Launches document scanner and returns individual page image file paths or content URIs.
- **Parameters**:
  - `page`: Maximum pages to scan (`>= 1`, defaults to 4). Ignored on Android and iOS if `useAutomaticSinglePictureProcessing` is `true`.
  - `imageFormat`: `ImageFormat.jpeg` (default) or `ImageFormat.png`.
    - *Android*: ML Kit always outputs JPEG; this argument is ignored by native Android.
    - *iOS Standard*: `VNDocumentCameraViewController` always outputs PNG in native implementation; this argument is ignored.
    - *iOS AutoScan*: Always encodes JPEG at quality 0.78 regardless of this argument.
  - `quality`: Double between `0.0` and `1.0` (defaults to 0.9). Validated in Dart (`throws ArgumentError` if out of bounds). Ignored by native Android and native iOS `saveScannedImages`.
  - `useAutomaticSinglePictureProcessing`: Boolean flag (default `false`).
    - *Android*: Forces `GmsDocumentScannerOptions.SCANNER_MODE_BASE`, sets `pageLimit = 1`, and disables gallery import.
    - *iOS*: Bypasses `VNDocumentCameraViewController` and presents custom `AutoScanViewController` (AVFoundation + Vision rectangle detection + CoreImage perspective correction) for instant single-shot capture.
- **Returns**: `ImageScanResult?` or `null` if cancelled.
- **Throws**: `DocScanException` on failure.

#### `getScannedDocumentAsPdf({int page = 4})`
```dart
Future<PdfScanResult?> getScannedDocumentAsPdf({int page = 4})
```
- **Description**: Launches document scanner and returns a single compiled multi-page PDF document.
- **Parameters**: `page` (int, default 4, must be `>= 1`).
- **Returns**: `PdfScanResult?` or `null` if cancelled.
  - *Android*: Returns content URI and accurate `pageCount`.
  - *iOS*: Assembles PDF using `PDFKit`, writes to Documents directory, and returns file path. `pageCount` defaults to 0 on iOS because native iOS code only returns the file path string.
- **Throws**: `DocScanException` on failure.

#### `getScanDocumentsUri({int page = 4})`
```dart
Future<ImageScanResult?> getScanDocumentsUri({int page = 4})
```
- **Description**: Scans documents and returns Android content URIs.
- **Parameters**: `page` (int, default 4, must be `>= 1`).
- **Platform Constraint**: **Android only**. Throws `DocScanException(code: DocScanException.codeUnsupported)` immediately on iOS, Web, or desktop.
- **Returns**: `ImageScanResult?` with content URIs.

---

## 2. Models & Data Classes

### `ImageFormat`
```dart
enum ImageFormat {
  png,
  jpeg,
}
```
Declared in `flutter_doc_scanner_models.dart`. Used as parameter to `getScannedDocumentAsImages`.

### `ImageScanResult`
```dart
class ImageScanResult {
  final List<String> images;
  int get count => images.length;

  const ImageScanResult({required this.images});

  factory ImageScanResult.fromPlatformData(dynamic data);
}
```
- **Field `images`**: List of strings.
  - On iOS: POSIX file paths (e.g., `"/var/mobile/Containers/Data/Application/.../Documents/20261011-120000-0.png"`).
  - On Android: Content URIs (e.g., `"content://com.google.android.gms.provider/.../page_0.jpg"`).
- **Field `count`**: Getter returning `images.length`.
- **Parsing logic**: Accepts either `Map` containing `'images'` key (Android) or `List` of strings (iOS). Throws `FormatException` if data is unexpected type.

### `PdfScanResult`
```dart
class PdfScanResult {
  final String pdfUri;
  final int pageCount;

  const PdfScanResult({required this.pdfUri, this.pageCount = 0});

  factory PdfScanResult.fromPlatformData(dynamic data);
}
```
- **Field `pdfUri`**: String path or URI.
  - On iOS: POSIX file path (e.g., `"/var/.../Documents/20261011-120000.pdf"`).
  - On Android: Content URI (e.g., `"content://com.google.android.gms.provider/.../document.pdf"`).
- **Field `pageCount`**: Page count integer.
  - On Android: Accurately returned from `GmsDocumentScanningResult.getPdf().getPageCount()`.
  - On iOS: Defaults to `0` because iOS native returns a raw `String` path rather than a dictionary with page count.

---

## 3. Exceptions & Error Codes

### `DocScanException`
```dart
class DocScanException implements Exception {
  final String code;
  final String message;
  final dynamic details;

  const DocScanException({
    required this.code,
    required this.message,
    this.details,
  });

  static const String codeNoActivity = 'NO_ACTIVITY';
  static const String codeScanInProgress = 'SCAN_IN_PROGRESS';
  static const String codeScanFailed = 'SCAN_FAILED';
  static const String codePdfCreationError = 'PDF_CREATION_ERROR';
  static const String codeCancelled = 'CANCELLED';
  static const String codeUnsupported = 'UNSUPPORTED_PLATFORM';
}
```

### Native Error Code Mapping

| Native Error Code | Source Platform | Trigger Condition | Dart Exception Code |
| :--- | :--- | :--- | :--- |
| `NO_ACTIVITY` | Android | Scanner invoked while app is in background or activity is detached | `DocScanException.codeNoActivity` |
| `SCAN_IN_PROGRESS` | Android | Concurrent scan triggered while `pendingResult != null` | `DocScanException.codeScanInProgress` |
| `SCAN_FAILED` | Android / iOS | Hardware error, Google Play Services failure, or VisionKit fault | `DocScanException.codeScanFailed` |
| `PDF_CREATION_ERROR`| iOS | `PDFDocument.write(to:)` failed during file serialization | `DocScanException.codePdfCreationError` |
| `SCAN_SAVE_ERROR` | iOS AutoScan | Failed to save compressed JPEG to Documents directory | `DocScanException.codeScanFailed` (wrapped) |
| `SCAN_ERROR` | iOS AutoScan / VisionKit | Camera permissions denied or capture session failure | `DocScanException.codeScanFailed` (wrapped) |
| `UNSUPPORTED_PLATFORM`| Dart / iOS | `getScanDocumentsUri` called on non-Android platform | `DocScanException.codeUnsupported` |

---

## 4. Method Channel Protocol

- **Channel Name**: `"flutter_doc_scanner"`
- **Message Types**: Standard `MethodChannel` (`invokeMethod`)

### Invocation Schema

```
+------------------------------------------------------------------------------------------------+
| Method Name                     | Arguments (Map)                 | Return Payload             |
+------------------------------------------------------------------------------------------------+
| getPlatformVersion              | null                            | String                     |
| getScanDocuments                | {"page": int}                   | Android: Map (pdfUri,count)|
|                                 |                                 | iOS: List<String> (paths)  |
| getScannedDocumentAsImages      | {                               | Android: Map (images,count)|
|                                 |   "page": int,                  | iOS: List<String> (paths)  |
|                                 |   "imageFormat": String,        |                            |
|                                 |   "quality": double,            |                            |
|                                 |   "useAutomaticSinglePictureProcessing": bool |               |
|                                 | }                               |                            |
| getScannedDocumentAsPdf         | {"page": int}                   | Android: Map (pdfUri,count)|
|                                 |                                 | iOS: String (path)         |
| getScanDocumentsUri             | {"page": int}                   | Android: Map (images,count)|
|                                 |                                 | iOS: Throws in Dart        |
+------------------------------------------------------------------------------------------------+
```
